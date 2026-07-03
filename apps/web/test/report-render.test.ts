import { describe, it, expect } from 'vitest';
import { simulate, DEFAULT_PARAMS, DEFAULT_DATASET, fmtEur } from '@b2bsim/engine';
import { renderReport } from '../src/lib/server/report/render.ts';

const result = simulate(DEFAULT_PARAMS, DEFAULT_DATASET);

describe('renderReport', () => {
	it('renders a PT report with the winner and all 8 scenarios', () => {
		const { subject, html, text } = renderReport({ lang: 'pt', params: DEFAULT_PARAMS, result });
		expect(subject).toContain('ENI');
		expect(html).toContain('Recomendação');
		expect(html).toContain(result.scenarios[result.winner].name);
		for (const k of Object.keys(result.scenarios)) expect(html).toContain(result.scenarios[k].name);
		expect(html).toContain(fmtEur(result.scenarios.A.net, 'pt'));
		expect(text).toContain('Recomendação');
	});

	it('renders an EN-UK report with localised labels and no PT UI leak', () => {
		const { html } = renderReport({ lang: 'en', params: DEFAULT_PARAMS, result });
		expect(html).toContain('Recommendation');
		expect(html).toContain('Effective rate');
		expect(html).toContain('Simplified ENI, Year 1');
		expect(html).not.toContain('Recomendação');
		expect(html).not.toContain('Cenário');
	});

	it('includes the download button and link only when downloadUrl is provided', () => {
		const withLink = renderReport({ lang: 'en', params: DEFAULT_PARAMS, result, downloadUrl: 'https://x/api/report/download?token=t1' });
		const without = renderReport({ lang: 'en', params: DEFAULT_PARAMS, result });
		expect(withLink.html).toContain('Download PDF');
		expect(withLink.html).toContain('https://x/api/report/download?token=t1');
		expect(withLink.text).toContain('https://x/api/report/download?token=t1');
		expect(without.html).not.toContain('Download PDF');
	});

	it('includes the alerts-confirm CTA only when confirmUrl is provided', () => {
		const withConfirm = renderReport({ lang: 'en', params: DEFAULT_PARAMS, result, confirmUrl: 'https://x/confirm?t=abc' });
		const without = renderReport({ lang: 'en', params: DEFAULT_PARAMS, result });
		expect(withConfirm.html).toContain('Confirm alerts');
		expect(withConfirm.html).toContain('https://x/confirm?t=abc');
		expect(without.html).not.toContain('Confirm alerts');
	});

	it('does not mutate the caller result when localising to EN', () => {
		const before = result.scenarios.A.name;
		renderReport({ lang: 'en', params: DEFAULT_PARAMS, result });
		expect(result.scenarios.A.name).toBe(before);
	});
});
