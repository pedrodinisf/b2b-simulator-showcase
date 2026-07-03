import type { EmailSender, EmailMessage } from './index';

// Dev/no-op driver: logs the message instead of sending it. This is the default
// whenever no managed provider is configured, so the report flow is fully
// exercisable end-to-end without any external service.
export class LogEmailSender implements EmailSender {
	readonly name = 'log';
	constructor(private readonly from: string) {}

	async send(msg: EmailMessage): Promise<void> {
		const atts =
			msg.attachments?.map((a) => `${a.filename} (${a.contentType}, ${a.content.byteLength}B)`).join(', ') || 'none';
		console.log(
			`[email:log] from=${msg.from || this.from} to=${msg.to} subject=${JSON.stringify(msg.subject)} attachments=[${atts}]`
		);
		const preview = msg.html.slice(0, 2000);
		console.log(`[email:log] html (${msg.html.length} chars):\n${preview}${msg.html.length > 2000 ? '\n…[truncated]' : ''}`);
	}
}
