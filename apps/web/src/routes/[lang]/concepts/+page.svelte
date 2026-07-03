<script lang="ts">
	import { t } from '$lib/i18n';

	let { data } = $props();

	let query = $state('');
	const q = $derived(query.trim().toLowerCase());
	const matches = (term: string, def: string) => !q || term.toLowerCase().includes(q) || def.toLowerCase().includes(q);
</script>

<div class="tab-content active">
	<div class="concept-layout">
		<aside>
			<div class="concept-nav">
				<div class="nav-title">{t('conc_nav')}</div>
				{#each data.concepts as c (c.id)}<a href="#concept-{c.id}">{c.icon} {c.title}</a>{/each}
				<a href="#concept-glossario">📖 {t('conc_glossary')}</a>
			</div>
		</aside>
		<div>
			{#each data.concepts as c (c.id)}
				<div class="card" id="concept-{c.id}" style="scroll-margin-top: 140px;">
					<div class="card-title">{c.icon} {c.title}</div>
					<div class="text-content">{@html c.content}</div>
				</div>
			{/each}
			<div class="card" id="concept-glossario" style="scroll-margin-top: 140px;">
				<div class="card-title">📖 {t('conc_glossary')}</div>
				<p class="text-dim" style="font-size: 13px; margin-bottom: 14px;">{t('conc_gloss_intro')}</p>
				<input type="text" class="glossary-search" placeholder={t('conc_gloss_ph')} aria-label={t('conc_gloss_aria')} bind:value={query} />
				<div id="glossary-list">
					{#each data.glossary as g (g.id)}
						<div class="glossary-item" id="g-{g.id}" style:display={matches(g.term, g.def) ? '' : 'none'}>
							<div class="term">{g.term}</div>
							<div class="def">{@html g.def}</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>
