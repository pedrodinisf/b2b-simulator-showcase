// Number formatters (verbatim from index.html). The original read a global LANG;
// here the locale is an explicit argument (default 'pt') so formatting is pure.
import type { Lang } from './types.ts';

export function fmt(n: number, lang: Lang = 'pt'): string {
  // Locale-aware thousands separator: en-GB uses a comma, pt-PT a dot. Value is unchanged.
  return new Intl.NumberFormat(lang === 'en' ? 'en-GB' : 'pt-PT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.round(n));
}

export function fmtPct(n: number, dec = 1): string {
  return (n * 100).toFixed(dec) + '%';
}

export function fmtEur(n: number, lang: Lang = 'pt'): string {
  return '€' + fmt(n, lang);
}
