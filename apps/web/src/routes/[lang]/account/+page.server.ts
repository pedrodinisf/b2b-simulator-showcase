import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Account is auth-only: bounce anonymous visitors to the login page for this locale.
export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) {
		redirect(302, `/${params.lang}/login`);
	}
	return { email: locals.user.email };
};
