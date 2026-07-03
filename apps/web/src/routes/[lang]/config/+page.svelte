<script lang="ts">
	import { onMount } from 'svelte';
	import { CONFIG_GROUPS_PT, CONFIG_GROUPS_EN } from '@b2bsim/content';
	import { pick, t, tf, fmt, fmtPct } from '$lib/i18n';
	import { calc, getNested, updateConfigValue, resetConfig, seedConfig } from '$lib/state.svelte';

	let { data } = $props();
	onMount(() => seedConfig(data.constants));

	const groups = $derived(pick(CONFIG_GROUPS_PT, CONFIG_GROUPS_EN) as { title: string; icon: string; rows: string[][] }[]);
	const T = $derived(calc.T ?? data.constants);

	const disp = (path: string, kind: string) => {
		const v = getNested(T, path) as number;
		return kind === 'pct' ? +(v * 100).toFixed(4) : v;
	};
	const step = (kind: string) => (kind === 'pct' ? '0.1' : kind === 'int' ? '1' : kind === 'eur' ? '1' : '0.0001');
	const suffix = (kind: string) => (kind === 'pct' ? '%' : kind === 'eur' ? '€' : '');
	const f = (x: number) => fmt(x);
	const p = (x: number) => fmtPct(x);
</script>

<div class="tab-content active">
	<h2 class="section-h2 section-h2--first">{t('cfg_h2')}</h2>
	<div class="alert info" style="margin-bottom:16px;"><span class="icon">ℹ️</span><div class="content">{t('cfg_alert')}</div></div>
	<div class="cfg-toolbar">
		<button type="button" class="cfg-btn" onclick={() => resetConfig(data.constants)}>{t('cfg_btn_reset')}</button>
	</div>

	{#each groups as g (g.title)}
		<details class="card cfg-group" open>
			<summary><span class="cfg-group-title">{g.icon} {g.title}</span></summary>
			<table class="cfg-table"><tbody>
				{#each g.rows as r (r[0])}
					<tr>
						<td class="cfg-label">{r[1]}<div class="cfg-meta"><span class="cfg-src">{r[3]}</span> <span class="cfg-aff">{r[4]}</span></div></td>
						<td class="cfg-val">
							<span class="cfg-input">
								<input type="number" step={step(r[2])} value={disp(r[0], r[2])} oninput={(e) => updateConfigValue(r[0], e.currentTarget.value, r[2])} />
								{#if suffix(r[2])}<span class="cfg-suffix">{suffix(r[2])}</span>{/if}
							</span>
						</td>
					</tr>
				{/each}
			</tbody></table>
		</details>
	{/each}

	<details class="card cfg-group">
		<summary><span class="cfg-group-title">{t('cfg_irs_summary')}</span></summary>
		<table class="cfg-table cfg-brackets"><tbody>
			{#each T.irs as b (b.min)}
				<tr><td class="mono">{b.max === Infinity ? '> ' + f(b.min) : f(b.min) + ' – ' + f(b.max)}</td><td class="mono">{p(b.rate)}</td><td class="mono">{f(b.ded)}</td></tr>
			{/each}
		</tbody></table>
	</details>
	<details class="card cfg-group">
		<summary><span class="cfg-group-title">{t('cfg_solidarity_summary')}</span></summary>
		<table class="cfg-table cfg-brackets"><tbody>
			{#each T.irs_solidarity as b (b.min)}
				<tr><td class="mono">{b.max === Infinity ? '> ' + f(b.min) : f(b.min) + ' – ' + f(b.max)}</td><td class="mono">{p(b.rate)}</td></tr>
			{/each}
		</tbody></table>
	</details>

	<h2 class="section-h2" style="margin-top:24px;">{t('cfg_formulas_h2')}</h2>
	<div class="card formula-card">
		<h3 class="section-h3">{t('cf_irs_h3')}</h3>
		<p class="formula">{t('cf_irs_formula')}</p>
		<table class="cfg-table cfg-brackets"><thead><tr><th>{t('cf_irs_th_band')}</th><th>{t('cf_irs_th_rate')}</th><th>{t('cf_irs_th_portion')}</th></tr></thead><tbody>
			{#each T.irs as b (b.min)}
				<tr><td class="mono">{b.max === Infinity ? '> ' + f(b.min) : f(b.min) + ' – ' + f(b.max)}</td><td class="mono">{p(b.rate)}</td><td class="mono">{f(b.ded)}</td></tr>
			{/each}
		</tbody></table>
		<p class="formula-note">{tf('cf_solidarity_note', { r1: p(T.irs_solidarity[0].rate), a: f(T.irs_solidarity[0].min), b: f(T.irs_solidarity[1].min), r2: p(T.irs_solidarity[1].rate) })}</p>
	</div>
	<div class="card formula-card">
		<h3 class="section-h3">{t('cf_irc_h3')}</h3>
		<p class="formula">{tf('cf_irc_formula', { thr: f(T.irc.pme_threshold), pme: p(T.irc.pme), std: p(T.irc.standard) })}</p>
		<p class="formula-note">{tf('cf_irc_note', { d: p(T.derrama.max), thr: f(T.lisboa.derrama_threshold) })}</p>
	</div>
	<div class="card formula-card">
		<h3 class="section-h3">{t('cf_eni_h3')}</h3>
		<p class="formula">{tf('cf_eni_formula1', { c: p(T.simplified.services_coefficient), y1: T.simplified.year1_coef_factor, y2: T.simplified.year2_coef_factor })}</p>
		<p class="formula">{tf('cf_eni_formula2', { ded: f(T.irs_cat_a_deduction), ej: p(T.simplified.expense_justification) })}</p>
		<p class="formula-note">{t('cf_eni_note')}</p>
	</div>
	<div class="card formula-card">
		<h3 class="section-h3">{t('cf_ss_h3')}</h3>
		<p class="formula">{tf('cf_ss_formula1', { rel: p(T.ss.eni_relevant_pct), max: f(T.ss.eni_max_base_monthly), rate: p(T.ss.eni_rate) })}</p>
		<p class="formula">{tf('cf_ss_formula2', { w: p(T.ss.moe_worker), e: p(T.ss.moe_employer) })}</p>
	</div>
	<div class="card formula-card">
		<h3 class="section-h3">{t('cf_div_h3')}</h3>
		<p class="formula">{tf('cf_div_formula1', { wh: p(T.dividends.withholding) })}</p>
		<p class="formula">{tf('cf_div_formula2', { inc: p(T.dividends.englobamento_inclusion), wh: p(T.dividends.withholding) })}</p>
	</div>
	<div class="card formula-card">
		<h3 class="section-h3">{t('cf_net_h3')}</h3>
		<p class="formula">{t('cf_net_formula1')}</p>
		<p class="formula">{t('cf_net_formula2')}</p>
		<p class="formula-note">{t('cf_net_note')}</p>
	</div>
	<div class="card formula-card">
		<h3 class="section-h3">{t('cf_regions_h3')}</h3>
		<p class="formula-note">{t('cf_regions_note')}</p>
	</div>
</div>
