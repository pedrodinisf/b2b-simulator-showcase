import { eq } from 'drizzle-orm';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import type { Dataset, TaxConstants, Municipality, RegionCode } from '@b2bsim/engine';
import * as schema from './schema';

// JSON loses Infinity (the IRS top-bracket max). These round-trip it via a sentinel
// so the DB-sourced T stays identical to the bundled engine constants. Pure (no db/env)
// so the seed script can use serializeT too.
const INF = '__Infinity__';

export function serializeT(T: TaxConstants): string {
	return JSON.stringify(T, (_k, v) => (v === Infinity ? INF : v));
}

export function deserializeT(json: string): TaxConstants {
	return JSON.parse(json, (_k, v) => (v === INF ? Infinity : v)) as TaxConstants;
}

// Assembles a Dataset for a SPECIFIC dataset id (not necessarily the active one)
// from a caller-supplied db instance. Framework-agnostic (no $env), so the CLI
// ingest script can use it directly to compare the previous vs newly-activated
// dataset for law-change alerts, without needing SvelteKit's db singleton.
export async function assembleDatasetById(db: LibSQLDatabase<typeof schema>, datasetId: number): Promise<Dataset | null> {
	const [ds] = await db.select().from(schema.taxDataset).where(eq(schema.taxDataset.id, datasetId)).limit(1);
	if (!ds) return null;
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
