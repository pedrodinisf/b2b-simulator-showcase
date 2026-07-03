import { defineConfig } from 'drizzle-kit';

// Used by `drizzle-kit generate` to emit SQLite migrations from the schema.
// Migrations are applied programmatically (drizzle-orm/libsql/migrator) in scripts/seed.ts.
export default defineConfig({
	dialect: 'sqlite',
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle'
});
