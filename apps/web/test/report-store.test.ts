import { describe, it, expect } from 'vitest';
import { mkdtemp, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { saveReport, readReport, cleanupOldReports } from '../src/lib/server/reports/store.ts';

const tmp = () => mkdtemp(join(tmpdir(), 'rep-'));

describe('report store', () => {
	it('saves and reads a PDF by token', async () => {
		const dir = await tmp();
		const token = await saveReport(new Uint8Array([1, 2, 3]), dir);
		expect(token).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
		const back = await readReport(token, dir);
		expect(back && Array.from(back)).toEqual([1, 2, 3]);
	});

	it('rejects malformed tokens (no path traversal)', async () => {
		const dir = await tmp();
		await writeFile(join(dir, 'secret.pdf'), new Uint8Array([9]));
		expect(await readReport('../secret', dir)).toBeNull();
		expect(await readReport('secret', dir)).toBeNull();
		expect(await readReport('..', dir)).toBeNull();
		expect(await readReport('', dir)).toBeNull();
	});

	it('returns null for an unknown token', async () => {
		const dir = await tmp();
		expect(await readReport('00000000-0000-4000-8000-000000000000', dir)).toBeNull();
	});

	it('sweeps PDFs older than the max age and keeps fresh ones', async () => {
		const dir = await tmp();
		const fresh = await saveReport(new Uint8Array([1]), dir);
		const old = await saveReport(new Uint8Array([2]), dir);
		const past = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
		await utimes(join(dir, old + '.pdf'), past, past);

		const removed = await cleanupOldReports(3 * 24 * 60 * 60 * 1000, dir);

		expect(removed).toBe(1);
		expect(await readReport(old, dir)).toBeNull();
		expect(await readReport(fresh, dir)).not.toBeNull();
	});
});
