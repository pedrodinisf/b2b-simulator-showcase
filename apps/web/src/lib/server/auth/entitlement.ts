// The premium ('pro') entitlement decision — pure logic, no SvelteKit/DB imports
// so it is unit-testable in isolation. The SvelteKit route guard lives in
// ./guard.ts. At launch a feature flag grants Pro to everyone (incl. anonymous);
// when a real entitlement check is wired in, the flag is switched off and the
// guard reads the `entitlement` table instead. Call sites never change.

export interface EntitlementRow {
	status: string;
	currentPeriodEnd: string | null;
}

// The flag short-circuits to `true` (Pro for all). Otherwise a user needs an
// active entitlement that has not passed its currentPeriodEnd.
export function hasProAccess(opts: {
	flagFreeForAll: boolean;
	user: { id: string } | null;
	entitlement: EntitlementRow | null;
	now: Date;
}): boolean {
	if (opts.flagFreeForAll) return true;
	if (!opts.user || !opts.entitlement) return false;
	if (opts.entitlement.status !== 'active') return false;
	const end = opts.entitlement.currentPeriodEnd;
	return !end || new Date(end) > opts.now;
}

// Fail OPEN to free: Pro is granted unless the flag is explicitly 'false'. This
// mirrors current production (the optimiser/solver are open to everyone today),
// so a missing/mistyped env var can never accidentally start blocking users.
// Setting PRO_LAUNCH_FREE_FOR_ALL=false switches on real entitlement checks.
export function isFreeForAll(flagValue: string | undefined): boolean {
	return flagValue !== 'false';
}
