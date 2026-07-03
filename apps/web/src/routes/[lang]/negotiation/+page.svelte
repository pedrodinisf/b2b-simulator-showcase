<script lang="ts">
	import { t } from '$lib/i18n';

	let { data } = $props();
	const prioLabel = (p: string) => (p === 'high' ? t('neg_prio_high') : p === 'med' ? t('neg_prio_med') : t('neg_prio_low'));
</script>

<div class="tab-content active">
	<h2 class="section-h2">{t('neg_h2')}</h2>
	<div class="alert info"><span class="icon">💡</span><div class="content">{@html t('neg_intro')}</div></div>

	{#each data.sections as section, idx (idx)}
		<div class="checklist-section">
			<div class="checklist-section-title">
				<span class="num">{idx + 1}</span>
				<h3>{section.section}</h3>
				<span class="priority {section.priority}">{prioLabel(section.priority)}</span>
			</div>
			<p class="text-dim" style="font-size: 12px; margin-bottom: 10px;">{section.desc}</p>
			{#each section.items as item, i (i)}
				<div class="checklist-item">
					<input type="checkbox" id="neg-{idx}-{i}" />
					<div class="text">
						<strong>{item.strong}</strong>
						{@html item.text}
						{#if item.source}<span class="source">📎 {item.source}</span>{/if}
					</div>
				</div>
			{/each}
		</div>
	{/each}
</div>
