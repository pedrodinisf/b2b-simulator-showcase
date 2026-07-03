import { error } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';
import type { Lang } from '@b2bsim/content';

const LOCALES = ['pt', 'en'] as const;

export const load: LayoutLoad = ({ params, data }) => {
	if (!LOCALES.includes(params.lang as Lang)) {
		error(404, 'Unknown locale');
	}
	return { ...data, lang: params.lang as Lang };
};
