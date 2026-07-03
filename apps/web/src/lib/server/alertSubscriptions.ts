import { and, eq, isNull } from 'drizzle-orm';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import * as schema from './db/schema';

// Alert-subscription CRUD, factored out for the same testability reason as
// scenarios.ts: `db` is injected rather than imported as a singleton.
export type AlertDb = LibSQLDatabase<typeof schema>;

// The subscriber's email is already verified (they are signed in via Better Auth
// magic-link), so there is no separate email-confirmation step — confirmedAt is
// set immediately. confirmToken still backs the unsubscribe link (reused from
// the emailSubscriber flow) and stays stable across resubscribe cycles.

// Own-only: verifies the saved scenario belongs to `userId` before subscribing.
// Returns null if the scenario doesn't exist or isn't owned by this user.
export async function subscribeToAlerts(
	db: AlertDb,
	opts: { userId: string; savedScenarioId: number; email: string }
): Promise<{ id: number } | null> {
	const [scenario] = await db
		.select({ id: schema.savedScenario.id })
		.from(schema.savedScenario)
		.where(and(eq(schema.savedScenario.id, opts.savedScenarioId), eq(schema.savedScenario.userId, opts.userId)))
		.limit(1);
	if (!scenario) return null;

	// savedScenarioId is unique per row and ownership was already verified above,
	// so this second `userId` filter is currently redundant — kept as defense in
	// depth in case saved_scenario ownership ever becomes transferable.
	const [existing] = await db
		.select({ id: schema.alertSubscription.id })
		.from(schema.alertSubscription)
		.where(and(eq(schema.alertSubscription.savedScenarioId, opts.savedScenarioId), eq(schema.alertSubscription.userId, opts.userId)))
		.limit(1);

	if (existing) {
		await db
			.update(schema.alertSubscription)
			.set({ unsubscribedAt: null, confirmedAt: new Date().toISOString(), email: opts.email })
			.where(eq(schema.alertSubscription.id, existing.id));
		return { id: existing.id };
	}

	const now = new Date().toISOString();
	const [row] = await db
		.insert(schema.alertSubscription)
		.values({
			userId: opts.userId,
			savedScenarioId: opts.savedScenarioId,
			email: opts.email,
			confirmToken: crypto.randomUUID(),
			confirmedAt: now,
			unsubscribedAt: null,
			lastNotifiedDatasetId: null,
			createdAt: now
		})
		.returning({ id: schema.alertSubscription.id });
	return { id: row.id };
}

// Own-only: only unsubscribes a subscription owned by `userId`.
export async function unsubscribeFromAlerts(db: AlertDb, opts: { userId: string; savedScenarioId: number }): Promise<boolean> {
	const updated = await db
		.update(schema.alertSubscription)
		.set({ unsubscribedAt: new Date().toISOString() })
		.where(and(eq(schema.alertSubscription.savedScenarioId, opts.savedScenarioId), eq(schema.alertSubscription.userId, opts.userId)))
		.returning({ id: schema.alertSubscription.id });
	return updated.length > 0;
}

// Token-gated (no auth) — for the reused /[lang]/unsubscribe page, same as
// emailSubscriber. Idempotent.
export async function unsubscribeByToken(db: AlertDb, token: string): Promise<'done' | 'invalid'> {
	const [row] = await db.select({ id: schema.alertSubscription.id }).from(schema.alertSubscription).where(eq(schema.alertSubscription.confirmToken, token)).limit(1);
	if (!row) return 'invalid';
	await db.update(schema.alertSubscription).set({ unsubscribedAt: new Date().toISOString() }).where(eq(schema.alertSubscription.id, row.id));
	return 'done';
}

// Which of the caller's saved scenarios have an active (confirmed, not
// unsubscribed) alert subscription — used to render toggle state in the list.
export async function activeAlertScenarioIds(db: AlertDb, userId: string): Promise<Set<number>> {
	const rows = await db
		.select({ savedScenarioId: schema.alertSubscription.savedScenarioId })
		.from(schema.alertSubscription)
		.where(and(eq(schema.alertSubscription.userId, userId), isNull(schema.alertSubscription.unsubscribedAt)));
	return new Set(rows.map((r) => r.savedScenarioId));
}
