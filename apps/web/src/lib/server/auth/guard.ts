import { error, type RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { entitlement } from '$lib/server/db/schema';
import { hasProAccess, isFreeForAll, type EntitlementRow } from './entitlement';

// Route guard: returns void when allowed, throws 402 otherwise. When the launch
// flag is on it returns immediately without touching locals or the DB, so it is a
// true no-op (works even before auth ships). The user id is read defensively so
// this compiles before App.Locals gains `user` in the auth increment.
export async function requirePro(event: RequestEvent): Promise<void> {
	if (isFreeForAll(env.PRO_LAUNCH_FREE_FOR_ALL)) return;

	const user = (event.locals as { user?: { id: string } | null }).user ?? null;
	let row: EntitlementRow | null = null;
	if (user) {
		const [r] = await db
			.select({ status: entitlement.status, currentPeriodEnd: entitlement.currentPeriodEnd })
			.from(entitlement)
			.where(and(eq(entitlement.userId, user.id), eq(entitlement.status, 'active')))
			.limit(1);
		row = r ?? null;
	}

	if (!hasProAccess({ flagFreeForAll: false, user, entitlement: row, now: new Date() })) {
		throw error(402, 'pro_required');
	}
}
