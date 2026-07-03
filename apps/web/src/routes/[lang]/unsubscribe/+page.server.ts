import { eq } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';
import { unsubscribeByToken } from '$lib/server/alertSubscriptions';
import type { PageServerLoad } from './$types';

// Remove a subscriber from the law-change alerts list. Idempotent: an already
// unsubscribed (or unknown) token still lands on a friendly page. Tokens are
// looked up first in emailSubscriber (the report-driven list), then in
// alert_subscription (the per-saved-scenario alerts) — the same page/route
// serves both, since the token spaces are disjoint (both are random UUIDs).
export const load: PageServerLoad = async ({ url }) => {
	const token = (url.searchParams.get('token') ?? '').slice(0, 64);
	if (!token) return { status: 'invalid' as const };

	const [row] = await db.select().from(schema.emailSubscriber).where(eq(schema.emailSubscriber.confirmToken, token)).limit(1);
	if (row) {
		if (!row.unsubscribedAt) {
			await db.update(schema.emailSubscriber).set({ unsubscribedAt: new Date().toISOString() }).where(eq(schema.emailSubscriber.id, row.id));
		}
		return { status: 'done' as const };
	}

	const alertStatus = await unsubscribeByToken(db, token);
	return { status: alertStatus === 'done' ? ('done' as const) : ('invalid' as const) };
};
