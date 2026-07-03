import { getContentBlock } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => ({ html: await getContentBlock('risks', params.lang) });
