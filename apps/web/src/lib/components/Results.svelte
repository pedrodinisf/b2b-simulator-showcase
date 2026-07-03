<script lang="ts">
	import type { SimResult, Region } from '@b2bsim/engine';
	import { t, tf, pick, fmtEur, fmtPct, locale } from '$lib/i18n';
	import { calc, solveRate, type SensRow } from '$lib/state.svelte';
	import { localiseScenarios } from '$lib/scenarios';
	import { svgLineChart } from '$lib/chart';
	import { encodeParams } from '$lib/share';
	import TaxBar from './TaxBar.svelte';
	import ScenarioDetail from './ScenarioDetail.svelte';

	interface Props {
		result: SimResult;
		sensitivity: SensRow[];
		regions: Record<string, Region>;
	}
	let { result, sensitivity, regions }: Props = $props();

	const p = $derived(calc.params);
	// Snapshot before localising (don't mutate the store/prop). $state.snapshot unwraps the
	// Svelte proxy to a plain object — structuredClone throws DataCloneError on a $state proxy.
	const r = $derived(localiseScenarios($state.snapshot(result) as SimResult, locale(), p.salary));
	const revenue = $derived(r.revenue);
	const a = $derived(r.scenarios.A);

	const steadyKeys = ['C', 'D', 'E', 'F', 'G', 'H'];
	const bestSteadyKey = $derived(steadyKeys.reduce((x, k) => (r.scenarios[k].net > r.scenarios[x].net ? k : x), 'C'));
	const bestSteady = $derived(r.scenarios[bestSteadyKey]);
	const eniSteady = $derived(r.scenarios.C);
	const steadyGap = $derived(bestSteady.net - eniSteady.net);
	const steadySpread = $derived(Math.round(Math.max(...steadyKeys.map((k) => r.scenarios[k].net)) - Math.min(...steadyKeys.map((k) => r.scenarios[k].net))));
	const ldaWinsSteady = $derived(['E', 'F', 'G', 'H'].includes(bestSteadyKey));
	const heroTitle = $derived(ldaWinsSteady ? t('res_hero_title_lda') : t('res_hero_title_eni'));
	const heroNote = $derived(ldaWinsSteady ? tf('res_hero_note_lda', { scen: bestSteady.name, gap: fmtEur(steadyGap) }) : t('res_hero_note_eni'));
	const steadySubExtra = $derived(ldaWinsSteady ? tf('res_steady_sub_extra', { gap: fmtEur(steadyGap) }) : '');

	const derramaTxt = $derived(r.effectiveDerrama === 0 ? t('res_derrama_exempt') : (r.effectiveDerrama * 100).toFixed(2) + '%');
	const ivaTxt = $derived(p.clientLocation === 'UE' ? t('res_iva_ue') : p.clientLocation === 'ForaUE' ? t('res_iva_out') : t('res_iva_pt'));
	const divTxt = $derived(p.dividendMethodMode === 'auto' ? t('res_div_auto') : p.dividendMethodMode === 'englobamento' ? t('res_div_eng') : t('res_div_lib'));
	const regionLabel = $derived(regions[r.region] ? pick(regions[r.region].label_pt, regions[r.region].label_en) : r.region);

	const ranked = $derived(Object.entries(r.scenarios).map(([k, s]) => ({ k, s })).sort((x, y) => y.s.net - x.s.net));
	const maxNet = $derived(ranked[0].s.net || 1);

	const base50A = $derived(sensitivity.find((x) => x.rate === 50)?.A ?? 0);
	const sensChart = $derived(
		svgLineChart(
			sensitivity.map((x) => x.rate),
			[
				{ name: t('sens_s_a'), color: 'var(--accent-bright)', values: sensitivity.map((x) => x.A) },
				{ name: t('sens_s_c'), color: 'var(--accent)', values: sensitivity.map((x) => x.C) },
				{ name: t('sens_s_f'), color: 'var(--green)', values: sensitivity.map((x) => x.F) }
			],
			{ xfmt: (rr) => '€' + rr + '/h', yfmt: fmtEur }
		)
	);

	let solverTarget = $state(5000);
	let solverOut = $state('');
	let solving = $state(false);
	async function runSolver() {
		solving = true;
		const target = (solverTarget || 0) * 12;
		const steady = steadyKeys.reduce((acc, k) => (r.scenarios[k].net > r.scenarios[acc].net ? k : acc), 'C');
		const [rA, rS] = await Promise.all([solveRate(target, 'A'), solveRate(target, steady)]);
		solving = false;
		if (rA == null || rS == null) return;
		solverOut = tf('solver_out', { net: fmtEur(target), y1: '€' + rA.toFixed(1), steady: '€' + rS.toFixed(1), sname: r.scenarios[steady].name, hours: p.hoursPerDay, days: p.daysPerYear });
	}

	let copied = $state(false);
	function copyShareLink() {
		const url = location.origin + location.pathname + '#s=' + encodeParams(calc.params);
		navigator.clipboard?.writeText(url).then(() => {
			copied = true;
			setTimeout(() => (copied = false), 1500);
		});
	}
