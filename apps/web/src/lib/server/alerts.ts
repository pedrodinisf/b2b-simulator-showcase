import { and, eq, isNull, isNotNull } from 'drizzle-orm';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import { simulate, type Dataset, type SimResult } from '@b2bsim/engine';
import * as schema from './db/schema';
import { clampParams } from '../params';
import type { EmailSender, EmailMessage } from './email';

// Law-change alert diffing + batch send. Free of $-aliases so it can be imported
// both from a SvelteKit route context and directly (relative path) from the CLI
// ingest script, matching the house pattern for src/lib/server modules that are
// also used outside the Vite pipeline (see db/dataset.ts).
export type AlertDb = LibSQLDatabase<typeof schema>;

export interface AlertImpact {
	changed: boolean;
	oldWinner: string;
	newWinner: string;
	oldNet: number;
	newNet: number;
	deltaAbs: number;
	deltaPct: number;
}

const MATERIAL_DELTA_PCT = 0.01; // 1% net change on the previous winner counts as material

// Compares the SAME scenario (the old winner) under both datasets, isolating the
// effect of the law change from which regime happens to be on top today. A
// winner change is always material; otherwise a >=1% net change on it is.
export function diffImpact(oldResult: SimResult, newResult: SimResult): AlertImpact {
	const oldWinner = oldResult.winner;
	const newWinner = newResult.winner;
	const oldNet = oldResult.scenarios[oldWinner]?.net ?? 0;
	const newNet = newResult.scenarios[oldWinner]?.net ?? 0;
	const deltaAbs = newNet - oldNet;
	const deltaPct = oldNet !== 0 ? Math.abs(deltaAbs) / Math.abs(oldNet) : 0;
	const changed = oldWinner !== newWinner || deltaPct >= MATERIAL_DELTA_PCT;
	return { changed, oldWinner, newWinner, oldNet, newNet, deltaAbs, deltaPct };
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmtEur = (n: number, lang: string) => '€' + Math.round(n).toLocaleString(lang === 'en' ? 'en-GB' : 'pt-PT');

function buildAlertEmail(opts: { to: string; lang: string; scenarioName: string; impact: AlertImpact; unsubscribeUrl: string; signInUrl: string }): EmailMessage {
	const en = opts.lang === 'en';
	const name = escapeHtml(opts.scenarioName);
	const subject = en
		? `Tax rules changed - your "${opts.scenarioName}" scenario is affected`
		: `As regras fiscais mudaram - o teu cenário "${opts.scenarioName}" foi afetado`;
	const winnerNote =
		opts.impact.oldWinner !== opts.impact.newWinner
			? en
				? `The best option for this scenario also changed, from ${opts.impact.oldWinner} to ${opts.impact.newWinner}.`
				: `A melhor opção para este cenário também mudou, de ${opts.impact.oldWinner} para ${opts.impact.newWinner}.`
			: '';
	const netLine = `${en ? 'Estimated net' : 'Líquido estimado'}: ${fmtEur(opts.impact.oldNet, opts.lang)} → ${fmtEur(opts.impact.newNet, opts.lang)}`;
	const safeUrl = (u: string) => escapeHtml(u);

	const html = `<!doctype html>
<html lang="${opts.lang}">
<body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a1a1a;line-height:1.5">
<h1 style="font-size:20px;margin:0 0 16px">${en ? 'Tax rules changed' : 'As regras fiscais mudaram'}</h1>
<p style="margin:0 0 16px">${en ? `Your saved scenario <strong>${name}</strong> is affected by a recent update to the tax rules.` : `O teu cenário guardado <strong>${name}</strong> foi afetado por uma atualização recente das regras fiscais.`}</p>
<p style="margin:0 0 16px">${netLine}</p>
${winnerNote ? `<p style="margin:0 0 16px">${escapeHtml(winnerNote)}</p>` : ''}
<p style="margin:24px 0"><a href="${safeUrl(opts.signInUrl)}" style="background:#1a1a1a;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600">${en ? 'See the details' : 'Ver os detalhes'}</a></p>
<p style="color:#999;font-size:13px;margin:24px 0 0"><a href="${safeUrl(opts.unsubscribeUrl)}" style="color:#999">${en ? 'Unsubscribe from these alerts' : 'Cancelar estes avisos'}</a></p>
</body>
</html>`;

	const text = `${en ? 'Tax rules changed' : 'As regras fiscais mudaram'}\n\n${opts.scenarioName}\n${netLine}\n${winnerNote}\n\n${opts.signInUrl}\n\n${en ? 'Unsubscribe' : 'Cancelar'}: ${opts.unsubscribeUrl}`;

	return { to: opts.to, subject, html, text };
}

export interface AlertsRunSummary {
	evaluated: number;
	notified: number;
	unchanged: number;
	skippedCap: number;
}

// Diffs every confirmed, active alert_subscription's saved scenario between the
// previous active dataset and the newly activated one, and emails the ones that
// materially changed. Idempotent per dataset version: a row already evaluated
// against `newDatasetId` is skipped, so re-running for the same activation is
// safe. `maxEmails` is a per-RUN cap - this is an operator-triggered batch job
// (wired into the CLI ingest script), not a public endpoint, so it guards
// against a misconfigured ingest fanning out to everyone at once, not external
// abuse (contrast with /api/report's rolling day/month cap, built for that).
export async function runAlertsForDataset(
	db: AlertDb,
	opts: { oldDataset: Dataset; newDataset: Dataset; newDatasetId: number; sender: EmailSender; baseUrl: string; maxEmails: number }
): Promise<AlertsRunSummary> {
	const summary: AlertsRunSummary = { evaluated: 0, notified: 0, unchanged: 0, skippedCap: 0 };

	const rows = await db
		.select({
			id: schema.alertSubscription.id,
			email: schema.alertSubscription.email,
			confirmToken: schema.alertSubscription.confirmToken,
			lastNotifiedDatasetId: schema.alertSubscription.lastNotifiedDatasetId,
			name: schema.savedScenario.name,
			lang: schema.savedScenario.lang,
			paramsJson: schema.savedScenario.paramsJson
		})
		.from(schema.alertSubscription)
		.innerJoin(schema.savedScenario, eq(schema.alertSubscription.savedScenarioId, schema.savedScenario.id))
		.where(and(isNotNull(schema.alertSubscription.confirmedAt), isNull(schema.alertSubscription.unsubscribedAt)));

	for (const row of rows) {
		if (row.lastNotifiedDatasetId === opts.newDatasetId) continue; // already evaluated this dataset version

		let impact: AlertImpact;
		try {
			const params = clampParams(JSON.parse(row.paramsJson));
			impact = diffImpact(simulate(params, opts.oldDataset), simulate(params, opts.newDataset));
		} catch {
			continue; // malformed snapshot; skip rather than crash the whole run
		}
		summary.evaluated++;

		if (!impact.changed) {
			summary.unchanged++;
			await db.update(schema.alertSubscription).set({ lastNotifiedDatasetId: opts.newDatasetId }).where(eq(schema.alertSubscription.id, row.id));
			continue;
		}

		if (summary.notified >= opts.maxEmails) {
			summary.skippedCap++;
			continue; // leave lastNotifiedDatasetId behind so a future run retries it
		}

		const message = buildAlertEmail({
			to: row.email,
			lang: row.lang,
			scenarioName: row.name,
			impact,
			unsubscribeUrl: `${opts.baseUrl}/${row.lang}/unsubscribe?token=${row.confirmToken}`,
			signInUrl: `${opts.baseUrl}/${row.lang}/account`
		});
		try {
			await opts.sender.send(message);
			await db.update(schema.alertSubscription).set({ lastNotifiedDatasetId: opts.newDatasetId }).where(eq(schema.alertSubscription.id, row.id));
			summary.notified++;
		} catch {
			// send failed; leave lastNotifiedDatasetId behind so a future run retries
		}
	}

	return summary;
}
