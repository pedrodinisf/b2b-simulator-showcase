<script lang="ts">
	import type { ScenarioResult } from '@b2bsim/engine';
	import { tf, fmtEur, fmtPct } from '$lib/i18n';

	interface Props {
		scenarioKey: string;
		s: ScenarioResult;
		revenue: number;
		compact?: boolean;
	}
	let { scenarioKey, s, revenue, compact = false }: Props = $props();

	// Reconciling decomposition: irc + irs(net) + ss + derrama + ta + expenses + net = 100%.
	// Dividend tax is inside irs_total, so it is not a separate segment.
	const pct = (v: number) => (v / revenue) * 100;
	const segs = $derived(
		[
			['seg-irc', pct(s.irc ?? 0)],
			['seg-irs', pct(Math.max(0, s.irs_total - (s.lisbon_rebate ?? 0)))],
			['seg-ss', pct(s.ss_total ?? 0)],
			['seg-derrama', pct(s.derrama ?? 0)],
			['seg-ta', pct(s.ta_total ?? 0)],
			['seg-exp', pct(s.business_expenses ?? 0)]
		] as [string, number][]
	);
	const net = $derived(pct(s.net));
</script>

<div class="tax-bar{compact ? ' tax-bar--compact' : ''}">
	{#if !compact}
		<div class="tax-bar-label">
			<span class="name"><strong>{scenarioKey}.</strong> {s.name}</span>
			<span class="total">{tf('res_net_burden', { net: fmtEur(s.net), rate: fmtPct(s.effective_rate) })}</span>
		</div>
	{/if}
	<div class="tax-bar-track">
		{#each segs as [cls, v] (cls)}
			{#if v > 0.5}
				<div class="tax-bar-segment {cls}" style="width: {v}%">
					{#if v > 6}<span class="seg-label">{v.toFixed(1)}%</span>{/if}
				</div>
			{/if}
		{/each}
		<div class="tax-bar-segment seg-net" style="width: {net}%">
			{#if net > 6}<span class="seg-label">{net.toFixed(1)}%</span>{/if}
		</div>
	</div>
</div>
