import { LogEmailSender } from './log';
import { HttpEmailSender } from './http';

export interface EmailAttachment {
	filename: string;
	content: Uint8Array;
	contentType: string;
}

export interface EmailMessage {
	to: string;
	subject: string;
	html: string;
	text?: string;
	from?: string;
	attachments?: EmailAttachment[];
}

// A provider-agnostic email transport. Drivers implement send(); the report/auth
// code depends only on this interface, so a managed provider is wired at deploy
// time (via env) without touching call sites.
export interface EmailSender {
	readonly name: string;
	send(msg: EmailMessage): Promise<void>;
}

export interface EmailConfig {
	driver?: string | null; // 'log' (default) | 'http'
	endpoint?: string | null; // http driver: full URL (defaults to Resend's)
	apiKey?: string | null; // http driver: bearer token
	from?: string | null; // default From address
}

const DEFAULT_FROM = 'B2B Simulator <onboarding@resend.dev>';
const DEFAULT_ENDPOINT = 'https://api.resend.com/emails';

// Pure factory: the route reads config from $env and passes it here (keeping this
// module import-safe for unit tests). Falls back to the log driver whenever the
// HTTP driver is not fully configured, so the whole flow works in dev with no
// external provider — nothing throws at boot.
export function createEmailSender(cfg: EmailConfig = {}): EmailSender {
	const from = cfg.from || DEFAULT_FROM;
	if (cfg.driver === 'http' && cfg.apiKey) {
		return new HttpEmailSender({ endpoint: cfg.endpoint || DEFAULT_ENDPOINT, apiKey: cfg.apiKey, from });
	}
	return new LogEmailSender(from);
}
