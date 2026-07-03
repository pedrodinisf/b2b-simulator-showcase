import { eq } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';
import type { PageServerLoad } from './$types';

// Double opt-in confirmation for the law-change alerts list (the report email
// itself is transactional and not gated). The token backs both this and unsubscribe.
export const load: PageServerLoad = async ({ url }) => {
	const token = (url.searchParams.get('token') ?? '').slice(0, 64);
	if (!token) return { status: 'invalid' as const };

	const [row] = await db.select().from(schema.emailSubscriber).where(eq(schema.emailSubscriber.confirmToken, token)).limit(1);
	if (!row) return { status: 'invalid' as const };
	if (row.unsubscribedAt) return { status: 'unsubscribed' as const };

	if (!row.confirmedAt) {
		await db.update(schema.emailSubscriber).set({ confirmedAt: new Date().toISOString() }).where(eq(schema.emailSubscriber.id, row.id));
	}
	return { status: 'confirmed' as const };
};
