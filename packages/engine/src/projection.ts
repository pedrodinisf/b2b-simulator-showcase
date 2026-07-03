import type { SimResult } from './types.ts';

// Nominal 5-year projection. Purely a re-indexing of scenarios simulate() already
// computed — no new tax arithmetic, so this cannot affect the baseline gate.
//
// ENI Simplificado follows the regime's own ramp (Year 1 = scenario A, Year 2 = B,
// Year 3+ = C). ENI Contabilidade Organizada (D) and the Lda scenarios (E/F/G/H)
// have no ramp, so the chosen scenario's net repeats every year — the engine does
// not model revenue growth, and neither does this projection (nominal euros, no
// NPV/discounting).

export interface YearlyProjection {
  scenario: string;
  years: number[];
  net: number[];
  cumulative: number[];
}

export interface FiveYearProjection {
  eniSimplificado: YearlyProjection;
  eniOrganizada: YearlyProjection;
  lda: YearlyProjection;
}

function buildProjection(scenario: string, nets: number[]): YearlyProjection {
  let running = 0;
  const cumulative = nets.map((n) => (running += n));
  return { scenario, years: [1, 2, 3, 4, 5], net: nets, cumulative };
}

// `ldaScenario` picks which Lda salary scenario to project (E €1.500 / F €2.500 /
// G €3.400 / H custom). Defaults to H, the user's chosen salary — the same
// scenario the optimiser (/api/optimise) already targets.
export function projectFiveYears(result: SimResult, ldaScenario: 'E' | 'F' | 'G' | 'H' = 'H'): FiveYearProjection {
  const s = result.scenarios;
  return {
    eniSimplificado: buildProjection('A/B/C', [s.A.net, s.B.net, s.C.net, s.C.net, s.C.net]),
    eniOrganizada: buildProjection('D', [s.D.net, s.D.net, s.D.net, s.D.net, s.D.net]),
    lda: buildProjection(ldaScenario, Array(5).fill(s[ldaScenario].net))
  };
}
