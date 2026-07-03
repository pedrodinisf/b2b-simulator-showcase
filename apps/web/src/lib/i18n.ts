import { page } from '$app/state';
import { t as ct, tf as ctf, pick as cpick, type Lang } from '@b2bsim/content';
import { fmt as efmt, fmtEur as efmtEur, fmtPct as efmtPct } from '@b2bsim/engine';

// Current locale comes from the [lang] layout's load data. Reading page.data here
// keeps these helpers reactive (Svelte re-runs them when the route locale changes)
// and SSR-safe (request-scoped, no module-level mutable state).
function current(): Lang {
	const l = (page.data as { lang?: Lang }).lang;
	return l ?? 'pt';
}

export function t(key: string): string {
	return ct(current(), key);
}
export function tf(key: string, vars?: Record<string, string | number>): string {
	return ctf(current(), key, vars);
}
export function pick<T>(pt: T, en: T): T {
	return cpick(current(), pt, en);
}

// Locale-bound formatters (the engine's own fmt, so display matches the original site).
export function fmt(n: number): string {
	return efmt(n, current());
}
export function fmtEur(n: number): string {
	return efmtEur(n, current());
}
export function fmtPct(n: number, dec = 1): string {
	return efmtPct(n, dec);
}
export function locale(): Lang {
	return current();
}
export type { Lang };
