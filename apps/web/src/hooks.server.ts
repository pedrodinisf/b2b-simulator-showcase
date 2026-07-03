import { sequence } from '@sveltejs/kit/hooks';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/environment';
import type { Handle } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { scheduleReportCleanup } from '$lib/server/reports/store';

// Runs once at server start: periodically sweep expired report PDFs off the volume
// (retention ~3 days; the simulation data itself stays in the DB).
scheduleReportCleanup();

// Mount Better Auth's /api/auth/* endpoints. For an auth path this handles the
// request and returns immediately; otherwise it passes through to the rest of the
// chain. Kept first so auth requests skip session resolution + the lang transform.
const authApi: Handle = ({ event, resolve }) => svelteKitHandler({ event, resolve, auth, building });

// Resolve the session once per request and expose the user/session on locals for
// route guards (requirePro) and pages.
const authSession: Handle = async ({ event, resolve }) => {
	const s = await auth.api.getSession({ headers: event.request.headers });
	event.locals.user = s?.user ?? null;
	event.locals.session = s?.session ?? null;
	return resolve(event);
};

// Set <html lang> per locale for SEO/a11y (app.html has lang="%lang%").
const langHtml: Handle = ({ event, resolve }) => {
	const lang = event.url.pathname.startsWith('/en') ? 'en' : 'pt';
	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', lang)
	});
};

export const handle = sequence(authApi, authSession, langHtml);
