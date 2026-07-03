import { DEFAULT_PARAMS, MUNI_BY_CODE, type SimParams, type CustomMuni, type RegionCode } from '@b2bsim/engine';

const REGIONS: readonly string[] = ['continente', 'acores', 'madeira'];
const DIVIDEND_MODES: readonly string[] = ['auto', 'englobamento', 'liberatoria'];
const CLIENT_LOCATIONS: readonly string[] = ['PT', 'UE', 'ForaUE'];

function clampNum(v: unknown, lo: number, hi: number, d: number): number {
	const n = parseFloat(String(v));
	return isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
}

function clampCustomMuni(o: Record<string, unknown>, base?: CustomMuni): CustomMuni {
	const b = base ?? { region: 'continente', derramaRate: 0, derramaReducedRate: 0, derramaThreshold: 0, participacaoDevolution: 0 };
	return {
		region: REGIONS.includes(o.region as string) ? (o.region as RegionCode) : b.region,
		derramaRate: clampNum(o.derramaRate, 0, 1, b.derramaRate),
		derramaReducedRate: clampNum(o.derramaReducedRate, 0, 1, b.derramaReducedRate),
		derramaThreshold: clampNum(o.derramaThreshold, 0, 1_000_000_000, b.derramaThreshold),
		participacaoDevolution: clampNum(o.participacaoDevolution, 0, 1, b.participacaoDevolution)
	};
}

// Produce a valid SimParams from untrusted input (URL hash or API body). Never
// trusts the caller: every field is validated/clamped and unknowns fall back to
// `base` (defaults). Mutates and returns `base`. Bounds mirror the original
// index.html share decoder so the shareable-URL round-trip stays identical.
export function clampParams(input: unknown, base: SimParams = structuredClone(DEFAULT_PARAMS)): SimParams {
	const o = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
	const p = base;
	p.hourlyRate = clampNum(o.hourlyRate, 10, 200, p.hourlyRate);
	p.hoursPerDay = clampNum(o.hoursPerDay, 1, 12, p.hoursPerDay);
	p.daysPerYear = clampNum(o.daysPerYear, 100, 260, p.daysPerYear);
	p.salary = clampNum(o.salary, 0, 100000, p.salary);
	p.municipality = o.municipality === 'custom' || MUNI_BY_CODE[o.municipality as string] ? (o.municipality as string) : 'lisboa';
	if (p.municipality === 'custom' && o.customMuni && typeof o.customMuni === 'object') {
		p.customMuni = clampCustomMuni(o.customMuni as Record<string, unknown>, p.customMuni);
	}
	if (DIVIDEND_MODES.includes(o.dividendMethodMode as string)) p.dividendMethodMode = o.dividendMethodMode as SimParams['dividendMethodMode'];
	if (CLIENT_LOCATIONS.includes(o.clientLocation as string)) p.clientLocation = o.clientLocation as SimParams['clientLocation'];
	if ('ss_first_year_exempt' in o) p.ss_first_year_exempt = !!o.ss_first_year_exempt;
	if ('mealCard' in o) p.mealCard = !!o.mealCard;
	if (o.expenses && typeof o.expenses === 'object') {
		const src = o.expenses as Record<string, unknown>;
		const exp = p.expenses as unknown as Record<string, number>;
		for (const k in p.expenses) if (typeof src[k] === 'number' && isFinite(src[k] as number)) exp[k] = src[k] as number;
	}
	return p;
}
