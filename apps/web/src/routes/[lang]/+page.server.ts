import { getActiveDataset } from '$lib/server/db';
import { simulate, DEFAULT_PARAMS } from '@b2bsim/engine';
import type { PageServerLoad } from './$types';

const SENS_RATES = [40, 45, 50, 55, 60, 65];

// Server-computed default result for the first paint (SSR). The client recomputes via
// /api/simulate when inputs change. Computing here keeps the dataset on the server.
export const load: PageServerLoad = async () => {
	const ds = await getActiveDataset();
	const result = simulate(DEFAULT_PARAMS, ds);
	const sensitivity = SENS_RATES.map((rate) => {
		const s = simulate({ ...DEFAULT_PARAMS, hourlyRate: rate }, ds);
		return { rate, revenue: s.revenue, A: s.scenarios.A.net, C: s.scenarios.C.net, F: s.scenarios.F.net };
	});
	return { result, sensitivity };
};
