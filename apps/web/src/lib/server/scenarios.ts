import { and, desc, eq } from 'drizzle-orm';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import type { SimParams } from '@b2bsim/engine';
import * as schema from './db/schema';
import { clampParams } from '../params';
import { activeAlertScenarioIds } from './alertSubscriptions';

// Saved-scenario CRUD, factored out of the /api/scenarios route so it can be
// unit-tested against a real (in-memory) DB without SvelteKit's $-aliases. `db`
// is passed in rather than imported as a singleton for the same reason.
export type ScenarioDb = LibSQLDatabase<typeof schema>;

export interface SavedScenarioDTO {
	id: number;
	name: string;
	lang: string;
	params: SimParams;
	createdAt: string;
	updatedAt: string;
	alertSubscribed: boolean;
}

const NAME_MAX = 120;
const toDTO = (r: typeof schema.savedScenario.$inferSelect, alertSubscribed: boolean): SavedScenarioDTO => ({
	id: r.id,
	name: r.name,
	lang: r.lang,
	params: JSON.parse(r.paramsJson),
	createdAt: r.createdAt,
	updatedAt: r.updatedAt,
	alertSubscribed
});

// Own-only: every query is scoped to userId so a foreign or missing id looks
// identical to a non-existent one (no leak of other users' rows or existence).

export async function listScenarios(db: ScenarioDb, userId: string): Promise<SavedScenarioDTO[]> {
	const rows = await db
		.select()
		.from(schema.savedScenario)
		.where(eq(schema.savedScenario.userId, userId))
		.orderBy(desc(schema.savedScenario.createdAt));
	const subscribed = await activeAlertScenarioIds(db, userId);
	return rows.map((r) => toDTO(r, subscribed.has(r.id)));
}

export async function createScenario(
	db: ScenarioDb,
	opts: { userId: string; name: string; lang: string; params: unknown }
): Promise<SavedScenarioDTO | null> {
	const name = opts.name.trim().slice(0, NAME_MAX);
	if (!name) return null;
	const lang = opts.lang === 'en' ? 'en' : 'pt';
	const params = clampParams(opts.params);
	const now = new Date().toISOString();

	const [row] = await db
		.insert(schema.savedScenario)
		.values({ userId: opts.userId, name, lang, paramsJson: JSON.stringify(params), createdAt: now, updatedAt: now })
		.returning();

	return toDTO(row, false);
}

export async function deleteScenario(db: ScenarioDb, opts: { id: number; userId: string }): Promise<boolean> {
	const deleted = await db
		.delete(schema.savedScenario)
		.where(and(eq(schema.savedScenario.id, opts.id), eq(schema.savedScenario.userId, opts.userId)))
		.returning({ id: schema.savedScenario.id });
	return deleted.length > 0;
}
