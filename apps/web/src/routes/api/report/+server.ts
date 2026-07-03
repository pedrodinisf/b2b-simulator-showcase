import { json } from '@sveltejs/kit';
import { gte, count } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { getActiveDataset, db, schema } from '$lib/server/db';
import { simulate } from '@b2bsim/engine';
import { clampParams } from '$lib/params';
import { renderReport } from '$lib/server/report/render';
import { renderReportPdf } from '$lib/server/report/pdf';
import { saveReport } from '$lib/server/reports/store';
import { createEmailSender } from '$lib/server/email';
import type { RequestHandler } from './$types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Crude in-memory abuse guard (email bombing): a submitter can send the report to
// any address they type, so cap sends per client IP per window. A proper limiter
// belongs at the proxy/provider; this is the floor.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
	const now = Date.now();
	const arr = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
	arr.push(now);
	hits.set(ip, arr);
	return arr.length > MAX_PER_WINDOW;
}

// Global send caps (defence against distributed abuse burning the provider quota / cost).
// Counted from email_subscriber rows in rolling windows; defaults sit safely under Resend's
// free tier (100/day, 3,000/month). Once hit, we refuse to send — never calling the provider.
async function overSendCap(): Promise<{ over: boolean; day: number; month: number; dailyCap: number; monthlyCap: number }> {
	const dailyCap = Number(env.EMAIL_DAILY_CAP) || 80;
	const monthlyCap = Number(env.EMAIL_MONTHLY_CAP) || 2500;
	const dayCut = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
	const monthCut = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
	const [d] = await db.select({ n: count() }).from(schema.emailSubscriber).where(gte(schema.emailSubscriber.createdAt, dayCut));
	const [m] = await db.select({ n: count() }).from(schema.emailSubscriber).where(gte(schema.emailSubscriber.createdAt, monthCut));
	const day = d?.n ?? 0;
	const month = m?.n ?? 0;
	return { over: day >= dailyCap || month >= monthlyCap, day, month, dailyCap, monthlyCap };
}

// Email the branded report immediately (transactional — the user asked for it).
// Double opt-in (confirm token) gates ONLY the ongoing law-change alerts list.
export const POST: RequestHandler = async ({ request, url, getClientAddress }) => {
	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return new Response(null, { status: 400 });
	}

	const email = typeof body.email === 'string' ? body.email.trim().slice(0, 254) : '';
	if (!EMAIL_RE.test(email)) return json({ ok: false, error: 'invalid_email' }, { status: 400 });

	let ip = 'unknown';
	try {
		ip = getClientAddress();
	} catch {
		/* no address available (e.g. some test contexts) */
	}
	if (rateLimited(ip)) return json({ ok: false, error: 'rate_limited' }, { status: 429 });

	// Hard global ceiling so abuse can't drain the provider quota (or run up cost). Fails open
	// on a DB error — the provider's own cap is the ultimate backstop.
	try {
		const cap = await overSendCap();
		if (cap.over) {
			console.warn(`[api/report] send cap reached (day ${cap.day}/${cap.dailyCap}, month ${cap.month}/${cap.monthlyCap}) — refusing to send`);
			return json({ ok: false, error: 'quota' }, { status: 429 });
		}
	} catch (e) {
		console.warn('[api/report] cap check failed, proceeding:', (e as Error).message);
	}

	const lang = body.lang === 'en' ? 'en' : 'pt';
	const source = typeof body.source === 'string' ? body.source.slice(0, 32) : 'report';
	const alertsConsent = !!body.alertsConsent;
	const params = clampParams(body.params);

	const dataset = await getActiveDataset();
	let result;
	try {
		result = simulate(params, dataset);
	} catch {
		return json({ ok: false, error: 'compute_failed' }, { status: 400 });
	}

	// One token per row, issued only for the alerts list; it backs both the
	// confirm (double opt-in) and the unsubscribe links.
	const confirmToken = alertsConsent ? crypto.randomUUID() : null;
	try {
		await db.insert(schema.emailSubscriber).values({
			email,
			lang,
			source,
			paramsJson: JSON.stringify(params),
			alertsConsent,
			confirmToken,
			confirmedAt: null,
			unsubscribedAt: null,
			createdAt: new Date().toISOString()
		});
	} catch {
		/* storing the subscriber must not block the transactional report */
	}

	const confirmUrl = confirmToken ? `${url.origin}/${lang}/report/confirm?token=${confirmToken}` : undefined;
	const unsubscribeUrl = confirmToken ? `${url.origin}/${lang}/unsubscribe?token=${confirmToken}` : undefined;
	const consultationUrl = env.CONSULTATION_URL || undefined;

	// Render a clean, link-free PDF, store it on the app volume, and hand out a tokenised
	// download link (swept after 3 days — the sim data stays in the DB). Best-effort: if
	// chromium is unavailable the email still goes out, just without the download button.
	let downloadUrl: string | undefined;
	try {
		const printable = renderReport({ lang, params, result, consultationUrl });
		const pdf = await renderReportPdf(printable.html);
		const token = await saveReport(pdf);
		downloadUrl = `${url.origin}/api/report/download?token=${token}`;
	} catch (e) {
		console.warn('[api/report] PDF generation/storage failed, sending without a download link:', (e as Error).message);
	}

	const report = renderReport({ lang, params, result, downloadUrl, confirmUrl, unsubscribeUrl, consultationUrl });
	const sender = createEmailSender({
		driver: env.EMAIL_DRIVER,
		endpoint: env.EMAIL_ENDPOINT,
		apiKey: env.EMAIL_API_KEY,
		from: env.EMAIL_FROM
	});
	try {
		await sender.send({ to: email, subject: report.subject, html: report.html, text: report.text });
	} catch (e) {
		console.error('[api/report] send failed:', (e as Error).message);
		return json({ ok: false, error: 'send_failed' }, { status: 502 });
	}

	console.log(`[api/report] report emailed to ${email} (driver=${sender.name}${downloadUrl ? ', pdf link' : ', no pdf'})`);
	return json({ ok: true });
};
