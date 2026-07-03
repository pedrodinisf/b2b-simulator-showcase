<script lang="ts">
	import type { ScenarioResult } from '@b2bsim/engine';
	import { t, tf, fmtEur, fmtPct } from '$lib/i18n';

	interface Props {
		scenarioKey: string;
		s: ScenarioResult;
		revenue: number;
	}
	let { s, revenue }: Props = $props();

	// Public showcase: a coherent summary ledger. The production app renders a full
	// per-scenario breakdown (regime coefficient, justification basket, dividend
	// split, derrama, reserva legal, …); that detail is part of the proprietary
	// engine methodology and is not included in this build.
</script>

<div class="ledger">
	<table>
		<tbody>
			<tr><td>{t('sd_gross')}</td><td class="mono">{fmtEur(s.gross)}</td></tr>
			<tr><td>{t('sd_burden_eni')}</td><td class="mono negative">−{fmtEur(s.tax_ss)}</td></tr>
			<tr><td>{t('sd_real_op_exp')}</td><td class="mono negative">−{fmtEur(s.business_expenses)}</td></tr>
			<tr class="total-row">
				<td>{tf('sd_out_of_pocket', { rate: fmtPct(s.effective_rate) })}</td>
				<td class="mono">−{fmtEur(revenue - s.net)}</td>
			</tr>
			<tr class="net-row">
				<td>{t('sd_net_annual')}</td>
				<td class="mono">{fmtEur(s.net)} · {fmtEur(s.net_monthly)}{t('res_cmp_month')}</td>
			</tr>
		</tbody>
	</table>
</div>
