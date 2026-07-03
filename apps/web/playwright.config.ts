import { defineConfig } from '@playwright/test';

// Browser smoke tests (kept out of the fast Vitest unit suite). Runs against the DEV server
// on purpose: some client crashes (e.g. structuredClone on a Svelte 5 dev-mode $state proxy)
// only surface in dev, which is exactly where developers hit them.
export default defineConfig({
	testDir: 'e2e',
	workers: 1,
	retries: 0,
	reporter: 'list',
	use: { baseURL: 'http://localhost:4173' },
	webServer: {
		command: 'pnpm exec vite dev --port 4173 --strictPort',
		port: 4173,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
		env: {
			DATABASE_URL: 'file:local.db',
			ORIGIN: 'http://localhost:4173'
		}
	}
});
