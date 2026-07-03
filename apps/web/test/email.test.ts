import { describe, it, expect, vi } from 'vitest';
import { createEmailSender } from '../src/lib/server/email/index.ts';

describe('email sender factory', () => {
	it('defaults to the log driver when unconfigured', () => {
		expect(createEmailSender({}).name).toBe('log');
		expect(createEmailSender({ driver: 'http' }).name).toBe('log'); // no apiKey → fall back to log
	});

	it('uses the http driver when a key is present', () => {
		expect(createEmailSender({ driver: 'http', apiKey: 'k' }).name).toBe('http');
	});
});

describe('http email driver', () => {
	it('POSTs to the endpoint with bearer auth and the message body', async () => {
		const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: '1' }), { status: 200 }));
		vi.stubGlobal('fetch', fetchMock);
		const sender = createEmailSender({ driver: 'http', apiKey: 'secret', endpoint: 'https://example.com/send', from: 'a@b.co' });

		await sender.send({ to: 'x@y.co', subject: 'Hi', html: '<p>Hi</p>' });

		expect(fetchMock).toHaveBeenCalledOnce();
		const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('https://example.com/send');
		expect((init.headers as Record<string, string>).authorization).toBe('Bearer secret');
		const parsed = JSON.parse(init.body as string);
		expect(parsed.to).toEqual(['x@y.co']);
		expect(parsed.from).toBe('a@b.co');
		expect(parsed.subject).toBe('Hi');
		vi.unstubAllGlobals();
	});

	it('throws on a non-2xx response', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => new Response('bad', { status: 500 })));
		const sender = createEmailSender({ driver: 'http', apiKey: 'k' });
		await expect(sender.send({ to: 'x@y.co', subject: 's', html: 'h' })).rejects.toThrow(/email send failed/);
		vi.unstubAllGlobals();
	});
});
