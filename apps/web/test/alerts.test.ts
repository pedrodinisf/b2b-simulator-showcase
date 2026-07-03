import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { fileURLToPath } from 'node:url';
import { eq } from 'drizzle-orm';
import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { simulate, DEFAULT_DATASET, DEFAULT_PARAMS, type Dataset, type SimResult } from '@b2bsim/engine';
import type { EmailSender, EmailMessage } from '../src/lib/server/email/index.ts';
import * as schema from '../src/lib/server/db/schema.ts';
import { createScenario } from '../src/lib/server/scenarios.ts';
import { subscribeToAlerts, unsubscribeFromAlerts, unsubscribeByToken, activeAlertScenarioIds } from '../src/lib/server/alertSubscriptions.ts';
import { diffImpact, runAlertsForDataset } from '../src/lib/server/alerts.ts';

const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url));

let client: Client;
let db: LibSQLDatabase<typeof schema>;

class FakeSender implements EmailSender {
	readonly name = 'fake';
	sent: EmailMessage[] = [];
	async send(msg: EmailMessage): Promise<void> {
		this.sent.push(msg);
	}
}

beforeAll(async () => {
	client = createClient({ url: ':memory:' });
	db = drizzle(client, { schema });
	await migrate(db, { migrationsFolder });
});

afterAll(() => client.close());

async function makeUser(id: string, email: string) {
	const now = new Date();
	await db.insert(schema.user).values({ id, name: id, email, emailVerified: true, createdAt: now, updatedAt: now });
}

async function subscriptionRow(savedScenarioId: number) {
	const [row] = await db.select().from(schema.alertSubscription).where(eq(schema.alertSubscription.savedScenarioId, savedScenarioId)).limit(1);
	return row;
}

describe('diffImpact (pure)', () => {
	function resultWith(winner: string, net: number): SimResult {
		return {
			revenue: 88000,
			params: DEFAULT_PARAMS,
			effectiveDerrama: 0,
			lisbonRebatePct: 0,
			region: 'continente',
			derramaThreshold: 0,
			muniName: 'x',
			winner,
			scenarios: {
				[winner]: {
					name: winner, desc: '', gross: 88000, net, net_monthly: net / 12,
					total_burden: 0, effective_rate: 0, tax_ss: 0, business_expenses: 0, ss_total: 0, irs_total: 0, lisbon_rebate: 0
				}
			}
		};
	}

	it('unchanged winner + unchanged net is not material', () => {
		expect(diffImpact(resultWith('A', 70000), resultWith('A', 70000)).changed).toBe(false);
	});

	it('unchanged winner + <1% net delta is not material', () => {
		expect(diffImpact(resultWith('A', 70000), resultWith('A', 70200)).changed).toBe(false); // ~0.29%
	});

	it('unchanged winner + >=1% net delta is material', () => {
		const r = diffImpact(resultWith('A', 70000), resultWith('A', 68000)); // ~2.9%
		expect(r.changed).toBe(true);
		expect(r.deltaAbs).toBeCloseTo(-2000);
	});

	it('a winner change is always material, even with a tiny net delta', () => {
		const old = resultWith('A', 70000);
		const changed: SimResult = { ...old, winner: 'B', scenarios: { ...old.scenarios, B: { ...old.scenarios.A, net: 70001 } } };
		const r = diffImpact(old, changed);
		expect(r.changed).toBe(true);
		expect(r.oldWinner).toBe('A');
		expect(r.newWinner).toBe('B');
	});
});

