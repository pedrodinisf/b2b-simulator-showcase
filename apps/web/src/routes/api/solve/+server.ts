import { json } from '@sveltejs/kit';
import { getActiveDataset } from '$lib/server/db';
import { requirePro } from '$lib/server/auth/guard';
import { simulate, type SimParams, type Dataset, type TaxConstants } from '@b2bsim/engine';
import type { RequestHandler } from './$types';

// Reverse-rate solver (server-side): binary-search the hourly rate that hits a target
// annual net for a given scenario (net is monotonic in the rate).
// Premium (Pro) feature; the launch flag grants Pro to everyone, so this is a no-op today.
export const POST: RequestHandler = async (event) => {
	await requirePro(event);
	const { request } = event;
	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return new Response(null, { status: 400 });
	}
	const params = body.params as SimParams | undefined;
	const target = typeof body.target === 'number' && isFinite(body.target) ? body.target : null;
	const key = typeof body.key === 'string' ? body.key : 'A';
	if (!params || typeof params !== 'object' || target === null) return new Response(null, { status: 400 });

	const active = await getActiveDataset();
	const dataset: Dataset = body.T && typeof body.T === 'object' ? { T: body.T as TaxConstants, MUNICIPALITIES: active.MUNICIPALITIES, REGIONS: active.REGIONS } : active;

	let lo = 10;
	let hi = 500;
	for (let i = 0; i < 40; i++) {
		const mid = (lo + hi) / 2;
		const net = simulate({ ...params, hourlyRate: mid }, dataset).scenarios[key]?.net ?? 0;
		if (net < target) lo = mid;
		else hi = mid;
	}
	return json({ rate: (lo + hi) / 2 });
};
