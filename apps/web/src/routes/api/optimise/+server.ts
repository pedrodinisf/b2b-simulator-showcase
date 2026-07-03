import { json } from '@sveltejs/kit';
import { getActiveDataset } from '$lib/server/db';
import { requirePro } from '$lib/server/auth/guard';
import { simulate, type SimParams, type Dataset, type TaxConstants } from '@b2bsim/engine';
import type { RequestHandler } from './$types';

// Salary optimiser (server-side): sweep monthly salary for the net-maximising value.
// Premium (Pro) feature; the launch flag grants Pro to everyone, so this is a no-op today.
export const POST: RequestHandler = async (event) => {
	await requirePro(event);
	const { request } = event;
	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return new Response(null, { status: 400 });
	}
	const params = body.params as SimParams | undefined;
	if (!params || typeof params !== 'object') return new Response(null, { status: 400 });

	const active = await getActiveDataset();
	const dataset: Dataset = body.T && typeof body.T === 'object' ? { T: body.T as TaxConstants, MUNICIPALITIES: active.MUNICIPALITIES, REGIONS: active.REGIONS } : active;

	const rev = params.hourlyRate * params.hoursPerDay * params.daysPerYear;
	const maxSal = Math.max(920, Math.floor(rev / 14));
	let best = 920;
	let bestNet = -Infinity;
	for (let s = 920; s <= maxSal; s += 50) {
		const net = simulate({ ...params, salary: s }, dataset).scenarios.H.net;
		if (net > bestNet) { bestNet = net; best = s; }
	}
	for (let s = Math.max(920, best - 50); s <= best + 50; s += 5) {
		const net = simulate({ ...params, salary: s }, dataset).scenarios.H.net;
		if (net > bestNet) { bestNet = net; best = s; }
	}
	return json({ salary: best, net: bestNet });
};
