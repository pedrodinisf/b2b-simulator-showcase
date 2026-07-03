import { getContentBlock, getGlossary } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => ({
	concepts: JSON.parse(await getContentBlock('concepts', params.lang)) as {
		id: string;
		icon: string;
		title: string;
		content: string;
	}[],
	glossary: await getGlossary(params.lang)
});
