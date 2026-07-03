<script lang="ts">
	import { t, tf, fmtEur, fmtPct, locale } from '$lib/i18n';
	import type { SimResult } from '@b2bsim/engine';
	import { calc } from '$lib/state.svelte';
	import { localiseScenarios } from '$lib/scenarios';
	import EmailReport from '$lib/components/EmailReport.svelte';

	let { data } = $props();

	const p = $derived(calc.params);
	const r = $derived(localiseScenarios($state.snapshot(calc.currentResult ?? data.result) as SimResult, locale(), p.salary));
	const constants = $derived(calc.T ?? data.constants);
	const revenue = $derived(r.revenue);
	const A = $derived(r.scenarios.A);

	const steadyKeys = ['C', 'D', 'E', 'F', 'G', 'H'];
	const bestSteadyKey = $derived(steadyKeys.reduce((a, k) => (r.scenarios[k].net > r.scenarios[a].net ? k : a), 'C'));
	const bestSteady = $derived(r.scenarios[bestSteadyKey]);
	const eniSteady = $derived(r.scenarios.C);
	const steadyGap = $derived(bestSteady.net - eniSteady.net);
	const ldaWinsSteady = $derived(['E', 'F', 'G', 'H'].includes(bestSteadyKey));
	const methodTxt = $derived(bestSteady.dividend_method_used ? (bestSteady.dividend_method_used === 'englobamento' ? t('sd_method_eng') : t('sd_method_lib')) : '');
	const lisbonExempt = $derived(r.effectiveDerrama === 0 && r.lisbonRebatePct > 0);
	const muni = $derived(r.muniName || t('ov_muni_custom'));
	const ranked = $derived(Object.entries(r.scenarios).map(([k, s]) => ({ k, s })).sort((a, b) => b.s.net - a.s.net));
	const maxNet = $derived(ranked[0].s.net || 1);
	const ivaLine = $derived(p.clientLocation === 'PT' ? t('ov_iva_pt') : p.clientLocation === 'UE' ? t('ov_iva_ue') : t('ov_iva_out'));
</script>

