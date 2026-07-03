import { json } from '@sveltejs/kit';
import { getActiveDataset } from '$lib/server/db';
import { requirePro } from '$lib/server/auth/guard';
import { simulate, projectFiveYears, type SimParams, type Dataset, type TaxConstants } from '@b2bsim/engine';
import type { RequestHandler } from './$types';

const LDA_SCENARIOS = ['E', 'F', 'G', 'H'] as const;

// Multi-year (Year 1-5) projection. Premium (Pro) feature; the launch flag grants
// Pro to everyone today. Follows the /api/simulate pattern: the
// municipality rate table stays server-side, the client sends only params + the
// optional public T constants.
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
	const ldaScenario = LDA_SCENARIOS.includes(body.ldaScenario as (typeof LDA_SCENARIOS)[number])
		? (body.ldaScenario as (typeof LDA_SCENARIOS)[number])
		: 'H';

	const active = await getActiveDataset();
	const dataset: Dataset =
		body.T && typeof body.T === 'object'
			? { T: body.T as TaxConstants, MUNICIPALITIES: active.MUNICIPALITIES, REGIONS: active.REGIONS }
			: active;

	let projection;
	try {
		const result = simulate(params, dataset);
		projection = projectFiveYears(result, ldaScenario);
	} catch {
		return new Response(null, { status: 400 });
	}

	return json({ projection });
};
