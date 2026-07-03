import type { SimParams } from './types.ts';

// Canonical default inputs (the original index.html STATE.params). With the bundled
// dataset these produce the byte-identical default Lisbon baseline; used as the
// frontend's initial state and for the engine's own smoke checks.
export const DEFAULT_PARAMS: SimParams = {
  hourlyRate: 50,
  hoursPerDay: 8,
  daysPerYear: 220,
  salary: 2500,
  derramaRate: 0.015,
  ss_first_year_exempt: true,
  dividendMethodMode: 'auto',
  clientLocation: 'PT',
  municipality: 'lisboa',
  mealCard: true,
  expenses: {
    rent: 0, utilities: 40, electricCar: 0, representation: 100, software: 80,
    internet: 25, phone: 25, other: 30, healthInsurance: 0, equipment: 0, coworking: 0,
    training: 1500, profInsurance: 450, workAccidentIns: 400, accountantENI: 130, accountantLda: 220
  }
};
