import { getContentBlock } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => ({
	setup: await getContentBlock('setup', params.lang),
	obligations: await getContentBlock('obligations', params.lang)
});
