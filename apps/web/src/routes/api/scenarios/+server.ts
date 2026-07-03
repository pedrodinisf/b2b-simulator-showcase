import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { listScenarios, createScenario, deleteScenario } from '$lib/server/scenarios';
import type { RequestHandler } from './$types';

// Saved scenarios CRUD (own-only, see $lib/server/scenarios for the authorization
// logic). locals.user comes from the session, never from client input.

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json({ ok: false, error: 'unauthorized' }, { status: 401 });
	return json({ scenarios: await listScenarios(db, locals.user.id) });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ ok: false, error: 'unauthorized' }, { status: 401 });

	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return new Response(null, { status: 400 });
	}

	const name = typeof body.name === 'string' ? body.name : '';
	const lang = body.lang === 'en' ? 'en' : 'pt';
	const scenario = await createScenario(db, { userId: locals.user.id, name, lang, params: body.params });
	if (!scenario) return json({ ok: false, error: 'name_required' }, { status: 400 });

	return json({ scenario }, { status: 201 });
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) return json({ ok: false, error: 'unauthorized' }, { status: 401 });

	const id = Number(url.searchParams.get('id'));
	if (!Number.isInteger(id) || id <= 0) return json({ ok: false, error: 'invalid_id' }, { status: 400 });

	const ok = await deleteScenario(db, { id, userId: locals.user.id });
	if (!ok) return json({ ok: false, error: 'not_found' }, { status: 404 });
	return json({ ok: true });
};
