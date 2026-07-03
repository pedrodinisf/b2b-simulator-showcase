import { describe, it, expect } from 'vitest';
import { hasProAccess, isFreeForAll } from '../src/lib/server/auth/entitlement.ts';

const now = new Date('2026-07-01T00:00:00Z');
const user = { id: 'u1' };

describe('hasProAccess', () => {
	it('launch flag grants Pro to everyone, including anonymous', () => {
		expect(hasProAccess({ flagFreeForAll: true, user: null, entitlement: null, now })).toBe(true);
	});

	it('flag off + no user → denied', () => {
		expect(hasProAccess({ flagFreeForAll: false, user: null, entitlement: null, now })).toBe(false);
	});

	it('flag off + user but no entitlement → denied', () => {
		expect(hasProAccess({ flagFreeForAll: false, user, entitlement: null, now })).toBe(false);
	});

	it('flag off + active entitlement with no expiry → allowed', () => {
		expect(hasProAccess({ flagFreeForAll: false, user, entitlement: { status: 'active', currentPeriodEnd: null }, now })).toBe(true);
	});

	it('flag off + active entitlement not yet expired → allowed', () => {
		expect(hasProAccess({ flagFreeForAll: false, user, entitlement: { status: 'active', currentPeriodEnd: '2026-08-01T00:00:00Z' }, now })).toBe(true);
	});

	it('flag off + expired entitlement → denied', () => {
		expect(hasProAccess({ flagFreeForAll: false, user, entitlement: { status: 'active', currentPeriodEnd: '2026-06-01T00:00:00Z' }, now })).toBe(false);
	});

	it('flag off + non-active status → denied', () => {
		expect(hasProAccess({ flagFreeForAll: false, user, entitlement: { status: 'canceled', currentPeriodEnd: null }, now })).toBe(false);
	});
});

describe('isFreeForAll (fails open to free)', () => {
	it('grants Pro when the flag is unset', () => {
		expect(isFreeForAll(undefined)).toBe(true);
	});

	it('grants Pro for any value other than "false"', () => {
		expect(isFreeForAll('true')).toBe(true);
		expect(isFreeForAll('1')).toBe(true);
		expect(isFreeForAll('')).toBe(true);
	});

	it('only "false" switches on real entitlement checks', () => {
		expect(isFreeForAll('false')).toBe(false);
	});
});
