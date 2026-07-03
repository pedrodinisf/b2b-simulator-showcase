import type { Browser } from 'playwright';

// Render the report HTML to a PDF via a lazily-launched, shared chromium instance.
// The chromium binary must be present (dev: `pnpm exec playwright install chromium`;
// container: baked into the image). Everything here is best-effort and time-bounded:
// callers fall back to a link-less email if it throws, and nothing blocks the request
// for long even if chromium is slow/missing/blocked.
const LAUNCH_TIMEOUT_MS = 12_000;
const OP_TIMEOUT_MS = 12_000;

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
	if (!browserPromise) {
		const p = (async () => {
			const { chromium } = await import('playwright');
			return chromium.launch({ args: ['--no-sandbox'], timeout: LAUNCH_TIMEOUT_MS });
		})();
		// Self-heal: if the launch fails (chromium missing/slow/blocked), drop the cached
		// promise so the next request retries instead of being stuck with a dead browser.
		p.catch(() => {
			if (browserPromise === p) browserPromise = null;
		});
		browserPromise = p;
	}
	return browserPromise;
}

export async function renderReportPdf(html: string): Promise<Uint8Array> {
	const browser = await getBrowser();
	let page;
	try {
		page = await browser.newPage();
	} catch (e) {
		browserPromise = null; // browser died between launch and use → relaunch next time
		throw e;
	}
	try {
		await page.setContent(html, { waitUntil: 'load', timeout: OP_TIMEOUT_MS });
		return await page.pdf({
			format: 'A4',
			printBackground: true,
			margin: { top: '14mm', bottom: '14mm', left: '12mm', right: '12mm' }
		});
	} finally {
		await page.close().catch(() => {});
	}
}
