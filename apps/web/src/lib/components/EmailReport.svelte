<script lang="ts">
	import { page } from '$app/state';
	import { pick } from '$lib/i18n';
	import { sendReport } from '$lib/state.svelte';

	let { source = 'calculator' }: { source?: string } = $props();

	let email = $state('');
	let alertsConsent = $state(false);
	let status = $state<'idle' | 'sending' | 'ok' | 'error'>('idle');
	let errorKind = $state('');

	const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	async function submit(e: Event) {
		e.preventDefault();
		if (status === 'sending') return;
		if (!EMAIL_RE.test(email.trim())) {
			status = 'error';
			errorKind = 'invalid_email';
			return;
		}
		status = 'sending';
		const r = await sendReport((page.data as { lang: string }).lang, email.trim(), alertsConsent, source);
		if (r.ok) {
			status = 'ok';
		} else {
			status = 'error';
			errorKind = r.error ?? 'send_failed';
		}
	}

	const errorMsg = $derived(
		errorKind === 'invalid_email'
			? pick('Verifica o endereço de email.', 'Please check the email address.')
			: errorKind === 'rate_limited' || errorKind === 'quota'
				? pick('Demasiados pedidos. Tenta novamente mais tarde.', 'Too many requests. Please try again later.')
				: pick('Não foi possível enviar. Tenta novamente.', 'We could not send it. Please try again.')
	);
</script>

<div class="card email-report">
	{#if status === 'ok'}
		<h3 class="section-h3">{pick('Relatório a caminho', 'Report on its way')}</h3>
		<p class="er-sub">
			{pick('Enviámos o relatório para ', 'We have sent the report to ')}<strong>{email}</strong>{pick('. Verifica também a pasta de spam.', '. Do check your spam folder too.')}
		</p>
		{#if alertsConsent}
			<p class="er-sub">{pick('Para receberes avisos de alterações à lei, confirma a subscrição na ligação do email.', 'To receive law-change alerts, confirm your subscription via the link in the email.')}</p>
		{/if}
	{:else}
		<h3 class="section-h3">{pick('Recebe este relatório por email', 'Get this report by email')}</h3>
		<p class="er-sub">
			{pick(
				'Enviamos-te uma comparação dos 8 cenários (PDF incluído) para o teu email. Sem spam.',
				'We will email you a comparison of all 8 scenarios (PDF included). No spam.'
			)}
		</p>
		<form class="er-form" onsubmit={submit}>
			<input
				class="er-input"
				type="email"
				bind:value={email}
				placeholder={pick('o-teu@email.pt', 'you@email.com')}
				autocomplete="email"
				required
				aria-label={pick('Email', 'Email')}
			/>
			<button class="er-btn" type="submit" disabled={status === 'sending'}>
				{status === 'sending' ? pick('A enviar…', 'Sending…') : pick('Enviar relatório', 'Send report')}
			</button>
		</form>
		<label class="er-check">
			<input type="checkbox" bind:checked={alertsConsent} />
			<span>{pick('Avisem-me quando as regras fiscais que afetam estes cenários mudarem.', 'Notify me when the tax rules affecting these scenarios change.')}</span>
		</label>
		{#if status === 'error'}
			<p class="er-error">{errorMsg}</p>
		{/if}
	{/if}
</div>

<style>
	.email-report {
		margin-top: 16px;
	}
	.er-sub {
		color: var(--text-dim, #666);
		font-size: 14px;
		margin: 4px 0 0;
	}
	.er-form {
		display: flex;
		gap: 8px;
		margin-top: 12px;
		flex-wrap: wrap;
	}
	.er-input {
		flex: 1 1 220px;
		min-width: 0;
		padding: 10px 12px;
		border: 1px solid var(--border, #d1d5db);
		border-radius: 8px;
		font-size: 15px;
		background: var(--bg-input, #fff);
		color: var(--text, #1a1a1a);
	}
	.er-btn {
		padding: 10px 18px;
		border: none;
		border-radius: 8px;
		background: var(--accent, #0b5fff);
		color: #fff;
		font-size: 15px;
		font-weight: 600;
		cursor: pointer;
	}
	.er-btn:disabled {
		opacity: 0.6;
		cursor: default;
	}
	.er-check {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		margin-top: 10px;
		font-size: 13px;
		color: var(--text-dim, #666);
		cursor: pointer;
	}
	.er-check input {
		margin-top: 2px;
	}
	.er-error {
		color: var(--red, #c0392b);
		font-size: 14px;
		margin: 10px 0 0;
	}
</style>
