import { type SimParams } from '@b2bsim/engine';
import { clampParams } from './params';

// Shareable scenario state, ported from index.html encodeStateToURL/applyStateFromURL.
// Pure (no DOM): the component supplies location/clipboard. Locale lives in the URL
// path now, so it is not part of the payload. Every decoded value is validated/clamped
// via the shared clampParams (also used by the /api/report endpoint).
export const SHARE_KEYS = [
	'hourlyRate', 'hoursPerDay', 'daysPerYear', 'salary',
	'municipality', 'dividendMethodMode', 'clientLocation', 'ss_first_year_exempt', 'mealCard'
] as const;

export function encodeParams(p: SimParams): string {
	const o: Record<string, unknown> = {};
	for (const k of SHARE_KEYS) o[k] = p[k];
	o.customMuni = p.customMuni || null;
	o.expenses = p.expenses;
	return btoa(unescape(encodeURIComponent(JSON.stringify(o))));
}

// Mutates `p` in place from the base64 payload; never trusts the input.
export function applyEncoded(encoded: string, p: SimParams): void {
	try {
		const o = JSON.parse(decodeURIComponent(escape(atob(encoded))));
		clampParams(o, p);
	} catch {
		/* malformed hash → keep defaults */
	}
}
