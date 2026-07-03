<script lang="ts">
	import { page } from '$app/state';
	import { t } from '$lib/i18n';
	import { authClient } from '$lib/auth-client';

	const lang = $derived((page.data as { lang: 'pt' | 'en' }).lang);
	let email = $state('');
	let status = $state<'idle' | 'sending' | 'sent' | 'error'>('idle');

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (!email || status === 'sending') return;
		status = 'sending';
		const { error } = await authClient.signIn.magicLink({
			email,
			callbackURL: `/${lang}/account`
		});
		status = error ? 'error' : 'sent';
	}
</script>

<section class="auth-card">
	<h2>{t('auth_login_h')}</h2>

	{#if status === 'sent'}
		<p class="ok">{t('auth_login_sent')}</p>
	{:else}
		<p>{t('auth_login_intro')}</p>
		<form onsubmit={submit}>
			<label for="auth-email">{t('auth_email_label')}</label>
			<input
				id="auth-email"
				name="email"
				type="email"
				autocomplete="email"
				required
				bind:value={email}
			/>
			<button type="submit" disabled={status === 'sending'}>
				{status === 'sending' ? t('auth_login_sending') : t('auth_login_btn')}
			</button>
		</form>
		{#if status === 'error'}<p class="err">{t('auth_login_error')}</p>{/if}
	{/if}
</section>

<style>
	.auth-card {
		max-width: 420px;
		margin: 2rem auto;
		padding: 1.75rem;
		border: 1px solid var(--border, #d4d4d8);
		border-radius: 12px;
	}
	.auth-card h2 {
		margin-top: 0;
	}
	form {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-top: 1rem;
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
	button {
		margin-top: 0.5rem;
		padding: 0.65rem 1rem;
		border: none;
		border-radius: 8px;
		background: #1a1a1a;
		color: #fff;
		font-weight: 600;
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.6;
		cursor: default;
	}
	.ok {
		color: #15803d;
	}
	.err {
		color: #b91c1c;
	}
</style>