</script>

<section class="calc-hero">
	<div class="calc-hero-eyebrow">{tf('res_eyebrow', { rev: fmtEur(revenue) })}</div>
	<h2 class="calc-hero-title">{heroTitle}</h2>
	<p class="calc-hero-note">{heroNote}</p>
	<div class="hero-stats">
		<div class="hero-stat hero-stat--win">
			<div class="hs-label">{t('res_hs_y1')}</div>
			<div class="hs-name">{a.name}</div>
			<div class="hs-value"><span>{fmtEur(a.net)}</span><span>{t('res_per_year')}</span></div>
			<div class="hs-sub">{fmtEur(a.net_monthly)}{t('res_net_month')}</div>
		</div>
		<div class="hero-stat">
			<div class="hs-label">{t('res_hs_steady')}</div>
			<div class="hs-name">{bestSteady.name}</div>
			<div class="hs-value"><span>{fmtEur(bestSteady.net)}</span><span>{t('res_per_year')}</span></div>
			<div class="hs-sub">{fmtEur(bestSteady.net_monthly)}{t('res_net_month')}{steadySubExtra}</div>
		</div>
	</div>
	<div class="hero-save">
		<span class="hero-save-amt"><span>{fmtEur(steadySpread)}</span>{t('res_per_year')}</span>
		<span class="hero-save-cap">{t('res_save_cap')}</span>
	</div>
</section>

