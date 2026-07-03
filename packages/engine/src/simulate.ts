import { resolveMunicipality, resolveRegion } from './tax.ts';
import { DEFAULT_DATASET, type Dataset } from './dataset.ts';
import { fmt } from './format.ts';
import type { Municipality, SimParams, SimResult } from './types.ts';

// ⚠️ SIMPLIFIED PLACEHOLDER ENGINE (public showcase build).
//
// The production engine models the eight ENI vs Unipessoal Lda scenarios in
// detail — regime coefficients and the year-1/2 ramp, the 15% expense-
// justification basket, the dividend-extraction optimiser (liberatória vs
// englobamento), the SS/IRS interplay, municipal derrama and regional factors,
// legal-reserve and sustainability checks, etc. That calculation methodology is
// proprietary and is NOT included in this public repository.
//
// Here, each scenario's net is produced by a deliberately trivial illustrative
// formula (a flat per-scenario burden rate on revenue, adjusted by the injected
// region factor and municipal rebate). It keeps the engine a pure, deterministic,
// dataset-injected, tested function so the ARCHITECTURE is demonstrable — but the
// numbers are meaningless and encode none of the real modelling.

const SCENARIOS: { key: string; name: string; desc: string; rate: number }[] = [
  { key: 'A', name: 'ENI Simplificado, Ano 1', desc: 'Primeiro ano de atividade (exemplo ilustrativo).', rate: 0.18 },
  { key: 'B', name: 'ENI Simplificado, Ano 2', desc: 'Segundo ano (exemplo ilustrativo).', rate: 0.27 },
  { key: 'C', name: 'ENI Simplificado, Ano 3+', desc: 'Regime estável (exemplo ilustrativo).', rate: 0.33 },
  { key: 'D', name: 'ENI Contabilidade Organizada', desc: 'Dedução de despesas reais (exemplo ilustrativo).', rate: 0.34 },
  { key: 'E', name: 'Lda. salário €1.500', desc: 'Salário baixo (exemplo ilustrativo).', rate: 0.31 },
  { key: 'F', name: 'Lda. salário €2.500', desc: 'Salário médio (exemplo ilustrativo).', rate: 0.34 },
  { key: 'G', name: 'Lda. salário €3.400', desc: 'Salário alto (exemplo ilustrativo).', rate: 0.37 }
];

export function simulate(params: SimParams, dataset: Dataset = DEFAULT_DATASET): SimResult {
  const T = dataset.T;
  const { hourlyRate, hoursPerDay, daysPerYear, salary, expenses } = params;
  const byCode: Record<string, Municipality> = Object.fromEntries(
    dataset.MUNICIPALITIES.map((x) => [x.code, x] as const)
  );
  const muni = resolveMunicipality(params, byCode);
  const reg = resolveRegion(muni.region, T);

  const revenue = hourlyRate * hoursPerDay * daysPerYear;
  const documentedExpenses =
    (expenses.rent + expenses.utilities + expenses.electricCar + expenses.representation +
      expenses.software + expenses.internet + expenses.phone + expenses.other +
      (expenses.healthInsurance || 0) + (expenses.equipment || 0) + (expenses.coworking || 0)) * 12 +
    expenses.training + expenses.profInsurance + expenses.workAccidentIns + expenses.accountantENI * 12;

  const effectiveDerrama = revenue <= muni.derramaThreshold ? muni.derramaReducedRate : muni.derramaRate;

  const out: any = {
    revenue,
    params,
    effectiveDerrama,
    lisbonRebatePct: muni.participacaoDevolution,
    region: muni.region,
    derramaThreshold: muni.derramaThreshold,
    muniName: muni.name,
    scenarios: {}
  };

  // Illustrative net: a flat burden rate on revenue, split into SS/IRS, with the
  // injected regional factor applied to the IRS part and the municipal rebate
  // credited back. net = revenue − (tax + SS) − real expenses (parts sum to net).
  const build = (name: string, desc: string, rate: number) => {
    const ss_total = revenue * rate * 0.4;
    const irs_total = revenue * rate * 0.6 * reg.irs;
    const lisbon_rebate = irs_total * muni.participacaoDevolution;
    const tax_ss = ss_total + irs_total - lisbon_rebate;
    const business_expenses = documentedExpenses;
    const net = revenue - tax_ss - business_expenses;
    return {
      name, desc, gross: revenue, ss_total, irs_total, lisbon_rebate, tax_ss, business_expenses,
      net, net_monthly: net / 12, total_burden: revenue - net, effective_rate: (revenue - net) / revenue
    };
  };

  for (const s of SCENARIOS) out.scenarios[s.key] = build(s.name, s.desc, s.rate);

  // Custom-salary Lda: shallow burden optimum near €2.500/mo, so the salary
  // optimiser (/api/optimise) has an interior maximum to find.
  const hRate = 0.33 + Math.pow((salary - 2500) / 2500, 2) * 0.03;
  out.scenarios.H = build('Lda. salário personalizado', 'O teu salário escolhido no painel (€' + fmt(salary, 'pt') + '/mês).', hRate);
  out.scenarios.H.isCustom = true;

  let best = 'A';
  let bestNet = -Infinity;
  for (const key in out.scenarios) {
    if (out.scenarios[key].net > bestNet) {
      bestNet = out.scenarios[key].net;
      best = key;
    }
  }
  out.winner = best;

  return out as SimResult;
}
