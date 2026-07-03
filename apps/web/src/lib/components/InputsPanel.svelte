<script lang="ts">
	import type { SimResult, TaxConstants, Region } from '@b2bsim/engine';
	import { t, tf, pick, fmtEur, locale } from '$lib/i18n';
	import { calc, setMunicipality, setCustomMuni, applyPreset, optimise, PRESETS } from '$lib/state.svelte';
	import Slider from './Slider.svelte';
	import XField from './XField.svelte';

	type MuniName = { code: string; name: string; district: string; region: string };
	interface Props {
		result: SimResult;
		constants: TaxConstants;
		regions: Record<string, Region>;
		municipalities: MuniName[];
	}
	let { result, constants, regions, municipalities }: Props = $props();

	const p = $derived(calc.params);
	const revenue = $derived(p.hourlyRate * p.hoursPerDay * p.daysPerYear);
	const salAnnual = $derived(p.salary * 14);
	const monthU = $derived('€' + t('sfx_mo'));
	const yearU = $derived('€' + t('sfx_yr'));

	let optNote = $state('');
	let optimising = $state(false);

	function daysEquivText(days: number) {
		const weeks = Math.round(days / 5);
		const months = Math.round(days / 21.7);
		return `${t('approx')} ${weeks} ${t('weeks')} · ${months} ${t('months_work')}`;
	}

	// Picker <optgroup>s from municipality NAMES (no rates): continente by district, then islands.
	const muniGroups = $derived.by(() => {
		const byName = (a: MuniName, b: MuniName) => a.name.localeCompare(b.name, 'pt');
		const byDist: Record<string, MuniName[]> = {};
		for (const m of municipalities) if (m.region === 'continente') (byDist[m.district] ??= []).push(m);
		const groups = Object.keys(byDist)
			.sort((a, b) => a.localeCompare(b, 'pt'))
			.map((d) => ({ label: d, items: byDist[d].slice().sort(byName) }));
		for (const reg of ['acores', 'madeira'] as const) {
			const ms = municipalities.filter((m) => m.region === reg);
			if (ms.length) groups.push({ label: regions[reg] ? pick(regions[reg].label_pt, regions[reg].label_en) : reg, items: ms.slice().sort(byName) });
		}
		return groups;
	});

	// The selected municipality's effective rates come from the server result (one row, not the table).
	const muniActive = $derived.by(() => {
		const reg = regions[result.region];
		const dTxt = result.effectiveDerrama === 0 ? '0%' : (result.effectiveDerrama * 100).toFixed(2) + '%';
		return tf('in_muni_active', {
			d: dTxt,
			p: (result.lisbonRebatePct * 100).toFixed(0) + '%',
			region: reg ? pick(reg.label_pt, reg.label_en) : result.region,
			iva: reg ? reg.iva[0] + '%' : ''
		});
	});

	const mealYear = $derived(fmtEur(constants.meal.card_exempt * constants.meal.days_per_month * constants.meal.months_per_year));

	async function runOptimise() {
		optimising = true;
		const r = await optimise(locale());
		optimising = false;
		if (r) optNote = tf('opt_result', { sal: fmtEur(r.salary), net: fmtEur(r.net) });
	}
</script>

