import { I18N } from './messages.ts';

export type Lang = 'pt' | 'en';
export type MessageKey = keyof (typeof I18N)['pt'];

const catalog = I18N as Record<Lang, Record<string, string>>;

// Ported from index.html t(): look up a UI string, falling back to PT, then to the key.
export function t(lang: Lang, key: string): string {
  const d = catalog[lang] || catalog.pt;
  if (d[key] !== undefined) return d[key];
  return catalog.pt[key] !== undefined ? catalog.pt[key] : key;
}

// Ported from index.html tf(): t() with {placeholder} substitution.
export function tf(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  let s = t(lang, key);
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(String(vars[k]));
  return s;
}

// Ported from index.html pick(): choose the active language's prose/data block.
export function pick<T>(lang: Lang, pt: T, en: T): T {
  return lang === 'en' ? en : pt;
}