<div class="assume-chips">
	<span class="chip">{t('res_chip_derrama')}{derramaTxt}</span>
	<span class="chip">{t('res_chip_iva')}{ivaTxt}</span>
	<span class="chip">{t('res_chip_div')}{divTxt}</span>
	{#if r.lisbonRebatePct > 0}<span class="chip">{tf('res_chip_refund', { p: (r.lisbonRebatePct * 100).toFixed(0) })}</span>{/if}
	{#if r.region !== 'continente'}<span class="chip">{tf('res_chip_region', { r: regionLabel })}</span>{/if}
	{#if p.ss_first_year_exempt}<span class="chip">{t('res_chip_ss1')}</span>{/if}
</div>

<h2 class="section-h2">{t('res_cmp_h2')}</h2>
<p class="cmp-intro">{t('res_cmp_intro')}</p>
<div class="cmp-legend">
	<span class="lg lg-irc">IRC</span><span class="lg lg-irs">IRS</span><span class="lg lg-ss">SS</span><span class="lg lg-derrama">{t('res_lg_derrama')}</span><span class="lg lg-ta">TA</span><span class="lg lg-exp">{t('res_lg_exp')}</span><span class="lg lg-net">{t('res_lg_net')}</span>
</div>
<div class="cmp-list">
	{#each ranked as { k, s }, i (k)}
		{@const isEni = ['A', 'B', 'C', 'D'].includes(k)}
		{@const isWinner = r.winner === k}
		{@const w = Math.max(2, (s.net / maxNet) * 100)}
		{@const fillClass = isWinner ? 'is-win' : isEni ? 'is-eni' : 'is-lda'}
		<details class="cmp-row {isEni ? 'type-eni' : 'type-lda'}" open={isWinner}>
			<summary class="cmp-summary">
				<span class="cmp-rank">{i + 1}</span>
				<span class="cmp-main">
					<span class="cmp-name">
						<span class="cmp-badge {isEni ? 'b-eni' : 'b-lda'}">{isEni ? 'ENI' : 'Lda'}</span>
						{s.name}
						{#if isWinner}<span class="cmp-tag is-win">{t('res_tag_winner')}</span>{/if}
						{#if k === bestSteadyKey}<span class="cmp-tag is-best">{t('res_tag_best')}</span>{/if}
						{#if s.isCustom}<span class="cmp-tag is-custom">{t('res_tag_custom')}</span>{/if}
					</span>
					<span class="cmp-bar"><span class="cmp-fill {fillClass}" style="width:{w}%"></span></span>
				</span>
				<span class="cmp-figs">
					<span class="cmp-net">{fmtEur(s.net)}</span>
					<span class="cmp-sub">{fmtEur(s.net_monthly)}{t('res_cmp_month')} · {fmtPct(s.effective_rate)}</span>
				</span>
				<span class="cmp-chev" aria-hidden="true">▾</span>
			</summary>
			<div class="cmp-body">
				<TaxBar scenarioKey={k} {s} {revenue} compact={true} />
				<ScenarioDetail scenarioKey={k} {s} {revenue} />
			</div>
		</details>
	{/each}
</div>

<details class="cmp-extra">
	<summary>{t('res_table_full')} <span class="chev">▾</span></summary>
	<div class="comp-table">
		<table>
			<thead>
				<tr>
					<th>{t('res_th_scenario')}</th>
					<th class="right">{t('res_th_revenue')}</th>
					<th class="right">IRS</th>
					<th class="right">IRC</th>
					<th class="right">SS</th>
					<th class="right">{t('res_th_derrama')}</th>
					<th class="right">{t('res_th_expenses')}</th>
					<th class="right">{t('res_th_total')}</th>
					<th class="right">{t('res_th_net')}</th>
					<th class="right">{t('res_th_net_month')}</th>
					<th class="right">{t('res_th_eff')}</th>
				</tr>
			</thead>
			<tbody>
				{#each Object.entries(r.scenarios) as [key, s] (key)}
					<tr class={r.winner === key ? 'net-row' : ''}>
						<td><strong>{key}.</strong> {s.name}</td>
						<td class="mono">{fmtEur(revenue)}</td>
						<td class="mono">{fmtEur(s.irs_total)}</td>
						<td class="mono">{fmtEur(s.irc ?? 0)}</td>
						<td class="mono">{fmtEur(s.ss_total)}</td>
						<td class="mono">{fmtEur(s.derrama ?? 0)}</td>
						<td class="mono">{fmtEur(s.business_expenses)}</td>
						<td class="mono negative">{fmtEur(revenue - s.net)}</td>
						<td class="mono accent">{fmtEur(s.net)}</td>
						<td class="mono">{fmtEur(s.net_monthly)}</td>
						<td class="mono">{fmtPct(s.effective_rate)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</details>

<details class="card expander">
	<summary>{t('sens_summary')} <span class="chev">▾</span></summary>
	<p class="text-dim" style="margin: 14px 0 12px; font-size: 13px;">{tf('sens_intro', { h: p.hoursPerDay, d: p.daysPerYear, tot: p.hoursPerDay * p.daysPerYear })}</p>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- self-generated SVG -->
	{@html sensChart}
	<div class="comp-table">
		<table>
			<thead>
				<tr>
					<th>{t('sens_th_rate')}</th>
					<th class="right">{t('sens_th_rev')}</th>
					<th class="right">{t('sens_s_a')}</th>
					<th class="right">{t('sens_s_c')}</th>
					<th class="right">{t('sens_s_f')}</th>
					<th class="right">{t('sens_th_delta')}</th>
				</tr>
			</thead>
			<tbody>
				{#each sensitivity as row (row.rate)}
					{@const isBaseline = row.rate === 50}
					{@const delta = row.A - base50A}
					<tr class={isBaseline ? 'total-row' : ''}>
						<td class="mono"><strong>€{row.rate}/h</strong></td>
						<td class="mono">{fmtEur(row.revenue)}</td>
						<td class="mono">{fmtEur(row.A)}</td>
						<td class="mono">{fmtEur(row.C)}</td>
						<td class="mono">{fmtEur(row.F)}</td>
						<td class="mono {delta > 0 ? 'positive' : delta < 0 ? 'negative' : ''}">{delta === 0 ? t('sens_base_cell') : (delta > 0 ? '+' : '') + fmtEur(delta)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<div class="alert info" style="margin-top: 12px;">
		<span class="icon">📌</span>
		<div class="content">
			<strong>{t('sens_notes_title')}</strong>
			<ul>
				<li>{@html t('sens_note1')}</li>
				<li>{@html t('sens_note2')}</li>
				<li>{@html t('sens_note3')}</li>
			</ul>
		</div>
	</div>
</details>

<div class="alert success" style="margin-top: 24px;">
	<span class="icon">🎯</span>
	<div class="content">
		<strong>{tf('res_rec_title', { rev: fmtEur(revenue) })}</strong>
		<ul style="margin-top: 8px;">
			<li>{@html tf('res_rec_y1', { net: fmtEur(a.net) })}</li>
			{#if ldaWinsSteady}
				<li>{@html tf('res_rec_steady_lda', { scen: bestSteady.name, best: fmtEur(bestSteady.net), eni: fmtEur(eniSteady.net), gap: fmtEur(steadyGap) })}</li>
				<li>{@html t('res_rec_plan')}</li>
			{:else}
				<li>{@html tf('res_rec_steady_eni', { eni: fmtEur(eniSteady.net) })}</li>
			{/if}
			<li>{@html t('res_rec_lowsal')}</li>
			<li>{@html t('res_rec_fair')}</li>
		</ul>
	</div>
</div>

<div class="card solver-card" style="margin-top: 22px;">
	<h3 class="section-h3">{t('solver_h')}</h3>
	<div class="solver-row">
		<label class="solver-label">{t('solver_label')}<input type="number" bind:value={solverTarget} step="100" min="0" /></label>
		<button type="button" class="opt-btn" onclick={runSolver} disabled={solving}>{t('solver_btn')}</button>
	</div>
	<div class="solver-out">{solverOut}</div>
</div>

<div class="resumo-cta">
	<button type="button" class="opt-btn" onclick={copyShareLink}>{copied ? t('share_done') : t('share_btn')}</button>
	<span class="resumo-cta-note">{t('res_cta_note')}</span>
</div>
