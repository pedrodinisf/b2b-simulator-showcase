import { createClient } from '@libsql/client';
import { deserializeT } from '../src/lib/server/db/dataset';
import { simulate, DEFAULT_PARAMS } from '@b2bsim/engine';

const c = createClient({ url: process.env.DATABASE_URL || 'file:local.db' });
const ds = (await c.execute('select id, payload_json from tax_dataset where is_active=1')).rows[0] as any;
const munis = (await c.execute({ sql: 'select * from municipalities where dataset_id = ?', args: [ds.id] })).rows as any[];
const regs = (await c.execute('select * from regions')).rows as any[];

const T = deserializeT(ds.payload_json);
const MUNICIPALITIES = munis.map((m) => ({
	code: m.code, name: m.name, district: m.district, region: m.region,
	derramaRate: m.derrama_rate, derramaReducedRate: m.derrama_reduced_rate,
	derramaThreshold: m.derrama_threshold, participacaoDevolution: m.participacao_devolution,
	src: m.src, year: m.year
}));
const REGIONS = Object.fromEntries(regs.map((r) => [r.code, { label_pt: r.label_pt, label_en: r.label_en, iva: JSON.parse(r.iva_json) }]));

const out = simulate(DEFAULT_PARAMS, { T, MUNICIPALITIES, REGIONS } as any);
const nets = Object.fromEntries(Object.entries(out.scenarios).map(([k, s]) => [k, Math.round((s as any).net)]));
const expected = { A: 73182, B: 54353, C: 47362, D: 46808, E: 55735, F: 51178, G: 46911, H: 51178 };

console.log('IRS top-bracket max (must be Infinity):', T.irs[T.irs.length - 1].max);
console.log('DB-dataset nets:', JSON.stringify(nets));
console.log('byte-identical to baseline:', JSON.stringify(nets) === JSON.stringify(expected));
c.close();
