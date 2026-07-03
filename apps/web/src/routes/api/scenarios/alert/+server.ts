import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { subscribeToAlerts, unsubscribeFromAlerts } from '$lib/server/alertSubscriptions';
import type { RequestHandler } from './$types';

// Subscribe/unsubscribe a saved scenario to law-change alerts (own-only). The
// subscriber's email always comes from the session (locals.user.email), never
// from client input — see $lib/server/alertSubscriptions for the ownership check.

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ ok: false, error: 'unauthorized' }, { status: 401 });

	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return new Response(null, { status: 400 });
	}
	const savedScenarioId = Number(body.savedScenarioId);
	if (!Number.isInteger(savedScenarioId) || savedScenarioId <= 0) return json({ ok: false, error: 'invalid_id' }, { status: 400 });

	const sub = await subscribeToAlerts(db, { userId: locals.user.id, savedScenarioId, email: locals.user.email });
	if (!sub) return json({ ok: false, error: 'not_found' }, { status: 404 });
	return json({ ok: true }, { status: 201 });
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) return json({ ok: false, error: 'unauthorized' }, { status: 401 });

	const savedScenarioId = Number(url.searchParams.get('savedScenarioId'));
	if (!Number.isInteger(savedScenarioId) || savedScenarioId <= 0) return json({ ok: false, error: 'invalid_id' }, { status: 400 });

	const ok = await unsubscribeFromAlerts(db, { userId: locals.user.id, savedScenarioId });
	if (!ok) return json({ ok: false, error: 'not_found' }, { status: 404 });
	return json({ ok: true });
};
