import type { Municipality } from './types.ts';

// ⚠️ ILLUSTRATIVE SAMPLE DATA — NOT real municipal surtax figures.
//
// The production instance ships a full, source-cited dataset of every Portuguese
// municipality. This public showcase keeps only a small sample with made-up round
// rates, purely so the picker, the regional logic and the demo work. Do not rely
// on any number here. `lisboa` is retained because it is the default municipality
// in the parameter defaults.
export const MUNICIPALITIES: Municipality[] = [
  { code: "lisboa",            name: "Lisboa",            district: "Lisboa",   region: "continente", derramaRate: 0.015,  derramaReducedRate: 0,      derramaThreshold: 150000, participacaoDevolution: 0.05, src: "Illustrative sample data", year: 2026 },
  { code: "porto",             name: "Porto",             district: "Porto",    region: "continente", derramaRate: 0.015,  derramaReducedRate: 0,      derramaThreshold: 150000, participacaoDevolution: 0,    src: "Illustrative sample data", year: 2026 },
  { code: "coimbra",           name: "Coimbra",           district: "Coimbra",  region: "continente", derramaRate: 0.014,  derramaReducedRate: 0.007,  derramaThreshold: 150000, participacaoDevolution: 0,    src: "Illustrative sample data", year: 2026 },
  { code: "braga",             name: "Braga",             district: "Braga",    region: "continente", derramaRate: 0.013,  derramaReducedRate: 0,      derramaThreshold: 150000, participacaoDevolution: 0,    src: "Illustrative sample data", year: 2026 },
  { code: "aveiro",            name: "Aveiro",            district: "Aveiro",   region: "continente", derramaRate: 0.009,  derramaReducedRate: 0,      derramaThreshold: 150000, participacaoDevolution: 0,    src: "Illustrative sample data", year: 2026 },
  { code: "faro",              name: "Faro",              district: "Faro",     region: "continente", derramaRate: 0.008,  derramaReducedRate: 0,      derramaThreshold: 150000, participacaoDevolution: 0,    src: "Illustrative sample data", year: 2026 },
  { code: "setubal",           name: "Setúbal",           district: "Setúbal",  region: "continente", derramaRate: 0.015,  derramaReducedRate: 0,      derramaThreshold: 150000, participacaoDevolution: 0,    src: "Illustrative sample data", year: 2026 },
  { code: "leiria",            name: "Leiria",            district: "Leiria",   region: "continente", derramaRate: 0.010,  derramaReducedRate: 0.005,  derramaThreshold: 150000, participacaoDevolution: 0,    src: "Illustrative sample data", year: 2026 },
  { code: "viseu",             name: "Viseu",             district: "Viseu",    region: "continente", derramaRate: 0.0125, derramaReducedRate: 0,      derramaThreshold: 150000, participacaoDevolution: 0,    src: "Illustrative sample data", year: 2026 },
  { code: "evora",             name: "Évora",             district: "Évora",    region: "continente", derramaRate: 0.015,  derramaReducedRate: 0,      derramaThreshold: 150000, participacaoDevolution: 0,    src: "Illustrative sample data", year: 2026 },
  { code: "guarda",            name: "Guarda",            district: "Guarda",   region: "continente", derramaRate: 0,      derramaReducedRate: 0,      derramaThreshold: 0,      participacaoDevolution: 0,    src: "Illustrative sample data", year: 2026 },
  { code: "braganca",          name: "Bragança",          district: "Bragança", region: "continente", derramaRate: 0.010,  derramaReducedRate: 0,      derramaThreshold: 150000, participacaoDevolution: 0,    src: "Illustrative sample data", year: 2026 },
  { code: "ponta-delgada",     name: "Ponta Delgada",     district: "Açores",   region: "acores",     derramaRate: 0.010,  derramaReducedRate: 0,      derramaThreshold: 150000, participacaoDevolution: 0,    src: "Illustrative sample data", year: 2026 },
  { code: "angra-do-heroismo", name: "Angra do Heroísmo", district: "Açores",   region: "acores",     derramaRate: 0.010,  derramaReducedRate: 0,      derramaThreshold: 150000, participacaoDevolution: 0,    src: "Illustrative sample data", year: 2026 },
  { code: "funchal",           name: "Funchal",           district: "Madeira",  region: "madeira",    derramaRate: 0.012,  derramaReducedRate: 0,      derramaThreshold: 150000, participacaoDevolution: 0,    src: "Illustrative sample data", year: 2026 },
];

export const MUNI_BY_CODE: Record<string, Municipality> =
  Object.fromEntries(MUNICIPALITIES.map((x) => [x.code, x] as const));
