import { getContentBlock } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => ({
	sections: JSON.parse(await getContentBlock('negotiation', params.lang)) as {
		section: string;
		priority: string;
		desc: string;
		items: { strong: string; text: string; source?: string }[];
	}[]
});
