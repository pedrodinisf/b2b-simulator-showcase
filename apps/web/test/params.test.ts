import { describe, it, expect } from 'vitest';
import { DEFAULT_PARAMS } from '@b2bsim/engine';
import { clampParams } from '../src/lib/params.ts';

describe('clampParams (untrusted input → valid SimParams)', () => {
	it('returns defaults for empty/garbage input', () => {
		expect(clampParams({})).toEqual(DEFAULT_PARAMS);
		expect(clampParams(null)).toEqual(DEFAULT_PARAMS);
		expect(clampParams('nope')).toEqual(DEFAULT_PARAMS);
	});

	it('clamps out-of-range numbers', () => {
		const p = clampParams({ hourlyRate: 99999, hoursPerDay: 99, daysPerYear: 5, salary: -100 });
		expect(p.hourlyRate).toBe(200);
		expect(p.hoursPerDay).toBe(12);
		expect(p.daysPerYear).toBe(100);
		expect(p.salary).toBe(0);
	});

	it('rejects an unknown municipality and invalid enums', () => {
		const p = clampParams({ municipality: 'zzz', dividendMethodMode: 'x', clientLocation: 'MARS' });
		expect(p.municipality).toBe('lisboa');
		expect(p.dividendMethodMode).toBe(DEFAULT_PARAMS.dividendMethodMode);
		expect(p.clientLocation).toBe(DEFAULT_PARAMS.clientLocation);
	});

	it('accepts a valid custom municipality and clamps its fields', () => {
		const p = clampParams({
			municipality: 'custom',
			customMuni: { region: 'madeira', derramaRate: 5, derramaReducedRate: 0.01, derramaThreshold: 1e12, participacaoDevolution: 0.05 }
		});
		expect(p.municipality).toBe('custom');
		expect(p.customMuni).toEqual({ region: 'madeira', derramaRate: 1, derramaReducedRate: 0.01, derramaThreshold: 1_000_000_000, participacaoDevolution: 0.05 });
	});

	it('coerces booleans and copies finite expenses only', () => {
		const p = clampParams({ ss_first_year_exempt: 1, mealCard: 0, expenses: { rent: 500, software: 'x', bogus: 9 } });
		expect(p.ss_first_year_exempt).toBe(true);
		expect(p.mealCard).toBe(false);
		expect(p.expenses.rent).toBe(500);
		expect(p.expenses.software).toBe(DEFAULT_PARAMS.expenses.software); // non-number ignored
		expect((p.expenses as unknown as Record<string, number>).bogus).toBeUndefined(); // unknown key ignored
	});
});
