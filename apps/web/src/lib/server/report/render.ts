import { fmt, fmtEur, fmtPct, type SimParams, type SimResult, type Lang } from '@b2bsim/engine';
import { localiseScenarios } from '../../scenarios';

export interface ReportOptions {
	lang: Lang;
	params: SimParams;
	result: SimResult;
	downloadUrl?: string; // tokenised link to the served PDF (email version only)
	confirmUrl?: string; // present only when the user opted into law-change alerts
	unsubscribeUrl?: string;
	consultationUrl?: string;
}

export interface RenderedReport {
	subject: string;
	html: string;
	text: string;
}

function esc(s: string): string {
	return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

const BRAND = '#0b5fff';
const INK = '#1a1a1a';
const MUTED = '#666';
const LINE = '#e5e7eb';

// Branded, self-contained bilingual HTML report for the transactional email.
// Inline CSS only (email clients strip <style>/external assets). PT/EN chosen via
// pick(lang, …) so every string exists in both languages side by side.
export function renderReport(opts: ReportOptions): RenderedReport {
	const { lang, params } = opts;
	const L = <T>(pt: T, en: T): T => (lang === 'en' ? en : pt);
	// Localise scenario names/descs without mutating the caller's result.
	const result: SimResult = localiseScenarios(structuredClone(opts.result), lang, params.salary);

	const ranked = Object.entries(result.scenarios).sort((a, b) => b[1].net - a[1].net);
	const winner = result.scenarios[result.winner];
	const regionLabel = L(
		{ continente: 'Continente', acores: 'Açores', madeira: 'Madeira' },
		{ continente: 'Mainland', acores: 'Azores', madeira: 'Madeira' }
	)[result.region];

	const subject = L(
		`A tua comparação ENI vs Unipessoal Lda · ${fmtEur(result.revenue, lang)}/ano (2026)`,
		`Your ENI vs Unipessoal Lda comparison · ${fmtEur(result.revenue, lang)}/yr (2026)`
	);

	const rows = ranked
		.map(([key, s], i) => {
			const isWinner = key === result.winner;
			const bg = isWinner ? '#eef4ff' : i % 2 ? '#fafafa' : '#fff';
			const weight = isWinner ? '700' : '400';
			return `<tr style="background:${bg}">
			<td style="padding:8px 10px;border-bottom:1px solid ${LINE};font-weight:${weight};color:${INK}">${esc(s.name)}${isWinner ? ` <span style="color:${BRAND};font-size:12px">${esc(L('▲ recomendado', '▲ recommended'))}</span>` : ''}</td>
			<td style="padding:8px 10px;border-bottom:1px solid ${LINE};text-align:right;font-weight:${weight};color:${INK}">${fmtEur(s.net, lang)}</td>
			<td style="padding:8px 10px;border-bottom:1px solid ${LINE};text-align:right;color:${MUTED}">${fmtEur(s.net_monthly, lang)}</td>
			<td style="padding:8px 10px;border-bottom:1px solid ${LINE};text-align:right;color:${MUTED}">${fmtPct(s.effective_rate)}</td>
		</tr>`;
		})
		.join('');

	const assumptions = [
		[L('Faturação anual', 'Annual revenue'), fmtEur(result.revenue, lang)],
		[L('Valor/hora', 'Hourly rate'), fmtEur(params.hourlyRate, lang)],
		[L('Horas/dia', 'Hours/day'), fmt(params.hoursPerDay, lang)],
		[L('Dias/ano', 'Days/year'), fmt(params.daysPerYear, lang)],
		[L('Concelho', 'Municipality'), `${esc(result.muniName)} (${esc(regionLabel)})`],
		[L('Salário Lda (mês)', 'Lda salary (month)'), fmtEur(params.salary, lang)]
	]
		.map(
			([k, v]) =>
				`<tr><td style="padding:4px 10px 4px 0;color:${MUTED}">${k}</td><td style="padding:4px 0;color:${INK};text-align:right">${v}</td></tr>`
		)
		.join('');

	const confirmBlock = opts.confirmUrl
		? `<tr><td style="padding:16px 24px;background:#fff8e6;border-top:1px solid ${LINE}">
			<p style="margin:0 0 8px;color:${INK};font-size:14px">${esc(L('Confirma a subscrição de alertas de alterações à lei para receberes avisos quando as regras mudarem.', 'Confirm your subscription to law-change alerts to be notified when the rules change.'))}</p>
			<a href="${esc(opts.confirmUrl)}" style="display:inline-block;padding:9px 16px;background:${BRAND};color:#fff;text-decoration:none;border-radius:6px;font-size:14px">${esc(L('Confirmar alertas', 'Confirm alerts'))}</a>
		</td></tr>`
		: '';

	const consultation = opts.consultationUrl
		? `<a href="${esc(opts.consultationUrl)}" style="color:${BRAND};text-decoration:none">${esc(L('Marcar uma consulta', 'Book a consultation'))}</a>`
		: '';

	const unsubscribe = opts.unsubscribeUrl
		? `<a href="${esc(opts.unsubscribeUrl)}" style="color:${MUTED};text-decoration:underline">${esc(L('Cancelar subscrição', 'Unsubscribe'))}</a>`
		: '';

	const disclaimer = L(
		'Estimativa informativa baseada nas regras de 2026. Não constitui aconselhamento fiscal. Confirma sempre com um contabilista certificado.',
		'Informational estimate based on 2026 rules. Not tax advice. Always confirm with a certified accountant.'
	);

	const downloadBlock = opts.downloadUrl
		? `<tr><td style="padding:0 24px 12px">
			<a href="${esc(opts.downloadUrl)}" style="display:inline-block;padding:10px 18px;background:${BRAND};color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">${esc(L('Descarregar PDF', 'Download PDF'))}</a>
			<span style="display:block;margin-top:6px;color:${MUTED};font-size:12px">${esc(L('A ligação expira dentro de 3 dias.', 'This link expires within 3 days.'))}</span>
		</td></tr>`
		: '';

	const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
	<tr><td style="padding:20px 24px;background:${BRAND};color:#fff">
		<div style="font-size:18px;font-weight:700">B2B Simulator 2026</div>
		<div style="font-size:13px;opacity:.9">${esc(L('ENI vs Unipessoal Lda · regras 2026', 'ENI vs Unipessoal Lda · 2026 rules'))}</div>
	</td></tr>
	<tr><td style="padding:24px">
		<p style="margin:0 0 4px;color:${MUTED};font-size:13px;text-transform:uppercase;letter-spacing:.04em">${esc(L('Recomendação', 'Recommendation'))}</p>
		<p style="margin:0 0 4px;color:${INK};font-size:20px;font-weight:700">${esc(winner.name)}</p>
		<p style="margin:0;color:${BRAND};font-size:16px;font-weight:600">${fmtEur(winner.net, lang)} ${esc(L('líquido/ano', 'net/year'))} · ${fmtEur(winner.net_monthly, lang)}/${esc(L('mês', 'mo'))}</p>
	</td></tr>
	${downloadBlock}
	<tr><td style="padding:0 24px 8px">
		<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px">
			<thead><tr>
				<th style="padding:8px 10px;text-align:left;color:${MUTED};border-bottom:2px solid ${LINE};font-weight:600">${esc(L('Cenário', 'Scenario'))}</th>
				<th style="padding:8px 10px;text-align:right;color:${MUTED};border-bottom:2px solid ${LINE};font-weight:600">${esc(L('Líquido/ano', 'Net/year'))}</th>
				<th style="padding:8px 10px;text-align:right;color:${MUTED};border-bottom:2px solid ${LINE};font-weight:600">${esc(L('Líquido/mês', 'Net/mo'))}</th>
				<th style="padding:8px 10px;text-align:right;color:${MUTED};border-bottom:2px solid ${LINE};font-weight:600">${esc(L('Taxa efetiva', 'Effective rate'))}</th>
			</tr></thead>
			<tbody>${rows}</tbody>
		</table>
	</td></tr>
	<tr><td style="padding:16px 24px 8px">
		<p style="margin:0 0 6px;color:${INK};font-size:14px;font-weight:600">${esc(L('Pressupostos', 'Assumptions'))}</p>
		<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px">${assumptions}</table>
	</td></tr>
	${confirmBlock}
	<tr><td style="padding:16px 24px 24px;border-top:1px solid ${LINE}">
		<p style="margin:0 0 12px;color:${MUTED};font-size:12px;line-height:1.5">${esc(disclaimer)}</p>
		<p style="margin:0;color:${MUTED};font-size:12px">${consultation}${consultation && unsubscribe ? ' · ' : ''}${unsubscribe}</p>
	</td></tr>
</table>
</td></tr></table>
</body></html>`;

	const text = [
		subject,
		'',
		`${L('Recomendação', 'Recommendation')}: ${winner.name} — ${fmtEur(winner.net, lang)} ${L('líquido/ano', 'net/year')}`,
		...(opts.downloadUrl ? ['', `${L('Descarregar PDF', 'Download PDF')}: ${opts.downloadUrl}`] : []),
		'',
		...ranked.map(([, s]) => `- ${s.name}: ${fmtEur(s.net, lang)}/${L('ano', 'yr')} (${fmtPct(s.effective_rate)})`),
		'',
		disclaimer
	].join('\n');

	return { subject, html, text };
}
