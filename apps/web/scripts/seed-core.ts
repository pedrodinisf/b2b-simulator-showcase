import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { createClient, type Client } from '@libsql/client';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { eq } from 'drizzle-orm';
import * as schema from '../src/lib/server/db/schema';
import { serializeT } from '../src/lib/server/db/dataset';
import { DEFAULT_DATASET } from '@b2bsim/engine';
import {
	GLOSSARY_PT, GLOSSARY_EN, CONCEPTS_PT, CONCEPTS_EN, NEGOTIATION_PT, NEGOTIATION_EN,
	INTL_CONTENT_PT, INTL_CONTENT_EN, RISKS_CONTENT_PT, RISKS_CONTENT_EN,
	SETUP_CONTENT_PT, SETUP_CONTENT_EN, OBLIGATIONS_CONTENT_PT, OBLIGATIONS_CONTENT_EN,
	ENGLOBAMENTO_MATH, ENGLOBAMENTO_MATH_EN
} from '@b2bsim/content';

export type SeedDb = LibSQLDatabase<typeof schema>;

// Open a libsql-backed drizzle db from DATABASE_URL (default local.db). Caller closes `client`.
export function openDb(): { db: SeedDb; client: Client } {
	const client = createClient({ url: process.env.DATABASE_URL || 'file:local.db' });
	return { db: drizzle(client, { schema }), client };
}

export async function migrateDb(db: SeedDb): Promise<void> {
	await migrate(db, { migrationsFolder: './drizzle' });
}

export async function hasActiveDataset(db: SeedDb): Promise<boolean> {
	const rows = await db.select({ id: schema.taxDataset.id }).from(schema.taxDataset).where(eq(schema.taxDataset.isActive, true)).limit(1);
	return rows.length > 0;
}

// Clear + (re)insert the data/content tables from the bundled default dataset. Analytics and
// email_subscriber rows are left untouched. Returns a short summary string.
export async function applySeed(db: SeedDb): Promise<string> {
	await db.delete(schema.municipalities);
	await db.delete(schema.taxDataset);
	await db.delete(schema.regions);
	await db.delete(schema.glossary);
	await db.delete(schema.contentBlock);

	const now = new Date().toISOString();
	const [ds] = await db
		.insert(schema.taxDataset)
		.values({
			year: 2026,
			source: 'Illustrative sample dataset',
			effectiveFrom: '2026-01-01',
			checksum: null,
			payloadJson: serializeT(DEFAULT_DATASET.T),
			isActive: true,
			createdAt: now
		})
		.returning({ id: schema.taxDataset.id });
	const datasetId = ds.id;

	const muniRows = DEFAULT_DATASET.MUNICIPALITIES.map((m) => ({
		datasetId,
		code: m.code, name: m.name, district: m.district, region: m.region,
		derramaRate: m.derramaRate, derramaReducedRate: m.derramaReducedRate,
		derramaThreshold: m.derramaThreshold, participacaoDevolution: m.participacaoDevolution,
		src: m.src, year: m.year
	}));
	for (let i = 0; i < muniRows.length; i += 100) await db.insert(schema.municipalities).values(muniRows.slice(i, i + 100));

	await db.insert(schema.regions).values(
		Object.entries(DEFAULT_DATASET.REGIONS).map(([code, r]) => ({ code, labelPt: r.label_pt, labelEn: r.label_en, ivaJson: JSON.stringify(r.iva) }))
	);

	const enGloss = Object.fromEntries(GLOSSARY_EN.map((g) => [g.id, g]));
	await db.insert(schema.glossary).values(
		GLOSSARY_PT.map((g) => ({ id: g.id, termPt: g.term, termEn: enGloss[g.id]?.term ?? g.term, defPt: g.def, defEn: enGloss[g.id]?.def ?? g.def }))
	);

	const blocks: [string, string, string][] = [
		['concepts', JSON.stringify(CONCEPTS_PT), JSON.stringify(CONCEPTS_EN)],
		['negotiation', JSON.stringify(NEGOTIATION_PT), JSON.stringify(NEGOTIATION_EN)],
		['intl', INTL_CONTENT_PT, INTL_CONTENT_EN],
		['risks', RISKS_CONTENT_PT, RISKS_CONTENT_EN],
		['setup', SETUP_CONTENT_PT, SETUP_CONTENT_EN],
		['obligations', OBLIGATIONS_CONTENT_PT, OBLIGATIONS_CONTENT_EN],
		['englobamento', ENGLOBAMENTO_MATH, ENGLOBAMENTO_MATH_EN]
	];
	const blockRows = blocks.flatMap(([name, pt, en]) => [
		{ name, lang: 'pt', payloadJson: pt },
		{ name, lang: 'en', payloadJson: en }
	]);
	await db.insert(schema.contentBlock).values(blockRows);

	return `dataset #${datasetId}, ${muniRows.length} municipalities, 3 regions, ${GLOSSARY_PT.length} glossary, ${blockRows.length} content rows`;
}
