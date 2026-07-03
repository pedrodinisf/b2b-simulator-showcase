import { getConstants, getRegionsMap, getMunicipalityNames } from '$lib/server/db';
import type { LayoutServerLoad } from './$types';

// Public, non-sensitive data for the client: the tax constants (public law — needed by the
// Config tab + readouts), region labels/VAT, and municipality NAMES (for the picker).
// The per-municipality rate table is NOT sent; it stays server-side (see /api/simulate).
// `user` is the caller's own auth state (email only) so the shell can show Account/Sign in.
export const load: LayoutServerLoad = async ({ locals }) => ({
	constants: await getConstants(),
	regions: await getRegionsMap(),
	municipalities: await getMunicipalityNames(),
	user: locals.user ? { email: locals.user.email } : null
});