describe('alertSubscriptions (own-only CRUD)', () => {
	let scenarioId: number;

	beforeAll(async () => {
		await makeUser('alert-user-a', 'a@example.com');
		await makeUser('alert-user-b', 'b@example.com');
		const s = await createScenario(db, { userId: 'alert-user-a', name: 'My scenario', lang: 'en', params: {} });
		scenarioId = s!.id;
	});

	it('rejects subscribing to a scenario the caller does not own', async () => {
		const sub = await subscribeToAlerts(db, { userId: 'alert-user-b', savedScenarioId: scenarioId, email: 'b@example.com' });
		expect(sub).toBeNull();
	});

	it('subscribes the owner and auto-confirms (no separate confirm step)', async () => {
		const sub = await subscribeToAlerts(db, { userId: 'alert-user-a', savedScenarioId: scenarioId, email: 'a@example.com' });
		expect(sub).not.toBeNull();
		const row = await subscriptionRow(scenarioId);
		expect(row.confirmedAt).not.toBeNull();
		expect(row.confirmToken).toBeTruthy();
		expect((await activeAlertScenarioIds(db, 'alert-user-a')).has(scenarioId)).toBe(true);
	});

	it('resubscribing does not duplicate the row (unique per saved scenario)', async () => {
		await subscribeToAlerts(db, { userId: 'alert-user-a', savedScenarioId: scenarioId, email: 'a@example.com' });
		const rows = await db.select().from(schema.alertSubscription).where(eq(schema.alertSubscription.savedScenarioId, scenarioId));
		expect(rows.length).toBe(1);
	});

	it('IDOR: another user cannot unsubscribe a scenario they do not own', async () => {
		const ok = await unsubscribeFromAlerts(db, { userId: 'alert-user-b', savedScenarioId: scenarioId });
		expect(ok).toBe(false);
		expect((await activeAlertScenarioIds(db, 'alert-user-a')).has(scenarioId)).toBe(true); // still subscribed
	});

	it('the owner can unsubscribe, and resubscribe clears it again (same token)', async () => {
		const before = await subscriptionRow(scenarioId);
		expect(await unsubscribeFromAlerts(db, { userId: 'alert-user-a', savedScenarioId: scenarioId })).toBe(true);
		expect((await activeAlertScenarioIds(db, 'alert-user-a')).has(scenarioId)).toBe(false);

		await subscribeToAlerts(db, { userId: 'alert-user-a', savedScenarioId: scenarioId, email: 'a@example.com' });
		const after = await subscriptionRow(scenarioId);
		expect((await activeAlertScenarioIds(db, 'alert-user-a')).has(scenarioId)).toBe(true);
		expect(after.confirmToken).toBe(before.confirmToken); // stable across resubscribe, so old unsubscribe links keep working
	});

	it('unsubscribeByToken is idempotent and rejects unknown tokens', async () => {
		const row = await subscriptionRow(scenarioId);
		expect(await unsubscribeByToken(db, row.confirmToken)).toBe('done');
		expect(await unsubscribeByToken(db, row.confirmToken)).toBe('done'); // idempotent
		expect(await unsubscribeByToken(db, 'not-a-real-token')).toBe('invalid');
	});
});

