import type { EmailSender, EmailMessage } from './index';

// Generic HTTP driver targeting a Resend-compatible JSON API:
//   POST <endpoint>  Authorization: Bearer <key>
//   { from, to:[...], subject, html, text?, attachments:[{ filename, content(base64), content_type }] }
// The endpoint is configurable, so other providers can be pointed at it (some
// need a thin field-name shim, documented in the deployment notes). No SDK dependency.
export class HttpEmailSender implements EmailSender {
	readonly name = 'http';
	constructor(private readonly cfg: { endpoint: string; apiKey: string; from: string }) {}

	async send(msg: EmailMessage): Promise<void> {
		const body: Record<string, unknown> = {
			from: msg.from || this.cfg.from,
			to: [msg.to],
			subject: msg.subject,
			html: msg.html
		};
		if (msg.text) body.text = msg.text;
		if (msg.attachments?.length) {
			body.attachments = msg.attachments.map((a) => ({
				filename: a.filename,
				content: Buffer.from(a.content).toString('base64'),
				content_type: a.contentType
			}));
		}
		const res = await fetch(this.cfg.endpoint, {
			method: 'POST',
			headers: { 'content-type': 'application/json', authorization: `Bearer ${this.cfg.apiKey}` },
			body: JSON.stringify(body)
		});
		if (!res.ok) {
			const detail = await res.text().catch(() => '');
			throw new Error(`email send failed: ${res.status} ${detail.slice(0, 300)}`);
		}
	}
}
