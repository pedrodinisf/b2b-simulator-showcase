import { getActiveDataset } from '$lib/server/db';
import { simulate, DEFAULT_PARAMS } from '@b2bsim/engine';
import type { PageServerLoad } from './$types';

// Default result for SSR of the Resumo page (used when landed directly; otherwise the
// client store carries the user's current result across from the calculator).
export const load: PageServerLoad = async () => {
	const result = simulate(DEFAULT_PARAMS, await getActiveDataset());
	return { result };
};