<div class="tab-content active">
	<div class="ov-hero">
		<div class="ov-hero-card ov-hero-y1">
			<div class="ov-hero-label">{t('ov_hero_y1_label')}</div>
			<div class="ov-hero-scen">{A.name}</div>
			<div class="ov-hero-net">{fmtEur(A.net)}</div>
			<div class="ov-hero-sub">{fmtEur(A.net_monthly)}{t('res_cmp_month')} · {tf('ov_burden', { r: fmtPct(A.effective_rate) })}</div>
			<div class="ov-hero-note">{t('ov_hero_y1_note')}</div>
		</div>
		<div class="ov-hero-card ov-hero-best">
			<div class="ov-hero-label">{t('ov_hero_best_label')}</div>
			<div class="ov-hero-scen">{bestSteady.name}</div>
			<div class="ov-hero-net">{fmtEur(bestSteady.net)}</div>
			<div class="ov-hero-sub">{fmtEur(bestSteady.net_monthly)}{t('res_cmp_month')} · {tf('ov_burden', { r: fmtPct(bestSteady.effective_rate) })}</div>
			<div class="ov-hero-note">{ldaWinsSteady ? tf('ov_hero_best_note_lda', { method: methodTxt, gap: fmtEur(steadyGap) }) : t('ov_hero_best_note_eni')}</div>
		</div>
	</div>

	<div class="tldr">
		<div class="tldr-title">{@html tf('ov_tldr_title', { rev: fmtEur(revenue) })}</div>
		<ul>
			<li>{@html tf('ov_tldr_y1', { net: fmtEur(A.net) })}</li>
			{#if ldaWinsSteady}
				<li>{@html tf('ov_tldr_steady_lda', { scen: bestSteady.name, best: fmtEur(bestSteady.net), eni: fmtEur(eniSteady.net), gap: fmtEur(steadyGap), method: methodTxt })}</li>
				<li>{@html t('ov_tldr_plan')}</li>
			{:else}
				<li>{@html tf('ov_tldr_steady_eni', { eni: fmtEur(eniSteady.net) })}</li>
			{/if}
			{#if lisbonExempt}
				<li>{@html tf('ov_tldr_lisbon', { muni, thr: fmtEur(r.derramaThreshold), dev: fmtPct(r.lisbonRebatePct) })}</li>
			{/if}
			<li>{@html tf('ov_tldr_iva', { line: ivaLine })}</li>
		</ul>
	</div>

	<h2 class="section-h2">{t('ov_rank_h2')}</h2>
	<div class="card">
		<p class="text-dim" style="font-size:13px; margin-bottom:12px;">{t('ov_rank_intro')}</p>
		{#each ranked as { k, s }, i (k)}
			{@const w = (s.net / maxNet) * 100}
			{@const isY1 = k === 'A'}
			{@const isBestSteady = k === bestSteadyKey}
			<div class="ov-rank-row">
				<div class="ov-rank-name">
					{i + 1}. <strong>{k}.</strong> {s.name}
					{#if isY1}<span class="ov-tag ov-tag-y1">{t('ov_tag_y1')}</span>{/if}
					{#if isBestSteady}<span class="ov-tag ov-tag-best">{t('ov_tag_best')}</span>{/if}
				</div>
				<div class="ov-rank-bar"><div class="ov-rank-fill {isY1 ? 'is-y1' : isBestSteady ? 'is-best' : ''}" style="width:{w}%"></div></div>
				<div class="ov-rank-net">{fmtEur(s.net)} <span class="ov-rank-sub">{fmtEur(s.net_monthly)}{t('res_cmp_month')} · {fmtPct(s.effective_rate)}</span></div>
			</div>
		{/each}
	</div>

	<h2 class="section-h2">{t('ov_plan_h2')}</h2>

	<div class="stage-card">
		<div class="stage-num">{t('ov_phase')} 0</div>
		<div class="stage-title">{t('ov_p0_title')}</div>
		<div class="stage-time">{t('ov_p0_time')}</div>
		<ol><li>{@html t('ov_p0_li1')}</li><li>{@html t('ov_p0_li2')}</li><li>{@html t('ov_p0_li3')}</li></ol>
	</div>
	<div class="stage-card">
		<div class="stage-num">{t('ov_phase')} 1</div>
		<div class="stage-title">{t('ov_p1_title')}</div>
		<div class="stage-time">{t('ov_p1_time')}</div>
		<ol>
			<li>{@html t('ov_p1_li1')}</li><li>{@html t('ov_p1_li2')}</li><li>{@html t('ov_p1_li3')}</li>
			<li>{@html tf('ov_p1_li4', { req: fmtEur(A.justification_required ?? 0), rev: fmtEur(revenue) })}</li>
			<li>{@html t('ov_p1_li5')}</li>
		</ol>
	</div>
	<div class="stage-card">
		<div class="stage-num">{t('ov_phase')} 2</div>
		<div class="stage-title">{t('ov_p2_title')}</div>
		<div class="stage-time">{t('ov_p2_time')}</div>
		<ol><li>{@html t('ov_p2_li1')}</li><li>{@html t('ov_p2_li2')}</li><li>{@html t('ov_p2_li3')}</li></ol>
	</div>
	<div class="stage-card">
		<div class="stage-num">{t('ov_phase')} 3</div>
		<div class="stage-title">{t('ov_p3_title')}</div>
		<div class="stage-time">{t('ov_p3_time')}</div>
		<ol><li>{@html tf('ov_p3_li1', { max: fmtEur(constants.simplified.max_revenue) })}</li><li>{@html t('ov_p3_li2')}</li></ol>
	</div>

	<h2 class="section-h2">{t('ov_trig_h2')}</h2>
	<div class="card">
		<ul style="list-style: none; padding: 0; margin: 0;">
			{#each ['ov_trig1', 'ov_trig2', 'ov_trig3', 'ov_trig4', 'ov_trig5'] as key (key)}
				<li class="ov-trigger"><span class="ov-arrow">→</span><div>{@html t(key)}</div></li>
			{/each}
		</ul>
	</div>

	<h2 class="section-h2">{t('ov_assum_h2')}</h2>
	{#if lisbonExempt}
		<div class="alert success"><span class="icon">✓</span><div class="content">{@html tf('ov_assum_lisbon_yes', { muni, thr: fmtEur(r.derramaThreshold), dev: fmtPct(r.lisbonRebatePct) })}</div></div>
	{:else}
		<div class="alert info"><span class="icon">ℹ️</span><div class="content">{@html tf('ov_assum_lisbon_no', { muni })}</div></div>
	{/if}
	<div class="alert warning"><span class="icon">⚠️</span><div class="content">{@html t('ov_assum_entity')}</div></div>
	<div class="alert warning"><span class="icon">⚠️</span><div class="content">{@html t('ov_assum_ss')}</div></div>
	<div class="alert warning"><span class="icon">⚠️</span><div class="content">{@html t('ov_assum_withhold')}</div></div>
	<div class="alert info"><span class="icon">💡</span><div class="content">{@html t('ov_assum_general')}</div></div>

	<EmailReport source="resumo" />
</div>
