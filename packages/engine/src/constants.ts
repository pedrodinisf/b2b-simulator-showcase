import type { Region, RegionCode } from './types.ts';

// ⚠️ ILLUSTRATIVE PLACEHOLDER VALUES — NOT real Portuguese tax figures.
//
// This is a public showcase build. Every rate, bracket and threshold below is a
// made-up round number chosen only to keep the engine runnable and the demo
// coherent. They do NOT correspond to any real tax year and must never be used
// for an actual calculation. The production instance uses a separately-maintained,
// source-cited dataset that is not part of this repository.
//
// The SHAPE of this object is the real engine's contract; only the numbers are fake.
export const T = {
  // --- Social-support index (illustrative) ---
  ias: 500,
  ias_monthly_max: 6000, // 12 × IAS (ceiling for self-employed SS)
  ias_monthly_min: 800,

  // --- Minimum wage (illustrative) ---
  smn: 900,

  // --- Personal income tax: progressive brackets (illustrative, 9 bands) ---
  // tax(x) = x * rate − ded, with ded chosen so the piecewise function is continuous.
  irs: [
    { min: 0,      max: 10000,   rate: 0.10, ded: 0 },
    { min: 10000,  max: 20000,   rate: 0.15, ded: 500 },
    { min: 20000,  max: 30000,   rate: 0.20, ded: 1500 },
    { min: 30000,  max: 40000,   rate: 0.25, ded: 3000 },
    { min: 40000,  max: 60000,   rate: 0.30, ded: 5000 },
    { min: 60000,  max: 80000,   rate: 0.35, ded: 8000 },
    { min: 80000,  max: 120000,  rate: 0.40, ded: 12000 },
    { min: 120000, max: 200000,  rate: 0.45, ded: 18000 },
    { min: 200000, max: Infinity, rate: 0.50, ded: 28000 },
  ],

  // Solidarity surtax on high incomes (illustrative)
  irs_solidarity: [
    { min: 100000, max: 250000,   rate: 0.02 },
    { min: 250000, max: Infinity, rate: 0.04 },
  ],

  // Employment-income specific deduction (illustrative)
  irs_cat_a_deduction: 4000,
  // Minimum-existence floor (illustrative)
  irs_min_existence: 10000,

  // --- Monthly withholding table, single / no dependents (illustrative) ---
  // withhold(x) = x * rate − ded (continuous, round bands)
  irs_withholding_T1: [
    { min: 0,    max: 900,      rate: 0,    ded: 0 },
    { min: 900,  max: 1500,     rate: 0.10, ded: 90 },
    { min: 1500, max: 2500,     rate: 0.20, ded: 240 },
    { min: 2500, max: 4000,     rate: 0.30, ded: 490 },
    { min: 4000, max: Infinity, rate: 0.40, ded: 890 },
  ],

  // --- Corporate income tax (illustrative) ---
  irc: {
    standard: 0.20,
    pme: 0.15,             // reduced rate on the first slice of profit
    pme_threshold: 50000,
    interior_pme: 0.10,    // interior-territory reduced rate
    non_resident: 0.25,
  },

  // --- Municipal surtax on profit (illustrative) ---
  derrama: {
    max: 0.015,            // illustrative legal cap
    porto_2026: 0.015,
    porto_exemption: 150000,
    lisboa: 0.015,
    lisboa_exemption: 150000,
  },

  // --- Sample capital municipality (illustrative) ---
  lisboa: {
    derrama_rate: 0.015,
    derrama_threshold: 150000, // turnover above which the surtax applies
    irs_devolution: 0.05,      // share of tax rebated to the resident
    imi_rate: 0.003,
    direitos_passagem: 0.0025,
  },

  // --- Social security (illustrative) ---
  ss: {
    // Company-officer / managing-partner split
    moe_worker: 0.11,
    moe_employer: 0.24,
    moe_total: 0.35,
    moe_min_base_monthly: 500,

    // Self-employed
    eni_rate: 0.20,
    eni_relevant_pct: 0.70,        // share of services revenue that is contributory
    eni_max_base_monthly: 6000,    // ceiling
    eni_min_base_monthly: 800,

    // First-year exemption window (months)
    eni_first_year_exemption_months: 12,

    // Contracting-entity surcharge (paid by the client)
    entidade_50_80: 0.07,
    entidade_over_80: 0.10,
  },

  // --- Dividends (illustrative) ---
  dividends: {
    withholding: 0.25,            // flat withholding rate
    englobamento_inclusion: 0.50, // share included if aggregation is elected
  },

  // --- VAT (illustrative) ---
  vat: {
    standard: 0.20,
    reduced: 0.10,
    super_reduced: 0.05,
  },

  // --- Autonomous taxation on certain company costs (illustrative) ---
  ta: {
    representation: 0.10,
    per_diems: 0.05,
    undocumented: 0.50,
    bonus_excess: 0.35,
    // Combustion vehicles
    ice_under_37500: 0.10,
    ice_37500_45000: 0.25,
    ice_over_45000: 0.30,
    // Electric vehicles
    ev_under_62500: 0.00,
    ev_over_62500: 0.10,
    // Plug-in hybrids
    phev_low: 0.05,
    phev_mid: 0.10,
    phev_high: 0.15,
  },

  // --- Simplified regimes (illustrative) ---
  simplified: {
    services_coefficient: 0.75,   // deemed-taxable coefficient for services
    other_services: 0.35,
    max_revenue: 200000,
    max_balance: 500000,
    expense_justification: 0.15,  // share of revenue to be documented
    year1_reduction: 0.50,
    year2_reduction: 0.25,
    year1_coef_factor: 0.50,      // coefficient multiplier, year 1
    year2_coef_factor: 0.75,      // coefficient multiplier, year 2
  },

  // --- Meal allowance (illustrative exemption caps) ---
  meal: {
    cash_exempt: 5.00,    // €/day, cash
    card_exempt: 8.00,    // €/day, on a meal card
    days_per_month: 22,
    months_per_year: 11,
  },

  // --- Legal reserve (illustrative) ---
  reserve_legal: {
    pct: 0.05,
    max_pct_capital: 0.20,
    min_absolute: 2500,
  },

  // --- Reference rates for late-payment interest (illustrative) ---
  ecb: {
    mro: 0.02,
    deposit: 0.02,
    marginal: 0.025,
  },

  // Late-payment interest rate (illustrative)
  late_payment_interest_2026: 0.10,

  // --- Setup costs (illustrative) ---
  setup: {
    share_capital: 1000,
    empresa_na_hora: 300,
    empresa_online: 200,
    min_share_capital: 1,
    accountant_monthly_eni: 100,
    accountant_monthly_lda: 200,
    invoicing_software_monthly: 12,
    work_accident_insurance_yearly: 400,
    professional_indemnity_yearly: 450,
  },

  // Regional tax factors (structural: autonomous regions apply a reduction).
  regions: { continente: { irs: 1.0, irc: 1.0 }, acores: { irs: 0.70, irc: 0.70 }, madeira: { irs: 0.70, irc: 0.70 } },
};

export type TaxConstants = typeof T;

export const REGIONS: Record<RegionCode, Region> = {
  continente: { label_pt: 'Continente', label_en: 'Mainland', iva: [20, 10, 5] },
  acores:     { label_pt: 'Açores',     label_en: 'Azores',   iva: [16, 9, 4] },
  madeira:    { label_pt: 'Madeira',    label_en: 'Madeira',  iva: [18, 10, 5] }
};