<h2 class="section-h2 section-h2--first">{t('in_adjust')}</h2>
<div class="control-card">
	<div class="ctrl-grid">
		<div class="ctrl-block">
			<div class="ctrl-readout">
				<div class="ro-label">{t('in_gross_rev')}</div>
				<div class="ro-value">{fmtEur(revenue)}</div>
				<div class="ro-sub">{fmtEur(revenue / 12)}{t('sfx_mo')} · {fmtEur(p.hourlyRate * p.hoursPerDay)}{t('sfx_day')}</div>
			</div>
			<Slider id="inp-hourlyRate" label={t('in_rate')} unit="€/h" min={10} max={200} step={0.5} bind:value={calc.params.hourlyRate} />
			<div class="ctrl-duo">
				<Slider id="inp-hoursPerDay" label={t('in_hours')} unit="h" min={1} max={12} step={1} bind:value={calc.params.hoursPerDay} />
				<Slider id="inp-daysPerYear" label={t('in_days')} unit={t('word_days')} min={100} max={260} step={1} bind:value={calc.params.daysPerYear} sub={daysEquivText(p.daysPerYear)} />
			</div>
		</div>
		<div class="ctrl-block">
			<div class="ctrl-readout">
				<div class="ro-label">{t('in_sal_h')}</div>
				<div class="ro-value">{fmtEur(salAnnual)}</div>
				<div class="ro-sub">{t('in_ss_company')} ({(constants.ss.moe_employer * 100).toFixed(2)}%): {fmtEur(salAnnual * constants.ss.moe_employer)}{t('sfx_yr')}</div>
			</div>
			<Slider id="inp-salary" label={t('in_sal_gross')} unit={monthU + ' x 14'} min={537} max={10000} step={50} bind:value={calc.params.salary} />
			<div class="opt-row">
				<button type="button" class="opt-btn" onclick={runOptimise} disabled={optimising}>{t('opt_btn')}</button>
				<span class="opt-note">{optNote}</span>
			</div>
			<div class="ctrl-options">
				<label class="switch">
					<input type="checkbox" bind:checked={calc.params.ss_first_year_exempt} />
					<span class="switch-track" aria-hidden="true"></span>
					<span class="switch-text">{t('in_ss1')}<span class="switch-info">{t('in_ss1_info')}</span></span>
				</label>
			</div>
		</div>
	</div>
	<div class="ctrl-selects">
		<div class="ctrl-field">
			<label for="inp-municipality">{t('in_municipality')}</label>
			<select id="inp-municipality" value={p.municipality} onchange={(e) => setMunicipality(e.currentTarget.value)}>
				{#each muniGroups as g (g.label)}
					<optgroup label={g.label}>
						{#each g.items as m (m.code)}<option value={m.code}>{m.name}</option>{/each}
					</optgroup>
				{/each}
				<option value="custom">{t('in_muni_custom')}</option>
			</select>
			<div class="muni-active">{muniActive}</div>
			{#if p.municipality === 'custom' && p.customMuni}
				{@const c = p.customMuni}
				<div class="muni-custom">
					<label>{t('in_muni_region')}<select value={c.region} onchange={(e) => setCustomMuni('region', e.currentTarget.value)}>
						<option value="continente">{pick('Continente', 'Mainland')}</option>
						<option value="acores">{pick('Açores', 'Azores')}</option>
						<option value="madeira">Madeira</option>
					</select></label>
					<label>{t('in_muni_derrama')} (%)<input type="number" step="0.01" min="0" value={+(c.derramaRate * 100).toFixed(4)} oninput={(e) => setCustomMuni('derramaRate', e.currentTarget.value)} /></label>
					<label>{t('in_muni_threshold')}<input type="number" step="1000" min="0" value={c.derramaThreshold} oninput={(e) => setCustomMuni('derramaThreshold', e.currentTarget.value)} /></label>
					<label>{t('in_muni_devolution')} (%)<input type="number" step="0.5" min="0" max="5" value={+(c.participacaoDevolution * 100).toFixed(2)} oninput={(e) => setCustomMuni('participacaoDevolution', e.currentTarget.value)} /></label>
				</div>
			{/if}
			<div class="muni-note">{t('in_muni_note')}</div>
		</div>
		<div class="ctrl-field">
			<label for="inp-dividend-method">{t('in_div')} <span class="ctrl-unit">Lda.</span></label>
			<select id="inp-dividend-method" bind:value={calc.params.dividendMethodMode}>
				<option value="auto">{t('in_div_auto')}</option>
				<option value="englobamento">{t('in_div_eng')}</option>
				<option value="liberatoria">{t('in_div_lib')}</option>
			</select>
			<details class="field-hint"><summary>{t('in_div_hint_q')}</summary><p>{t('in_div_hint_p')}</p></details>
		</div>
		<div class="ctrl-field">
			<label for="inp-clientloc">{t('in_client')} <span class="ctrl-unit">{t('in_client_unit')}</span></label>
			<select id="inp-clientloc" bind:value={calc.params.clientLocation}>
				<option value="PT">{t('in_client_pt')}</option>
				<option value="UE">{t('in_client_ue')}</option>
				<option value="ForaUE">{t('in_client_out')}</option>
			</select>
			<details class="field-hint"><summary>{t('in_iva_hint_q')}</summary><p>{t('in_iva_hint_p')}</p></details>
		</div>
	</div>
</div>

<div class="presets-bar">
	<span class="presets-label">{t('in_presets')}</span>
	<div class="preset-chips">
		{#each Object.keys(PRESETS) as key (key)}
			<button type="button" class="preset-chip" class:is-active={calc.activePreset === key} data-preset={key} onclick={() => applyPreset(key)}>{t('preset_' + key)}</button>
		{/each}
	</div>
</div>

<details class="card expander perks-card">
	<summary>📋 {t('in_exp_title')} <span class="summary-hint">{t('in_exp_hint')}</span> <span class="chev">▾</span></summary>
	<div class="expander-body">
		<p class="perk-callout"><strong>{t('perk_callout_s')}</strong> {t('perk_callout_p')}</p>

		<div class="xgroup">
			<div class="xgroup-title">{t('grp_current')} <span class="xgroup-unit">{monthU}</span></div>
			<div class="xpanel">
				<XField label={t('pk_rent')} expKey="rent" step={50} bind:value={calc.params.expenses.rent} />
				<XField label={t('pk_util')} expKey="utilities" step={10} note={t('pk_util_note')} bind:value={calc.params.expenses.utilities} />
				<XField label={t('pk_internet')} expKey="internet" step={5} bind:value={calc.params.expenses.internet} />
				<XField label={t('pk_phone')} expKey="phone" step={5} bind:value={calc.params.expenses.phone} />
				<XField label={t('pk_software')} expKey="software" step={10} note={t('pk_software_note')} bind:value={calc.params.expenses.software} />
				<XField label={t('pk_other')} expKey="other" step={10} bind:value={calc.params.expenses.other} />
			</div>
		</div>

		<div class="xgroup">
			<div class="xgroup-title">{t('grp_perks')} <span class="xgroup-unit">{monthU}</span> <span class="xgroup-tag">{t('grp_perks_tag')}</span></div>
			<div class="xpanel">
				<XField label={t('pk_ev')} expKey="electricCar" step={25} badge={t('bdg_ta0')} badgeClass="ok" note={t('pk_ev_note')} bind:value={calc.params.expenses.electricCar} />
				<div class="xf xf-toggle" data-tip={t('pk_meal_tip')}>
					<div class="xf-head"><span class="xf-label">{t('pk_meal')}</span><span class="xf-badge ok">{t('bdg_exempt')}</span></div>
					<label class="xtoggle">
						<input type="checkbox" bind:checked={calc.params.mealCard} />
						<span class="switch-track" aria-hidden="true"></span>
						<span class="xtoggle-text">{mealYear}{t('sfx_yr')}</span>
					</label>
				</div>
				<XField label={t('pk_health')} expKey="healthInsurance" step={10} badge={t('bdg_deductible')} note={t('pk_health_note')} bind:value={calc.params.expenses.healthInsurance} />
				<XField label={t('pk_equip')} expKey="equipment" step={10} badge={t('bdg_deductible')} note={t('pk_equip_note')} bind:value={calc.params.expenses.equipment} />
				<XField label={t('pk_cowork')} expKey="coworking" step={10} badge={t('bdg_deductible')} note={t('pk_cowork_note')} bind:value={calc.params.expenses.coworking} />
				<XField label={t('pk_training')} expKey="training" step={100} unit={yearU} badge={t('bdg_deductible')} note={t('pk_training_note')} bind:value={calc.params.expenses.training} />
				<XField label={t('pk_repr')} expKey="representation" step={25} badge={t('bdg_ta10')} badgeClass="warn" note={t('pk_repr_note')} bind:value={calc.params.expenses.representation} />
			</div>
		</div>

		<div class="xgroup">
			<div class="xgroup-title">{t('grp_costs')} <span class="xgroup-unit">{monthU}</span></div>
			<div class="xpanel">
				<div class="xf" data-tip={t('pk_seguro_tip')}>
					<div class="xf-head"><span class="xf-label">{t('pk_seguro')}</span></div>
					<div class="xf-inwrap">
						<input
							type="number"
							class="xf-num"
							data-exp="seguroCombined"
							step="50"
							value={p.expenses.profInsurance + p.expenses.workAccidentIns}
							oninput={(e) => {
								const v = (parseFloat(e.currentTarget.value) || 0) / 2;
								calc.params.expenses.profInsurance = v;
								calc.params.expenses.workAccidentIns = v;
							}}
						/>
						<span class="xf-unit">{yearU}</span>
					</div>
				</div>
				<XField label={t('pk_acc_eni')} expKey="accountantENI" step={25} bind:value={calc.params.expenses.accountantENI} />
				<XField label={t('pk_acc_lda')} expKey="accountantLda" step={25} bind:value={calc.params.expenses.accountantLda} />
			</div>
		</div>
	</div>
</details>
