import { readReport } from '$lib/server/reports/store';
import type { RequestHandler } from './$types';

// Serve a stored report PDF by its tokenised link. Returns 404 once the file has
// been swept (retention ~3 days) or if the token is malformed/unknown.
export const GET: RequestHandler = async ({ url }) => {
	const token = url.searchParams.get('token') ?? '';
	const bytes = await readReport(token);
	if (!bytes) return new Response('Not found or expired', { status: 404 });
	// Copy into a fresh ArrayBuffer-backed view so the body type matches BodyInit.
	return new Response(new Uint8Array(bytes), {
		headers: {
			'content-type': 'application/pdf',
			'content-disposition': 'attachment; filename="b2b-report.pdf"',
			'cache-control': 'private, no-store'
		}
	});
};
