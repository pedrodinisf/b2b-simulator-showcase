import { describe, it, expect } from 'vitest';
import { DEFAULT_PARAMS, type SimParams } from '@b2bsim/engine';
import { encodeParams, applyEncoded, SHARE_KEYS } from '../src/lib/share.ts';

const clone = (): SimParams => structuredClone(DEFAULT_PARAMS);

describe('shareable scenario URL', () => {
	it('round-trips the whitelisted params + expenses', () => {
		const src = clone();
		src.hourlyRate = 72;
		src.salary = 3100;
		src.municipality = 'porto';
		src.dividendMethodMode = 'englobamento';
		src.clientLocation = 'UE';
		src.ss_first_year_exempt = false;
		src.mealCard = false;
		src.expenses.rent = 850;
		src.expenses.software = 210;

		const encoded = encodeParams(src);
		const out = clone();
		applyEncoded(encoded, out);

		for (const k of SHARE_KEYS) expect(out[k]).toEqual(src[k]);
		expect(out.expenses).toEqual(src.expenses);
	});

	it('round-trips a custom municipality', () => {
		const src = clone();
		src.municipality = 'custom';
		src.customMuni = { region: 'acores', derramaRate: 0.01, derramaReducedRate: 0, derramaThreshold: 50000, participacaoDevolution: 0.03 };
		const out = clone();
		applyEncoded(encodeParams(src), out);
		expect(out.municipality).toBe('custom');
		expect(out.customMuni).toEqual(src.customMuni);
	});

	it('clamps out-of-range values', () => {
		const src = clone();
		src.hourlyRate = 99999;
		src.hoursPerDay = 99;
		const out = clone();
		applyEncoded(encodeParams(src), out);
		expect(out.hourlyRate).toBe(200);
		expect(out.hoursPerDay).toBe(12);
	});

	it('falls back to lisboa for an unknown municipality', () => {
		const src = clone();
		const tampered = encodeParams({ ...src, municipality: 'zzz-nope' as string });
		const out = clone();
		applyEncoded(tampered, out);
		expect(out.municipality).toBe('lisboa');
	});

	it('leaves defaults untouched on a malformed hash', () => {
		const out = clone();
		applyEncoded('!!!not-base64!!!', out);
		expect(out).toEqual(DEFAULT_PARAMS);
	});
});
