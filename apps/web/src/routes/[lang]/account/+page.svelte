<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { t, tf } from '$lib/i18n';
	import { authClient } from '$lib/auth-client';
	import { calc, recompute } from '$lib/state.svelte';
	import { clampParams } from '$lib/params';
	import type { SimParams } from '@b2bsim/engine';

	type SavedScenario = { id: number; name: string; lang: string; params: SimParams; createdAt: string; updatedAt: string; alertSubscribed: boolean };

	let { data } = $props();
	const lang = $derived((page.data as { lang: 'pt' | 'en' }).lang);
	let signingOut = $state(false);

	async function signOut() {
		if (signingOut) return;
		signingOut = true;
		await authClient.signOut();
		await goto(`/${lang}`);
	}

	// --- Saved scenarios ---
	let scenarios = $state<SavedScenario[]>([]);
	let loadingList = $state(true);
	let name = $state('');
	let saveStatus = $state<'idle' | 'saving' | 'error'>('idle');
	let confirmingDeleteId = $state<number | null>(null);
	let busyId = $state<number | null>(null);

	async function loadList() {
		loadingList = true;
		try {
			const res = await fetch('/api/scenarios');
			if (res.ok) scenarios = ((await res.json()) as { scenarios: SavedScenario[] }).scenarios;
		} finally {
			loadingList = false;
		}
	}
	onMount(loadList);

	async function saveCurrent(e: SubmitEvent) {
		e.preventDefault();
		if (!name.trim() || saveStatus === 'saving') return;
		saveStatus = 'saving';
		try {
			const res = await fetch('/api/scenarios', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name, lang, params: calc.params })
			});
			if (!res.ok) throw new Error('save_failed');
			const { scenario } = (await res.json()) as { scenario: SavedScenario };
			scenarios = [scenario, ...scenarios];
			name = '';
			saveStatus = 'idle';
		} catch {
			saveStatus = 'error';
		}
	}

	async function loadScenario(s: SavedScenario) {
		busyId = s.id;
		clampParams(s.params, calc.params);
		await recompute(lang, true);
		await goto(`/${lang}`);
	}

	async function deleteScenario(id: number) {
		if (confirmingDeleteId !== id) {
			confirmingDeleteId = id;
			return;
		}
		busyId = id;
		try {
			const res = await fetch(`/api/scenarios?id=${id}`, { method: 'DELETE' });
			if (res.ok) scenarios = scenarios.filter((s) => s.id !== id);
		} finally {
			busyId = null;
			confirmingDeleteId = null;
		}
	}

	let alertError = $state<number | null>(null);
	let alertBusyId = $state<number | null>(null);

	async function toggleAlert(s: SavedScenario) {
		if (alertBusyId === s.id) return;
		alertBusyId = s.id;
		alertError = null;
		try {
			const res = s.alertSubscribed
				? await fetch(`/api/scenarios/alert?savedScenarioId=${s.id}`, { method: 'DELETE' })
				: await fetch('/api/scenarios/alert', {
						method: 'POST',
						headers: { 'content-type': 'application/json' },
						body: JSON.stringify({ savedScenarioId: s.id })
					});
			if (res.ok) {
				scenarios = scenarios.map((x) => (x.id === s.id ? { ...x, alertSubscribed: !x.alertSubscribed } : x));
			} else {
				alertError = s.id;
			}
		} catch {
			alertError = s.id;
		} finally {
			alertBusyId = null;
		}
	}
</script>

<section class="auth-card">
	<h2>{t('auth_account_h')}</h2>
	<p>{t('auth_signed_in_as')} <strong>{data.email}</strong></p>
	<button onclick={signOut} disabled={signingOut}>{t('auth_signout_btn')}</button>
</section>

<section class="auth-card">
	<h2>{t('sv_save_h')}</h2>
	<form onsubmit={saveCurrent}>
		<label for="sv-name">{t('sv_name_label')}</label>
		<input id="sv-name" type="text" maxlength="120" placeholder={t('sv_name_placeholder')} bind:value={name} required />
		<button type="submit" disabled={saveStatus === 'saving'}>{saveStatus === 'saving' ? t('sv_saving') : t('sv_save_btn')}</button>
	</form>
	{#if saveStatus === 'error'}<p class="err">{t('sv_save_error')}</p>{/if}
</section>

<section class="auth-card">
	<h2>{t('sv_h')}</h2>
	{#if !loadingList && scenarios.length === 0}
		<p>{t('sv_empty')}</p>
	{:else}
		<ul class="scenario-list">
			{#each scenarios as s (s.id)}
				<li>
					<div class="scenario-name">{s.name}</div>
					<div class="scenario-summary">
						{tf('sv_summary', { rate: '€' + s.params.hourlyRate, hours: s.params.hoursPerDay, days: s.params.daysPerYear, muni: s.params.municipality })}
					</div>
					<label class="scenario-alert">
						<input type="checkbox" checked={s.alertSubscribed} disabled={alertBusyId === s.id} onchange={() => toggleAlert(s)} />
						<span>{t('sv_alert_label')}</span>
					</label>
					{#if alertError === s.id}<p class="err">{t('sv_alert_error')}</p>{/if}
					<div class="scenario-actions">
						<button type="button" onclick={() => loadScenario(s)} disabled={busyId === s.id}>{t('sv_load_btn')}</button>
						<button type="button" class="danger" onclick={() => deleteScenario(s.id)} disabled={busyId === s.id}>
							{confirmingDeleteId === s.id ? t('sv_delete_confirm_btn') : t('sv_delete_btn')}
						</button>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.auth-card {
		max-width: 480px;
		margin: 1.25rem auto;
		padding: 1.75rem;
		border: 1px solid var(--border, #d4d4d8);
		border-radius: 12px;
	}
	.auth-card h2 {
		margin-top: 0;
	}
	button {
		margin-top: 0.5rem;
		padding: 0.6rem 1rem;
		border: 1px solid var(--border, #d4d4d8);
		border-radius: 8px;
		background: transparent;
		font-weight: 600;
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.6;
		cursor: default;
	}
	form {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	label {
		font-weight: 600;
		font-size: 0.9rem;
	}
	input {
		padding: 0.6rem 0.75rem;
		border: 1px solid var(--border, #d4d4d8);
		border-radius: 8px;
		font-size: 1rem;
	}
	.err {
		color: #b91c1c;
	}
	.scenario-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.scenario-list li {
		padding: 0.75rem;
		border: 1px solid var(--border, #d4d4d8);
		border-radius: 8px;
	}
	.scenario-name {
		font-weight: 600;
	}
	.scenario-summary {
		font-size: 0.85rem;
		color: #666;
		margin: 0.15rem 0 0.5rem;
	}
	.scenario-alert {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.85rem;
		cursor: pointer;
		margin-bottom: 0.5rem;
	}
	.scenario-actions {
		display: flex;
		gap: 0.5rem;
	}
	.scenario-actions button {
		margin-top: 0;
		padding: 0.4rem 0.8rem;
		font-size: 0.85rem;
	}
	button.danger {
		border-color: #b91c1c;
		color: #b91c1c;
	}
</style>
