import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { magicLink } from 'better-auth/plugins';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { user, session, account, verification } from '$lib/server/db/schema';
import { createEmailSender } from '$lib/server/email';
import { buildMagicLinkEmail, langFromCallbackURL } from './magic-link';

// Better Auth instance: magic-link only (no passwords, no OAuth), Drizzle/libsql
// adapter over the existing db, cookies via SvelteKit. Secrets (BETTER_AUTH_SECRET,
// BETTER_AUTH_URL) come from the VPS .env; magic-link mail reuses the email seam.
export const auth = betterAuth({
	secret: env.BETTER_AUTH_SECRET,
	baseURL: env.BETTER_AUTH_URL,
	trustedOrigins: env.BETTER_AUTH_URL ? [env.BETTER_AUTH_URL] : undefined,
	database: drizzleAdapter(db, {
		provider: 'sqlite',
		schema: { user, session, account, verification }
	}),
	plugins: [
		magicLink({
			expiresIn: 300, // 5 minutes
			sendMagicLink: async ({ email, url }) => {
				const lang = langFromCallbackURL(url);
				const sender = createEmailSender({
					driver: env.EMAIL_DRIVER,
					endpoint: env.EMAIL_ENDPOINT,
					apiKey: env.EMAIL_API_KEY,
					from: env.EMAIL_FROM
				});
				await sender.send(buildMagicLinkEmail(email, url, lang));
			}
		}),
		// Must stay last: propagates Set-Cookie when auth.api.* runs in load/actions.
		sveltekitCookies(getRequestEvent)
	]
});
