import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { fileURLToPath } from 'node:url';
import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { DEFAULT_PARAMS } from '@b2bsim/engine';
import * as schema from '../src/lib/server/db/schema.ts';
import { listScenarios, createScenario, deleteScenario } from '../src/lib/server/scenarios.ts';

const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url));

let client: Client;
let db: LibSQLDatabase<typeof schema>;

beforeAll(async () => {
	client = createClient({ url: ':memory:' });
	db = drizzle(client, { schema });
	await migrate(db, { migrationsFolder });
	const now = new Date();
	await db.insert(schema.user).values([
		{ id: 'user-a', name: 'A', email: 'a@example.com', emailVerified: true, createdAt: now, updatedAt: now },
		{ id: 'user-b', name: 'B', email: 'b@example.com', emailVerified: true, createdAt: now, updatedAt: now }
	]);
});

afterAll(() => client.close());

describe('saved scenarios (own-only CRUD)', () => {
	it('creates a scenario with the name trimmed and params clamped via clampParams', async () => {
		const created = await createScenario(db, {
			userId: 'user-a',
			name: '  My scenario  ',
			lang: 'en',
			params: { hourlyRate: 99999, salary: -5 }
		});
		expect(created).not.toBeNull();
		expect(created!.name).toBe('My scenario');
		expect(created!.params.hourlyRate).toBe(200); // clamped to max
		expect(created!.params.salary).toBe(0); // clamped to min
		expect(created!.params.daysPerYear).toBe(DEFAULT_PARAMS.daysPerYear); // untouched → default
	});

	it('rejects a blank name', async () => {
		const created = await createScenario(db, { userId: 'user-a', name: '   ', lang: 'pt', params: {} });
		expect(created).toBeNull();
	});

	it('lists only the caller\'s own scenarios', async () => {
		await createScenario(db, { userId: 'user-b', name: 'B scenario', lang: 'pt', params: {} });
		const aList = await listScenarios(db, 'user-a');
		const bList = await listScenarios(db, 'user-b');
		expect(aList.some((s) => s.name === 'B scenario')).toBe(false);
		expect(bList.some((s) => s.name === 'B scenario')).toBe(true);
	});

	it('IDOR: another user cannot delete a scenario they do not own', async () => {
		const scenario = await createScenario(db, { userId: 'user-a', name: 'Private', lang: 'pt', params: {} });
		const deletedByOther = await deleteScenario(db, { id: scenario!.id, userId: 'user-b' });
		expect(deletedByOther).toBe(false);

		const stillThere = await listScenarios(db, 'user-a');
		expect(stillThere.some((s) => s.id === scenario!.id)).toBe(true);
	});

	it('the owner can delete their own scenario', async () => {
		const scenario = await createScenario(db, { userId: 'user-a', name: 'ToDelete', lang: 'pt', params: {} });
		const ok = await deleteScenario(db, { id: scenario!.id, userId: 'user-a' });
		expect(ok).toBe(true);

		const remaining = await listScenarios(db, 'user-a');
		expect(remaining.some((s) => s.id === scenario!.id)).toBe(false);
	});

	it('deleting a non-existent id returns false', async () => {
		expect(await deleteScenario(db, { id: 999999, userId: 'user-a' })).toBe(false);
	});
});
