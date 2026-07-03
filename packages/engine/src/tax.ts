import { T, type TaxConstants } from './constants.ts';
import { MUNI_BY_CODE } from './municipalities.ts';
import type { Municipality, RegionCode, SimParams } from './types.ts';

// A municipality as consumed by the engine. The custom-override branch has no
// source/year, so those are optional (present for table rows, absent for custom).
export type ResolvedMunicipality = Omit<Municipality, 'src' | 'year'> & {
  src?: string;
  year?: number;
};
export interface RegionFactors {
  irs: number;
  irc: number;
}

// --- Tax primitives (verbatim arithmetic from index.html) ---
// Each accepts an optional tax-constants set so a dynamic (DB-sourced) dataset can
// be injected; the default is the bundled 2026 constants, which keeps the baseline
// byte-identical.

export function calcIRS(taxableIncome: number, tc: TaxConstants = T): number {
  if (taxableIncome <= 0) return 0;
  for (const b of tc.irs) {
    if (taxableIncome <= b.max) {
      return Math.max(0, taxableIncome * b.rate - b.ded);
    }
  }
  const top = tc.irs[tc.irs.length - 1];
  return Math.max(0, taxableIncome * top.rate - top.ded);
}

export function calcIRSSolidarity(taxableIncome: number, tc: TaxConstants = T): number {
  let tax = 0;
  for (const b of tc.irs_solidarity) {
    if (taxableIncome > b.min) {
      tax += (Math.min(taxableIncome, b.max) - b.min) * b.rate;
    }
  }
  return tax;
}

export function calcWithholding(monthlyGross: number, tc: TaxConstants = T): number {
  for (const b of tc.irs_withholding_T1) {
    if (monthlyGross <= b.max) {
      return Math.max(0, monthlyGross * b.rate - b.ded);
    }
  }
  const top = tc.irs_withholding_T1[tc.irs_withholding_T1.length - 1];
  return Math.max(0, monthlyGross * top.rate - top.ded);
}

export function calcIRC(taxableProfit: number, tc: TaxConstants = T): number {
  if (taxableProfit <= 0) return 0;
  if (taxableProfit <= tc.irc.pme_threshold) {
    return taxableProfit * tc.irc.pme;
  }
  return tc.irc.pme_threshold * tc.irc.pme + (taxableProfit - tc.irc.pme_threshold) * tc.irc.standard;
}

// --- Region / municipality resolvers (verbatim) ---

export function resolveRegion(code: RegionCode, tc: TaxConstants = T): RegionFactors {
  const r = tc.regions[code] || tc.regions.continente;
  return { irs: r.irs, irc: r.irc };
}

export function resolveMunicipality(
  params: Pick<SimParams, 'municipality' | 'customMuni'>,
  byCode: Record<string, Municipality> = MUNI_BY_CODE
): ResolvedMunicipality {
  if (params.municipality === 'custom' && params.customMuni) {
    const c = params.customMuni;
    return {
      code: 'custom', name: '', district: '', region: c.region || 'continente',
      derramaRate: +c.derramaRate || 0, derramaReducedRate: +c.derramaReducedRate || 0,
      derramaThreshold: +c.derramaThreshold || 0, participacaoDevolution: +c.participacaoDevolution || 0
    };
  }
  return byCode[params.municipality] || byCode.lisboa;
}
