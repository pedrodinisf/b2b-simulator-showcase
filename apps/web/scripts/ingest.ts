// Tax-data ingestion: load a new versioned dataset without a code change.
//
// An upstream step (out of scope for this showcase) produces a municipalities JSON
// array for the target year; pass it with --municipalities=<file.json>. This loader
// inserts it as a NEW versioned tax_dataset (inactive unless --activate). With no
// file it reuses the bundled sample dataset, so the path is runnable as-is.
//
// Usage: pnpm --filter @b2bsim/web ingest:derrama -- --year=2027 [--municipalities=muni.json] [--activate]

import fs from 'node:fs';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { eq } from 'drizzle-orm';
import * as schema from '../src/lib/server/db/schema';
import { serializeT, assembleDatasetById } from '../src/lib/server/db/dataset';
import { runAlertsForDataset } from '../src/lib/server/alerts';
import { createEmailSender } from '../src/lib/server/email';
import { DEFAULT_DATASET, type Municipality } from '@b2bsim/engine';

const args = process.argv.slice(2);
const arg = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const year = Number(arg('year')) || new Date().getFullYear();
const muniFile = arg('municipalities');
const activate = args.includes('--activate');

const MUNICIPALITIES: Municipality[] = muniFile
	? (JSON.parse(fs.readFileSync(muniFile, 'utf8')) as Municipality[])
	: DEFAULT_DATASET.MUNICIPALITIES;

const client = createClient({ url: process.env.DATABASE_URL || 'file:local.db' });
const db = drizzle(client, { schema });

const [ds] = await db
	.insert(schema.taxDataset)
	.values({
		year,
		source: muniFile ? `Ingested from ${muniFile}` : 'Ingest placeholder (bundled defaults)',
		effectiveFrom: `${year}-01-01`,
		checksum: null,
		payloadJson: serializeT(DEFAULT_DATASET.T),
		isActive: false,
		createdAt: new Date().toISOString()
	})
	.returning({ id: schema.taxDataset.id });

const rows = MUNICIPALITIES.map((m) => ({
	datasetId: ds.id,
	code: m.code, name: m.name, district: m.district, region: m.region,
	derramaRate: m.derramaRate, derramaReducedRate: m.derramaReducedRate,
	derramaThreshold: m.derramaThreshold, participacaoDevolution: m.participacaoDevolution,
	src: m.src, year: m.year
}));
for (let i = 0; i < rows.length; i += 100) await db.insert(schema.municipalities).values(rows.slice(i, i + 100));

if (activate) {
	const [previouslyActive] = await db.select({ id: schema.taxDataset.id }).from(schema.taxDataset).where(eq(schema.taxDataset.isActive, true)).limit(1);
	await db.update(schema.taxDataset).set({ isActive: false });
	await db.update(schema.taxDataset).set({ isActive: true }).where(eq(schema.taxDataset.id, ds.id));

	// Law-change alerts: diff subscribers' saved scenarios against the dataset that
	// was active just before this one, and email the ones materially affected.
	if (previouslyActive && previouslyActive.id !== ds.id) {
		const oldDataset = await assembleDatasetById(db, previouslyActive.id);
		const newDataset = await assembleDatasetById(db, ds.id);
		if (oldDataset && newDataset) {
			const sender = createEmailSender({
				driver: process.env.EMAIL_DRIVER,
				endpoint: process.env.EMAIL_ENDPOINT,
				apiKey: process.env.EMAIL_API_KEY,
				from: process.env.EMAIL_FROM
			});
			const summary = await runAlertsForDataset(db, {
				oldDataset,
				newDataset,
				newDatasetId: ds.id,
				sender,
				baseUrl: process.env.BETTER_AUTH_URL || 'http://localhost:5173',
				maxEmails: Number(process.env.ALERT_RUN_MAX_EMAILS) || 500
			});
			console.log(`Alerts: evaluated ${summary.evaluated}, notified ${summary.notified}, unchanged ${summary.unchanged}, skipped (cap) ${summary.skippedCap}.`);
		}
	}
}

console.log(`Ingested dataset #${ds.id} (year ${year}, ${rows.length} municipalities)${activate ? ' — now ACTIVE' : ' — inactive'}.`);
client.close();
