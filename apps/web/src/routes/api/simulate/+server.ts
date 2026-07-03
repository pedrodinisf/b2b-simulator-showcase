import { json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { getActiveDataset, db, schema } from '$lib/server/db';
import { simulate, type SimParams, type Dataset, type TaxConstants } from '@b2bsim/engine';
import type { RequestHandler } from './$types';

const SENS_RATES = [40, 45, 50, 55, 60, 65];
const num = (v: unknown): number | null => (typeof v === 'number' && isFinite(v) ? v : null);
const str = (v: unknown, max = 40): string | null => (typeof v === 'string' ? v.slice(0, max) : null);

// Server-side compute: the engine runs here with the DB dataset, so the
// municipality rate table never reaches the browser. The client may send its (config-
// edited) T constants — those are public law; municipality rates always come from the DB.
// When log === true the settled simulation is logged (folds in the old /api/sim-event).
export const POST: RequestHandler = async ({ request }) => {
	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return new Response(null, { status: 400 });
	}
	const params = body.params as SimParams | undefined;
	if (!params || typeof params !== 'object') return new Response(null, { status: 400 });

	const active = await getActiveDataset();
	const dataset: Dataset =
		body.T && typeof body.T === 'object'
			? { T: body.T as TaxConstants, MUNICIPALITIES: active.MUNICIPALITIES, REGIONS: active.REGIONS }
			: active;

	let result, sensitivity;
	try {
		result = simulate(params, dataset);
		sensitivity = SENS_RATES.map((rate) => {
			const s = simulate({ ...params, hourlyRate: rate }, dataset);
			return { rate, revenue: s.revenue, A: s.scenarios.A.net, C: s.scenarios.C.net, F: s.scenarios.F.net };
		});
	} catch {
		return new Response(null, { status: 400 });
	}

	if (body.log) {
		try {
			const activeId = (await db.select({ id: schema.taxDataset.id }).from(schema.taxDataset).where(eq(schema.taxDataset.isActive, true)).limit(1))[0]?.id ?? null;
			let referrerHost: string | null = null;
			const referer = request.headers.get('referer');
			if (referer) try { referrerHost = new URL(referer).host.slice(0, 100); } catch { referrerHost = null; }
			const [ev] = await db
				.insert(schema.simulationEvent)
				.values({
					createdAt: new Date().toISOString(),
					sessionId: str(body.sessionId, 64),
					userId: null,
					lang: body.lang === 'en' ? 'en' : 'pt',
					source: str(body.source, 32) ?? 'web',
					datasetVersion: activeId,
					paramsJson: JSON.stringify(params),
					revenue: num(result.revenue),
					winner: str(result.winner, 2),
					region: str(result.region),
					municipalityCode: str(params.municipality),
					hourlyRate: num(params.hourlyRate),
					hoursPerDay: num(params.hoursPerDay),
					daysPerYear: num(params.daysPerYear),
					salary: num(params.salary),
					countryCoarse: request.headers.get('cf-ipcountry'),
					referrerHost
				})
				.returning({ id: schema.simulationEvent.id });
			const rows = Object.entries(result.scenarios).map(([k, s]) => ({ eventId: ev.id, scenario: k.slice(0, 2), net: s.net, effectiveRate: s.effective_rate }));
			await db.insert(schema.simulationResult).values(rows);
		} catch {
			/* logging is best-effort; never fail the compute */
		}
	}

	return json({ result, sensitivity });
};
