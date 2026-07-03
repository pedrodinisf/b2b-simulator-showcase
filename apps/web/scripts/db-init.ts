import { openDb, migrateDb, hasActiveDataset, applySeed } from './seed-core';

// Container startup: apply migrations on every boot, but seed only when the database is empty
// (a fresh volume). On restarts the existing data is kept — analytics, email subscribers, and any
// ingested dataset are preserved (unlike db:seed, which always clears + reseeds).
const { db, client } = openDb();
console.log('[db-init] applying migrations…');
await migrateDb(db);
if (await hasActiveDataset(db)) {
	console.log('[db-init] active dataset already present — skipping seed.');
} else {
	console.log('[db-init] empty database — seeding bundled default…');
	const summary = await applySeed(db);
	console.log(`[db-init] seeded: ${summary}.`);
}
client.close();
