<script lang="ts">
	import type { PageData } from './$types';
	import { pick } from '$lib/i18n';

	let { data }: { data: PageData } = $props();
</script>

<div class="tab-content active">
	<div class="card text-content">
		{#if data.status === 'done'}
			<h2 class="section-h2 section-h2--first">{pick('Subscrição cancelada', 'Unsubscribed')}</h2>
			<p>
				{pick(
					'Deixaste de estar subscrito aos avisos de alterações fiscais. Não te vamos enviar mais emails.',
					'You have been removed from the law-change alerts. We will not send you any further emails.'
				)}
			</p>
		{:else}
			<h2 class="section-h2 section-h2--first">{pick('Ligação inválida', 'Invalid link')}</h2>
			<p>{pick('Esta ligação de cancelamento não é válida.', 'This unsubscribe link is not valid.')}</p>
		{/if}
	</div>
</div>
