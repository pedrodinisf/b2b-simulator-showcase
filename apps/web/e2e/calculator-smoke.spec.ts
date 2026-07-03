import { test, expect } from '@playwright/test';

// General client-crash guard for the calculator: exercises the path unit tests can't reach —
// client reactivity after a server recompute, then client-side tab navigation. It asserts the
// app stays functional and throws no uncaught exceptions (e.g. the structuredClone/DataCloneError
// freeze fixed by snapshotting the $state proxy in Results/Resumo). Runs against the dev server,
// where such client crashes surface. Note: that specific DataCloneError only reproduced in the
// reporter's extension-loaded Chrome, not in clean headless chromium — so this is a broad guard,
// not a targeted repro of that one case.
test('calculator survives an input change + client-side tab navigation', async ({ page }) => {
	const pageErrors: string[] = [];
	const consoleErrors: string[] = [];
	page.on('pageerror', (e) => pageErrors.push(e.message));
	page.on('console', (m) => {
		if (m.type() === 'error') consoleErrors.push(m.text());
	});

	await page.goto('/pt');

	// Change the hourly rate → debounced recompute → calc.currentResult becomes a $state proxy,
	// and Results re-renders from it (the exact derived that used to throw).
	const rate = page.locator('input[type=number]').first();
	await rate.fill('70');
	await rate.blur();

	// The recompute landing (revenue 123,200 for 70/h × 8 × 220) proves the proxy re-render
	// succeeded — with the bug, the derived throws and the figure never updates.
	await expect(page.locator('body')).toContainText(/123.?200/, { timeout: 8000 });

	// Client-side nav preserves the store (a full reload would reset it), so click the tab links:
	// other tab → back to the Simulator → Resumo, all rendering from the preserved proxy.
	await page.locator('a.tab-btn[href="/pt/concepts"]').click();
	await expect(page).toHaveURL(/\/pt\/concepts$/);
	await page.locator('a.tab-btn[href="/pt"]').click();
	await expect(page).toHaveURL(/\/pt$/);
	await page.locator('a.tab-btn[href="/pt/resumo"]').click();
	await expect(page).toHaveURL(/\/pt\/resumo$/);

	// Resumo still renders (not frozen).
	await expect(page.locator('body')).toContainText('ENI');

	// No uncaught exceptions during the whole flow (a DataCloneError would land here), and
	// specifically no structuredClone/clone regression in any log.
	expect(pageErrors, pageErrors.join('\n')).toEqual([]);
	const clone = [...pageErrors, ...consoleErrors].filter((e) => /DataCloneError|could not be cloned|structuredClone/i.test(e));
	expect(clone, clone.join('\n')).toEqual([]);
});