describe('runAlertsForDataset', () => {
	const oldDataset: Dataset = DEFAULT_DATASET;
	// A materially different dataset: change the mainland regional tax factor, which
	// shifts the IRS burden (and so the net) across scenarios.
	const newDataset: Dataset = structuredClone(DEFAULT_DATASET);
	newDataset.T.regions.continente.irs = 0.5;

	// Each test's fixtures must be isolated from every other test's (and from the
	// earlier alertSubscriptions describe block's) leftover rows in the shared
	// in-memory DB, since runAlertsForDataset queries ALL active subscriptions.
	beforeEach(async () => {
		await db.delete(schema.alertSubscription);
	});

	it('sanity: the tweaked dataset actually changes the baseline params result materially', () => {
		const oldResult = simulate(DEFAULT_PARAMS, oldDataset);
		const newResult = simulate(DEFAULT_PARAMS, newDataset);
		expect(diffImpact(oldResult, newResult).changed).toBe(true);
	});

	it('emails a confirmed+active subscriber when the impact is material, and marks lastNotifiedDatasetId', async () => {
		await makeUser('run-user-a', 'run-a@example.com');
		const s = await createScenario(db, { userId: 'run-user-a', name: 'Run scenario', lang: 'en', params: {} });
		await subscribeToAlerts(db, { userId: 'run-user-a', savedScenarioId: s!.id, email: 'run-a@example.com' });

		const sender = new FakeSender();
		const summary = await runAlertsForDataset(db, { oldDataset, newDataset, newDatasetId: 42, sender, baseUrl: 'https://example.test', maxEmails: 10 });

		expect(summary.notified).toBe(1);
		expect(sender.sent.length).toBe(1);
		expect(sender.sent[0].to).toBe('run-a@example.com');
		expect(sender.sent[0].html).toContain('example.test/en/unsubscribe');

		const row = await subscriptionRow(s!.id);
		expect(row.lastNotifiedDatasetId).toBe(42);
	});

	it('does not email an unsubscribed subscriber', async () => {
		await makeUser('run-user-b', 'run-b@example.com');
		const s = await createScenario(db, { userId: 'run-user-b', name: 'Unsub scenario', lang: 'en', params: {} });
		await subscribeToAlerts(db, { userId: 'run-user-b', savedScenarioId: s!.id, email: 'run-b@example.com' });
		await unsubscribeFromAlerts(db, { userId: 'run-user-b', savedScenarioId: s!.id });

		const sender = new FakeSender();
		await runAlertsForDataset(db, { oldDataset, newDataset, newDatasetId: 43, sender, baseUrl: 'https://example.test', maxEmails: 10 });

		expect(sender.sent.find((m) => m.to === 'run-b@example.com')).toBeUndefined();
	});

	it('marks an unchanged scenario as evaluated without sending an email', async () => {
		await makeUser('run-user-c', 'run-c@example.com');
		const s = await createScenario(db, { userId: 'run-user-c', name: 'Unchanged scenario', lang: 'en', params: {} });
		await subscribeToAlerts(db, { userId: 'run-user-c', savedScenarioId: s!.id, email: 'run-c@example.com' });

		const sender = new FakeSender();
		const identicalDataset: Dataset = structuredClone(DEFAULT_DATASET);
		const summary = await runAlertsForDataset(db, { oldDataset, newDataset: identicalDataset, newDatasetId: 44, sender, baseUrl: 'https://example.test', maxEmails: 10 });

		expect(summary.unchanged).toBe(1);
		expect(sender.sent.find((m) => m.to === 'run-c@example.com')).toBeUndefined();
		const row = await subscriptionRow(s!.id);
		expect(row.lastNotifiedDatasetId).toBe(44);
	});

	it('is idempotent per dataset version: re-running the same activation does not re-evaluate already-processed rows', async () => {
		await makeUser('run-user-d', 'run-d@example.com');
		const s = await createScenario(db, { userId: 'run-user-d', name: 'Idempotency scenario', lang: 'en', params: {} });
		await subscribeToAlerts(db, { userId: 'run-user-d', savedScenarioId: s!.id, email: 'run-d@example.com' });

		const sender = new FakeSender();
		await runAlertsForDataset(db, { oldDataset, newDataset, newDatasetId: 45, sender, baseUrl: 'https://example.test', maxEmails: 10 });
		expect(sender.sent.filter((m) => m.to === 'run-d@example.com').length).toBe(1);

		const secondSummary = await runAlertsForDataset(db, { oldDataset, newDataset, newDatasetId: 45, sender, baseUrl: 'https://example.test', maxEmails: 10 });
		// this row was already processed for dataset 45, so the second run does not touch it again
		expect(sender.sent.filter((m) => m.to === 'run-d@example.com').length).toBe(1);
		expect(secondSummary.notified + secondSummary.unchanged).toBe(0);
	});

	it('respects a per-run send cap and leaves capped rows unmarked for retry', async () => {
		await makeUser('run-user-e', 'run-e@example.com');
		await makeUser('run-user-f', 'run-f@example.com');
		const s1 = await createScenario(db, { userId: 'run-user-e', name: 'Cap scenario 1', lang: 'en', params: {} });
		const s2 = await createScenario(db, { userId: 'run-user-f', name: 'Cap scenario 2', lang: 'en', params: {} });
		await subscribeToAlerts(db, { userId: 'run-user-e', savedScenarioId: s1!.id, email: 'run-e@example.com' });
		await subscribeToAlerts(db, { userId: 'run-user-f', savedScenarioId: s2!.id, email: 'run-f@example.com' });

		const sender = new FakeSender();
		const summary = await runAlertsForDataset(db, { oldDataset, newDataset, newDatasetId: 46, sender, baseUrl: 'https://example.test', maxEmails: 1 });

		expect(summary.notified).toBe(1);
		expect(summary.skippedCap).toBe(1);
		expect(sender.sent.length).toBe(1);

		const row1 = await subscriptionRow(s1!.id);
		const row2 = await subscriptionRow(s2!.id);
		const notifiedRow = [row1, row2].find((r) => r.lastNotifiedDatasetId === 46);
		const skippedRow = [row1, row2].find((r) => r.lastNotifiedDatasetId !== 46);
		expect(notifiedRow).toBeDefined();
		expect(skippedRow).toBeDefined();
		expect(skippedRow!.lastNotifiedDatasetId).not.toBe(46); // left behind, will retry next run
	});
});
