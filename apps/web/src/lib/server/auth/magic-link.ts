import { t, type Lang } from '@b2bsim/content';
import type { EmailMessage } from '../email';

// Pure helpers for the magic-link email. Kept free of $-aliases/DB so they are
// unit-testable; the auth instance (./index.ts) wires them to $env + the email seam.

// Derive the UI language from the magic-link's callbackURL (the client sends the
// current /pt or /en path). Defaults to 'pt'.
export function langFromCallbackURL(url: string): Lang {
	try {
		const cb = new URL(url).searchParams.get('callbackURL') ?? '';
		const path = cb.replace(/^https?:\/\/[^/]+/, ''); // tolerate absolute callbackURLs
		return /^\/?en(\/|$)/.test(path) ? 'en' : 'pt';
	} catch {
		return 'pt';
	}
}

const escapeHtml = (s: string) =>
	s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Build the transactional magic-link email. `url` is the fully-built verify link
// (Better Auth constructs it via URLSearchParams, so it is already percent-encoded);
// we HTML-escape it anyway so the builder stays safe independent of upstream, then
// wrap it in localized copy. The i18n strings are static/trusted.
export function buildMagicLinkEmail(to: string, url: string, lang: Lang): EmailMessage {
	const subject = t(lang, 'auth_ml_subject');
	const heading = t(lang, 'auth_ml_heading');
	const body = t(lang, 'auth_ml_body');
	const button = t(lang, 'auth_ml_button');
	const expiry = t(lang, 'auth_ml_expiry');
	const ignore = t(lang, 'auth_ml_ignore');
	const safeUrl = escapeHtml(url);

	const html = `<!doctype html>
<html lang="${lang}">
<body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a1a1a;line-height:1.5">
<h1 style="font-size:20px;margin:0 0 16px">${heading}</h1>
<p style="margin:0 0 16px">${body}</p>
<p style="margin:24px 0"><a href="${safeUrl}" style="background:#1a1a1a;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600">${button}</a></p>
<p style="color:#666;font-size:14px;margin:0 0 4px">${expiry}</p>
<p style="color:#666;font-size:14px;margin:0 0 16px">${ignore}</p>
<p style="color:#999;font-size:13px;word-break:break-all;margin:0">${safeUrl}</p>
</body>
</html>`;

	const text = `${heading}\n\n${body}\n\n${url}\n\n${expiry}\n${ignore}`;

	return { to, subject, html, text };
}
