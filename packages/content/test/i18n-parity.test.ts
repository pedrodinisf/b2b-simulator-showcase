import { describe, it, expect } from 'vitest';
import { I18N } from '../src/index.ts';

// pt and en must stay key-for-key in parity.
describe('i18n parity (pt/en key sets)', () => {
  const pt = Object.keys(I18N.pt);
  const en = Object.keys(I18N.en);

  it('neither language is missing keys', () => {
    const missingInEn = pt.filter((k) => !(k in I18N.en));
    const missingInPt = en.filter((k) => !(k in I18N.pt));
    expect({ missingInEn, missingInPt }).toEqual({ missingInEn: [], missingInPt: [] });
  });

  it('has a non-trivial number of keys', () => {
    expect(pt.length).toBeGreaterThan(150);
    expect(en.length).toBe(pt.length);
  });
});
