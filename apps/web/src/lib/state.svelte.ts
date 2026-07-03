import { DEFAULT_PARAMS, type SimParams, type SimResult, type TaxConstants, type RegionCode, type FiveYearProjection } from '@b2bsim/engine';

export interface SensRow {
	rate: number;
	revenue: number;
	A: number;
	C: number;
	F: number;
}

// Client state for the server-compute model. The engine and the municipality
// rate table live ONLY on the server; the client posts params to /api/simulate and
// renders the returned result. `T` is the editable (public) constants for the Config tab.
export const calc = $state<{
	params: SimParams;
	activePreset: string | null;
	T: TaxConstants | null;
	currentResult: SimResult | null;
	sensitivity: SensRow[] | null;
}>({
	params: structuredClone(DEFAULT_PARAMS),
	activePreset: null,
	T: null,
	currentResult: null,
	sensitivity: null
});

let cachedSid: string | null = null;
function sessionId(): string {
	if (cachedSid) return cachedSid;
	try {
		cachedSid = sessionStorage.getItem('b2bsim_sid');
		if (!cachedSid) {
			cachedSid = crypto.randomUUID();
			sessionStorage.setItem('b2bsim_sid', cachedSid);
		}
	} catch {
		cachedSid = 'anon';
	}
	return cachedSid;
}

// Compute on the server; optionally log the settled simulation (anonymous).
export async function recompute(lang: string, log = false): Promise<void> {
	try {
		const res = await fetch('/api/simulate', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ params: calc.params, T: calc.T ?? undefined, sessionId: log ? sessionId() : undefined, lang, source: 'web', log })
		});
		if (!res.ok) return;
		const data = await res.json();
		calc.currentResult = data.result as SimResult;
		calc.sensitivity = data.sensitivity as SensRow[];
	} catch {
		/* keep the last good result */
	}
}

export async function optimise(lang: string): Promise<{ salary: number; net: number } | null> {
	try {
		const res = await fetch('/api/optimise', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ params: calc.params, T: calc.T ?? undefined })
		});
		if (!res.ok) return null;
		const r = (await res.json()) as { salary: number; net: number };
		calc.params.salary = r.salary;
		await recompute(lang, true);
		return r;
	} catch {
		return null;
	}
}

// Multi-year (Year 1-5) projection (premium). Pure fetch, like optimise/solveRate:
// caller owns the result, nothing is written to `calc`.
export async function fetchProjection(ldaScenario?: 'E' | 'F' | 'G' | 'H'): Promise<FiveYearProjection | null> {
	try {
		const res = await fetch('/api/projection', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ params: calc.params, T: calc.T ?? undefined, ldaScenario })
		});
		if (!res.ok) return null;
		return ((await res.json()) as { projection: FiveYearProjection }).projection;
	} catch {
		return null;
	}
}

export async function solveRate(target: number, key: string): Promise<number | null> {
	try {
		const res = await fetch('/api/solve', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ params: calc.params, T: calc.T ?? undefined, target, key })
		});
		if (!res.ok) return null;
		return (await res.json()).rate as number;
	} catch {
		return null;
	}
}

// Email the current scenario as a branded report (server renders + sends). Returns
// { ok } plus an error code on failure so the form can localise the message.
export async function sendReport(
	lang: string,
	email: string,
	alertsConsent: boolean,
	source: string
): Promise<{ ok: boolean; error?: string }> {
	const ctrl = new AbortController();
	const timeout = setTimeout(() => ctrl.abort(), 30000);
	try {
		const res = await fetch('/api/report', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ email, lang, alertsConsent, source, params: calc.params }),
			signal: ctrl.signal
		});
		const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
		return { ok: res.ok && data.ok === true, error: data.error };
	} catch {
		return { ok: false, error: 'network' };
	} finally {
		clearTimeout(timeout);
	}
}

export function setMunicipality(code: string) {
	calc.params.municipality = code;
	if (code !== 'custom') {
		delete calc.params.customMuni;
	} else if (!calc.params.customMuni) {
		calc.params.customMuni = { region: 'continente', derramaRate: 0, derramaReducedRate: 0, derramaThreshold: 0, participacaoDevolution: 0 };
	}
}

