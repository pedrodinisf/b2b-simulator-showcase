import { mkdir, writeFile, readFile, readdir, stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

// Served report PDFs live on disk (the app volume in prod) and are handed out via a
// tokenised download link, then swept after RETENTION. The simulation data itself is
// in the DB (email_subscriber.params_json), so the PDF is a disposable artifact.

export const RETENTION_MS = 3 * 24 * 60 * 60 * 1000; // 3 days
const TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function reportsDir(): string {
	return process.env.REPORTS_DIR || '.reports';
}

// Write the PDF and return an unguessable token. The filename is the token, so the
// strict TOKEN_RE on read is the only guard needed against path traversal.
export async function saveReport(bytes: Uint8Array, dir = reportsDir()): Promise<string> {
	await mkdir(dir, { recursive: true });
	const token = randomUUID();
	await writeFile(join(dir, token + '.pdf'), bytes);
	return token;
}

// Return the PDF bytes for a token, or null if the token is malformed, missing, or expired-and-swept.
export async function readReport(token: string, dir = reportsDir()): Promise<Uint8Array | null> {
	if (!TOKEN_RE.test(token)) return null;
	try {
		return await readFile(join(dir, token + '.pdf'));
	} catch {
		return null;
	}
}

// Delete PDFs older than maxAgeMs (by mtime). Returns the number removed.
export async function cleanupOldReports(maxAgeMs = RETENTION_MS, dir = reportsDir()): Promise<number> {
	let files: string[];
	try {
		files = await readdir(dir);
	} catch {
		return 0; // dir not created yet → nothing to clean
	}
	const now = Date.now();
	let removed = 0;
	for (const f of files) {
		if (!f.endsWith('.pdf')) continue;
		const p = join(dir, f);
		try {
			const s = await stat(p);
			if (now - s.mtimeMs > maxAgeMs) {
				await unlink(p);
				removed++;
			}
		} catch {
			/* raced with another sweep / already gone */
		}
	}
	return removed;
}

// Run the sweep once on startup and every 12h. Idempotent (guarded), unref'd so it
// never keeps the process alive, and a no-op if it throws. Called from hooks.server.
let scheduled = false;
export function scheduleReportCleanup(): void {
	if (scheduled) return;
	scheduled = true;
	const run = () =>
		cleanupOldReports()
			.then((n) => {
				if (n) console.log(`[reports] swept ${n} expired PDF(s)`);
			})
			.catch(() => {});
	run();
	const timer = setInterval(run, 12 * 60 * 60 * 1000);
	if (typeof timer.unref === 'function') timer.unref();
}
