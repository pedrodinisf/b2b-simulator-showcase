import { createAuthClient } from 'better-auth/svelte';
import { magicLinkClient } from 'better-auth/client/plugins';

// Browser client. No baseURL: it defaults to the current origin, which serves the
// /api/auth/* endpoints (mounted in hooks.server.ts via svelteKitHandler).
export const authClient = createAuthClient({
	plugins: [magicLinkClient()]
});
