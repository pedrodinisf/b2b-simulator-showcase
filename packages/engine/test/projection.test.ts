import { describe, it, expect } from 'vitest';
import { simulate, projectFiveYears, type SimParams, type Expenses } from '../src/index.ts';

// Reuses the baseline fixture (packages/engine/test/baseline.test.ts) so the
// expected nets here are the same golden numbers the baseline gate locks —
// projectFiveYears must never derive its own arithmetic, only re-index them.

const baseExpenses: Expenses = {
	rent: 0, utilities: 40, electricCar: 0, representation: 100, software: 80,
	internet: 25, phone: 25, other: 30, healthInsurance: 0, equipment: 0, coworking: 0,
	accountantENI: 130, accountantLda: 220, training: 1500, profInsurance: 450, workAccidentIns: 400
};

const baseParams: SimParams = {
	hourlyRate: 50, hoursPerDay: 8, daysPerYear: 220, salary: 2500, derramaRate: 0.015,
	ss_first_year_exempt: true, dividendMethodMode: 'auto', clientLocation: 'PT',
	municipality: 'lisboa', mealCard: true, expenses: { ...baseExpenses }
};

describe('projectFiveYears (pure re-indexing, no new arithmetic)', () => {
	const result = simulate(baseParams);
	const A = Math.round(result.scenarios.A.net);
	const B = Math.round(result.scenarios.B.net);
	const C = Math.round(result.scenarios.C.net);
	const D = Math.round(result.scenarios.D.net);
	const H = Math.round(result.scenarios.H.net);

	it('matches the baseline golden nets (sanity: same fixture, same numbers)', () => {
		expect({ A, B, C, D, H }).toEqual({ A: 65125, B: 57443, C: 52321, D: 51468, H: 52321 });
	});

	it('ENI Simplificado follows the regime ramp: Y1=A, Y2=B, Y3-5=C', () => {
		const p = projectFiveYears(result);
		expect(p.eniSimplificado.years).toEqual([1, 2, 3, 4, 5]);
		expect(p.eniSimplificado.net.map((n) => Math.round(n))).toEqual([A, B, C, C, C]);
	});

	it('ENI Contabilidade Organizada (D) repeats flat across all 5 years', () => {
		const p = projectFiveYears(result);
		expect(p.eniOrganizada.net.map((n) => Math.round(n))).toEqual([D, D, D, D, D]);
	});

	it('Lda defaults to scenario H (custom salary) and repeats flat', () => {
		const p = projectFiveYears(result);
		expect(p.lda.scenario).toBe('H');
		expect(p.lda.net.map((n) => Math.round(n))).toEqual([H, H, H, H, H]);
	});

	it('accepts a different Lda scenario selection (e.g. F)', () => {
		const F = Math.round(result.scenarios.F.net);
		const p = projectFiveYears(result, 'F');
		expect(p.lda.scenario).toBe('F');
		expect(p.lda.net.map((n) => Math.round(n))).toEqual([F, F, F, F, F]);
	});

	it('cumulative is the running sum of net', () => {
		const p = projectFiveYears(result);
		const expected: number[] = [];
		let running = 0;
		for (const n of p.eniSimplificado.net) expected.push((running += n));
		expect(p.eniSimplificado.cumulative).toEqual(expected);
		expect(p.eniSimplificado.cumulative[4]).toBeCloseTo(result.scenarios.A.net + result.scenarios.B.net + 3 * result.scenarios.C.net);
	});
});
