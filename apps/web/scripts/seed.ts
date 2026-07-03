import { openDb, migrateDb, applySeed } from './seed-core';

// Full (re)seed for local dev: migrate + always clear-and-reseed the data/content tables.
const { db, client } = openDb();
console.log('Applying migrations…');
await migrateDb(db);
console.log('Re-seeding data/content tables…');
const summary = await applySeed(db);
console.log(`Seeded: ${summary}.`);
client.close();
