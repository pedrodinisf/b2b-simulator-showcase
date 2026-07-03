import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { and, eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import type { Dataset, Municipality, RegionCode, Region, TaxConstants } from '@b2bsim/engine';
import * as schema from './schema';
import { deserializeT } from './dataset';

export type MunicipalityName = { code: string; name: string; district: string; region: string };

// libsql client (SQLite-compatible, prebuilt — no native build). Local file by
// default; DATABASE_URL can point elsewhere (e.g. a mounted volume in production).
const client = createClient({ url: env.DATABASE_URL || 'file:local.db' });

export const db = drizzle(client, { schema });
export { schema };

// Assemble the active dataset ({ T, MUNICIPALITIES, REGIONS }) from the DB for the engine.
export async function getActiveDataset(): Promise<Dataset> {
	const ds = (await db.select().from(schema.taxDataset).where(eq(schema.taxDataset.isActive, true)).limit(1))[0];
	if (!ds) throw new Error('No active tax dataset in the database (run db:seed).');
	const munis = await db.select().from(schema.municipalities).where(eq(schema.municipalities.datasetId, ds.id));
	const regs = await db.select().from(schema.regions);
	const MUNICIPALITIES: Municipality[] = munis.map((m) => ({
		code: m.code, name: m.name, district: m.district, region: m.region as RegionCode,
		derramaRate: m.derramaRate, derramaReducedRate: m.derramaReducedRate,
		derramaThreshold: m.derramaThreshold, participacaoDevolution: m.participacaoDevolution,
		src: m.src, year: m.year
	}));
	const REGIONS = Object.fromEntries(
		regs.map((r) => [r.code, { label_pt: r.labelPt, label_en: r.labelEn, iva: JSON.parse(r.ivaJson) as number[] }])
	) as Dataset['REGIONS'];
	return { T: deserializeT(ds.payloadJson), MUNICIPALITIES, REGIONS };
}

// --- Public (non-sensitive) data for the client: constants, region labels, municipality NAMES ---
// The per-municipality rate columns are deliberately NOT exposed here; they stay server-side and
// are only used inside /api/simulate etc.

export async function getConstants(): Promise<TaxConstants> {
	const ds = (await db.select({ p: schema.taxDataset.payloadJson }).from(schema.taxDataset).where(eq(schema.taxDataset.isActive, true)).limit(1))[0];
	if (!ds) throw new Error('No active tax dataset (run db:seed).');
	return deserializeT(ds.p);
}

export async function getRegionsMap(): Promise<Record<string, Region>> {
	const regs = await db.select().from(schema.regions);
	return Object.fromEntries(regs.map((r) => [r.code, { label_pt: r.labelPt, label_en: r.labelEn, iva: JSON.parse(r.ivaJson) as number[] }]));
}

export async function getMunicipalityNames(): Promise<MunicipalityName[]> {
	const ds = (await db.select({ id: schema.taxDataset.id }).from(schema.taxDataset).where(eq(schema.taxDataset.isActive, true)).limit(1))[0];
	if (!ds) return [];
	return db
		.select({ code: schema.municipalities.code, name: schema.municipalities.name, district: schema.municipalities.district, region: schema.municipalities.region })
		.from(schema.municipalities)
		.where(eq(schema.municipalities.datasetId, ds.id));
}

// --- Content queries ---

// Raw payload for a content block (HTML for prose; JSON string for concepts/negotiation).
export async function getContentBlock(name: string, lang: string): Promise<string> {
	const [row] = await db
		.select({ payload: schema.contentBlock.payloadJson })
		.from(schema.contentBlock)
		.where(and(eq(schema.contentBlock.name, name), eq(schema.contentBlock.lang, lang)))
		.limit(1);
	return row?.payload ?? '';
}

export async function getGlossary(lang: string): Promise<{ id: string; term: string; def: string }[]> {
	const rows = await db.select().from(schema.glossary);
	const en = lang === 'en';
	return rows.map((g) => ({ id: g.id, term: en ? g.termEn : g.termPt, def: en ? g.defEn : g.defPt }));
}
