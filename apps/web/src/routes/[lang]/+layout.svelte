<script lang="ts">
	import { page } from '$app/state';
	import { t, tf } from '$lib/i18n';
	import { ICON, LOGO_SVG } from '$lib/icons';

	let { data, children } = $props();

	// Tabs (overview/config deferred). Slugs are locale-independent route paths.
	const TABS = [
		{ key: 'overview', slug: 'resumo' },
		{ key: 'calculator', slug: '' },
		{ key: 'concepts', slug: 'concepts' },
		{ key: 'intl', slug: 'intl' },
		{ key: 'negotiation', slug: 'negotiation' },
		{ key: 'risks', slug: 'risks' },
		{ key: 'setup', slug: 'setup' },
		{ key: 'config', slug: 'config' }
	];

	const rest = $derived(page.url.pathname.replace(/^\/(pt|en)/, ''));
	const sub = $derived(rest.replace(/^\//, '').replace(/\/$/, ''));
	const today = $derived(new Date().toLocaleDateString(data.lang === 'en' ? 'en-GB' : 'pt-PT'));
</script>

<a href="#conteudo" class="skip-link">{t('shell_skip')}</a>
<div class="container" id="app">
	<header class="app-header">
		<div class="brand">
			<div class="brand-left">
				<div class="brand-logo" aria-hidden="true">{@html LOGO_SVG}</div>
				<div>
					<h1>{t('shell_h1')}</h1>
					<div class="brand-sub">{t('brand_sub')}</div>
					<div class="brand-scope">🇵🇹 {t('brand_scope')}</div>
				</div>
			</div>
			<div class="meta">
				<span class="pill">OE2026</span>
				<span class="pill">{t('shell_pill_law')}</span>
				<nav class="lang-switch" aria-label={t('lang_aria')}>
					<a class="lang-btn" class:active={data.lang === 'pt'} href="/pt{rest}" aria-current={data.lang === 'pt' ? 'page' : undefined}>PT</a>
					<a class="lang-btn" class:active={data.lang === 'en'} href="/en{rest}" aria-current={data.lang === 'en' ? 'page' : undefined}>EN</a>
				</nav>
				<a class="account-link" href="/{data.lang}/{data.user ? 'account' : 'login'}">
					{data.user ? t('nav_account') : t('nav_login')}
				</a>
			</div>
		</div>
		<nav class="tabs" aria-label={t('nav_aria')}>
			{#each TABS as tab (tab.key)}
				<a class="tab-btn" class:active={sub === tab.slug} href="/{data.lang}{tab.slug ? '/' + tab.slug : ''}" aria-current={sub === tab.slug ? 'page' : undefined}>
					{@html ICON[tab.key]}<span>{t('tab_' + tab.key)}</span>
				</a>
			{/each}
		</nav>
	</header>

	<main id="conteudo">
		{@render children()}
	</main>

	<div class="disclaimer-banner disclaimer-bottom">{@html t('shell_disclaimer')}</div>

	<footer>
		<p>{@html tf('shell_footer', { date: `<span class="tnum">${today}</span>` })}</p>
		<p class="footer-privacy">{@html t('shell_footer_privacy')} · <a href="/{data.lang}/privacy">{data.lang === 'en' ? 'Privacy' : 'Privacidade'}</a></p>
	</footer>
</div>

<style>
	.account-link {
		font-size: 0.85rem;
		font-weight: 600;
		text-decoration: none;
		padding: 4px 12px;
		border: 1px solid var(--border, #d4d4d8);
		border-radius: 999px;
		color: inherit;
		white-space: nowrap;
	}
	.account-link:hover {
		background: rgba(0, 0, 0, 0.05);
	}
</style>
