// Shared engine types. Kept free of imports from constants/municipalities to
// avoid cycles; those modules import from here.

export type RegionCode = 'continente' | 'acores' | 'madeira';

export interface Region {
  label_pt: string;
  label_en: string;
  iva: number[];
}

export interface Municipality {
  code: string;
  name: string;
  district: string;
  region: RegionCode;
  derramaRate: number;
  derramaReducedRate: number;
  derramaThreshold: number;
  participacaoDevolution: number;
  src: string;
  year: number;
}

export interface Expenses {
  rent: number;
  utilities: number;
  electricCar: number;
  representation: number;
  software: number;
  internet: number;
  phone: number;
  other: number;
  healthInsurance: number;
  equipment: number;
  coworking: number;
  training: number;
  profInsurance: number;
  workAccidentIns: number;
  accountantENI: number;
  accountantLda: number;
}

export interface CustomMuni {
  region: RegionCode;
  derramaRate: number;
  derramaReducedRate: number;
  derramaThreshold: number;
  participacaoDevolution: number;
}

export type DividendMethodMode = 'auto' | 'englobamento' | 'liberatoria';
export type ClientLocation = 'PT' | 'UE' | 'ForaUE';
export type Lang = 'pt' | 'en';

export interface SimParams {
  hourlyRate: number;
  hoursPerDay: number;
  daysPerYear: number;
  salary: number;
  expenses: Expenses;
  derramaRate?: number;
  ss_first_year_exempt: boolean;
  dividendMethodMode: DividendMethodMode;
  clientLocation: ClientLocation;
  municipality: string;
  customMuni?: CustomMuni;
  mealCard?: boolean;
}

// One scenario (A–H). Common fields are always present; scenario-specific fields
// (ENI coefficient/justification vs Lda salary/dividend/derrama breakdown) are
// optional. The engine builds these objects with `any` internally; this is the
// typed public view consumers read.
export interface ScenarioResult {
  name: string;
  desc: string;
  gross: number;
  net: number;
  net_monthly: number;
  total_burden: number;
  effective_rate: number;
  tax_ss: number;
  business_expenses: number;
  ss_total: number;
  irs_total: number;
  lisbon_rebate: number;
  // ENI (Simplificado A/B/C, Organizada D)
  coefficient?: number;
  taxable_from_coef?: number;
  total_expenses?: number;
  justification_required?: number;
  justification_floor?: number;
  documented_expenses?: number;
  justification_met?: number;
  justification_addback?: number;
  justification_warning?: boolean;
  taxable?: number;
  irs?: number;
  irs_solidarity?: number;
  // Lda (E/F/G/H)
  salary_monthly?: number;
  salary_annual?: number;
  ss_worker?: number;
  ss_employer?: number;
  meal_allowance?: number;
  company_expenses?: number;
  total_deductible?: number;
  unsustainable?: boolean;
  taxable_profit?: number;
  irc?: number;
  derrama?: number;
  derrama_rate?: number;
  derrama_exempt?: boolean;
  ta_representation?: number;
  ta_total?: number;
  total_company_tax?: number;
  net_profit?: number;
  reserve_legal_target?: number;
  reserve_legal_year1?: number;
  distributable?: number;
  dividends_gross?: number;
  dividend_wh?: number;
  dividends_net_wh?: number;
  salary_deduction?: number;
  salary_taxable?: number;
  irs_salary_only?: number;
  dividends_englobado?: number;
  total_taxable_eng?: number;
  irs_eng?: number;
  rebate_separate?: number;
  rebate_eng?: number;
  net_separate?: number;
  net_eng?: number;
  dividend_best_method?: 'englobamento' | 'liberatoria';
  dividend_method_delta?: number;
  dividend_method_used?: 'englobamento' | 'liberatoria';
  isCustom?: boolean;
}

export interface SimResult {
  revenue: number;
  params: SimParams;
  effectiveDerrama: number;
  lisbonRebatePct: number;
  region: RegionCode;
  derramaThreshold: number;
  muniName: string;
  scenarios: Record<string, ScenarioResult>;
  winner: string;
}
