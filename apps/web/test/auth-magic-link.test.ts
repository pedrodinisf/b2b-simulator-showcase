import { describe, it, expect } from 'vitest';
import { langFromCallbackURL, buildMagicLinkEmail } from '../src/lib/server/auth/magic-link.ts';

const verifyUrl = (callbackURL: string) =>
	`https://b2bsimulator.example/api/auth/magic-link/verify?token=abc123&callbackURL=${encodeURIComponent(callbackURL)}`;

describe('langFromCallbackURL', () => {
	it('reads EN from an /en callbackURL', () => {
		expect(langFromCallbackURL(verifyUrl('/en/account'))).toBe('en');
	});

	it('reads PT from a /pt callbackURL', () => {
		expect(langFromCallbackURL(verifyUrl('/pt/account'))).toBe('pt');
	});

	it('tolerates an absolute callbackURL', () => {
		expect(langFromCallbackURL(verifyUrl('https://b2bsimulator.example/en/account'))).toBe('en');
	});

	it('defaults to PT when there is no callbackURL or the url is junk', () => {
		expect(langFromCallbackURL('https://b2bsimulator.example/api/auth/magic-link/verify?token=x')).toBe('pt');
		expect(langFromCallbackURL('not a url')).toBe('pt');
	});
});

describe('buildMagicLinkEmail', () => {
	const url = verifyUrl('/en/account');

	it('addresses the recipient and embeds the verify link (html-escaped in html, raw in text)', () => {
		const msg = buildMagicLinkEmail('user@example.com', url, 'en');
		expect(msg.to).toBe('user@example.com');
		expect(msg.text).toContain(url); // plain-text: raw url
		expect(msg.html).toContain('token=abc123'); // link present in html
		expect(msg.html).toContain('&amp;callbackURL='); // the & is HTML-escaped
		expect(msg.html).not.toContain('&callbackURL='); // no raw ampersand in html
		expect(msg.subject.length).toBeGreaterThan(0);
	});

	it('localizes the copy (PT and EN subjects differ)', () => {
		const en = buildMagicLinkEmail('a@b.co', url, 'en');
		const pt = buildMagicLinkEmail('a@b.co', url, 'pt');
		expect(en.subject).not.toBe(pt.subject);
		expect(en.html).toContain('Sign in');
		expect(pt.html).toContain('Entrar');
	});
});
