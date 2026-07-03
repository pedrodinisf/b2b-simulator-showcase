import { describe, it, expect } from 'vitest';
import { simulate, type SimParams, type Expenses } from '../src/index.ts';

// Regression lock on the (illustrative) sample dataset: these golden nets are
// recorded from the current engine so any accidental change in the maths is
// caught. The numbers are meaningless outside this repo's placeholder data — the
// point is that the engine stays deterministic and self-consistent.

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

function netsOf(p: SimParams) {
  const out = simulate(p);
  const nets: Record<string, number> = {};
  for (const k of Object.keys(out.scenarios)) nets[k] = Math.round(out.scenarios[k].net);
  return { revenue: out.revenue, winner: out.winner, nets };
}

describe('engine regression lock (sample dataset)', () => {
  it('default (Lisbon) — deterministic nets', () => {
    const r = netsOf(baseParams);
    expect(r.revenue).toBe(88000);
    expect(r.winner).toBe('A');
    expect(r.nets).toEqual({ A: 65125, B: 57443, C: 52321, D: 51468, E: 54028, F: 51468, G: 48907, H: 52321 });
  });

  it('alt1 — custom continente, higher rate/salary, SS not first-year-exempt', () => {
    const p: SimParams = {
      ...structuredClone(baseParams), hourlyRate: 65, salary: 3400,
      municipality: 'custom',
      customMuni: { region: 'continente', derramaRate: 0.015, derramaReducedRate: 0.015, derramaThreshold: 0, participacaoDevolution: 0 },
      ss_first_year_exempt: false
    };
    const r = netsOf(p);
    expect(r.revenue).toBe(114400);
    expect(r.nets).toEqual({ A: 86298, B: 76002, C: 69138, D: 67994, E: 71426, F: 67994, G: 64562, H: 68693 });
  });

  it('alt2 — lower rate/days, EU client, englobamento, more expenses', () => {
    const p: SimParams = {
      ...structuredClone(baseParams), hourlyRate: 40, daysPerYear: 200, clientLocation: 'UE', dividendMethodMode: 'englobamento',
      expenses: { ...baseExpenses, rent: 800, software: 200 }
    };
    const r = netsOf(p);
    expect(r.revenue).toBe(64000);
    expect(r.nets).toEqual({ A: 34276, B: 28688, C: 24964, D: 24343, E: 26205, F: 24343, G: 22480, H: 24964 });
  });

  it('Açores spot-check — region IRS/IRC factor raises ENI net vs continente', () => {
    const p: SimParams = {
      ...structuredClone(baseParams), municipality: 'custom',
      customMuni: { region: 'acores', derramaRate: 0, derramaReducedRate: 0, derramaThreshold: 0, participacaoDevolution: 0 }
    };
    const r = netsOf(p);
    expect(r.revenue).toBe(88000);
    expect(r.nets).toEqual({ A: 67501, B: 61007, C: 56677, D: 55956, E: 58120, F: 55956, G: 53791, H: 56677 });
  });
});
