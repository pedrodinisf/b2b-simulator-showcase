<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { env } from '$env/dynamic/public';

	let { children } = $props();

	// Cookieless analytics (Umami/Plausible), loaded only when configured via env.
	// Sets no cookies and no personal identifiers; absent until PUBLIC_ANALYTICS_SRC is set.
	onMount(() => {
		const src = env.PUBLIC_ANALYTICS_SRC;
		if (!src || document.querySelector('script[data-analytics]')) return;
		const s = document.createElement('script');
		s.defer = true;
		s.src = src;
		s.setAttribute('data-analytics', '');
		if (env.PUBLIC_ANALYTICS_WEBSITE_ID) s.setAttribute('data-website-id', env.PUBLIC_ANALYTICS_WEBSITE_ID);
		document.head.appendChild(s);
	});
</script>

<svelte:head>
	<title>B2B Simulator 2026</title>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