export function setCustomMuni(field: string, value: string) {
	const c = calc.params.customMuni;
	if (!c) return;
	if (field === 'region') {
		c.region = value as RegionCode;
		return;
	}
	const num = parseFloat(value) || 0;
	if (field === 'derramaThreshold') c.derramaThreshold = num;
	else if (field === 'derramaRate') c.derramaRate = num / 100;
	else if (field === 'derramaReducedRate') c.derramaReducedRate = num / 100;
	else if (field === 'participacaoDevolution') c.participacaoDevolution = num / 100;
}

// Expense presets per typical PT job profile (ported from index.html).
export const PRESETS: Record<string, { expenses: Partial<SimParams['expenses']>; mealCard: boolean }> = {
	'consultor-it':     { expenses: { rent: 0,   utilities: 40, internet: 40, phone: 30, software: 120, other: 30, electricCar: 0,   healthInsurance: 50,  equipment: 80,  coworking: 0,   representation: 50,  training: 1500, profInsurance: 300,  workAccidentIns: 250 }, mealCard: true },
	'consultor-gestao': { expenses: { rent: 0,   utilities: 40, internet: 40, phone: 40, software: 60,  other: 50, electricCar: 500, healthInsurance: 80,  equipment: 50,  coworking: 150, representation: 200, training: 2000, profInsurance: 400,  workAccidentIns: 300 }, mealCard: true },
	'designer':         { expenses: { rent: 0,   utilities: 40, internet: 40, phone: 30, software: 160, other: 30, electricCar: 0,   healthInsurance: 50,  equipment: 150, coworking: 200, representation: 40,  training: 1200, profInsurance: 300,  workAccidentIns: 250 }, mealCard: true },
	'medico':           { expenses: { rent: 100, utilities: 50, internet: 40, phone: 30, software: 40,  other: 50, electricCar: 0,   healthInsurance: 120, equipment: 120, coworking: 0,   representation: 50,  training: 3000, profInsurance: 1200, workAccidentIns: 400 }, mealCard: true },
	'websec':           { expenses: { rent: 0,   utilities: 40, internet: 60, phone: 30, software: 220, other: 40, electricCar: 0,   healthInsurance: 60,  equipment: 120, coworking: 0,   representation: 40,  training: 4000, profInsurance: 350,  workAccidentIns: 250 }, mealCard: true },
	'zero':             { expenses: { rent: 0,   utilities: 0,  internet: 0,  phone: 0,  software: 0,   other: 0,  electricCar: 0,   healthInsurance: 0,   equipment: 0,   coworking: 0,   representation: 0,   training: 0,    profInsurance: 0,    workAccidentIns: 0 },   mealCard: false }
};

export function applyPreset(key: string) {
	const pr = PRESETS[key];
	if (!pr) return;
	Object.assign(calc.params.expenses, pr.expenses);
	calc.params.mealCard = pr.mealCard;
	calc.activePreset = key;
}

// --- Config tab: edit the (public) constants; sent with recompute so results reflect them ---
export function seedConfig(constants: TaxConstants) {
	if (!calc.T) calc.T = structuredClone(constants);
}
export function resetConfig(constants: TaxConstants) {
	calc.T = structuredClone(constants);
}
export function getNested(obj: unknown, path: string): unknown {
	return path.split('.').reduce<unknown>((o, k) => (o == null ? o : (o as Record<string, unknown>)[k]), obj);
}
function setNested(obj: Record<string, unknown>, path: string, val: number): void {
	const keys = path.split('.');
	const last = keys.pop() as string;
	let o: Record<string, unknown> = obj;
	for (const k of keys) o = o[k] as Record<string, unknown>;
	o[last] = val;
}
export function updateConfigValue(path: string, raw: string, kind: string): void {
	if (!calc.T) return;
	let v = parseFloat(raw);
	if (!isFinite(v)) return;
	if (kind === 'pct') v = v / 100;
	const T = calc.T as unknown as Record<string, unknown>;
	setNested(T, path, v);
	if (path === 'ias') {
		const ceil = +(12 * v).toFixed(2);
		const catA = +(8 * v).toFixed(2);
		setNested(T, 'ss.eni_max_base_monthly', ceil);
		setNested(T, 'ias_monthly_max', ceil);
		setNested(T, 'irs_cat_a_deduction', catA);
		setNested(T, 'ss.moe_min_base_monthly', v);
	}
}
