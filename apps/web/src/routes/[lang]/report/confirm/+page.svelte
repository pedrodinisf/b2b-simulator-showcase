<script lang="ts">
	import type { PageData } from './$types';
	import { pick } from '$lib/i18n';

	let { data }: { data: PageData } = $props();
</script>

<div class="tab-content active">
	<div class="card text-content">
		{#if data.status === 'confirmed'}
			<h2 class="section-h2 section-h2--first">{pick('Subscrição confirmada', 'Subscription confirmed')}</h2>
			<p>
				{pick(
					'Vais receber um aviso por email sempre que as regras fiscais que afetam os teus cenários mudarem. Podes cancelar a qualquer momento.',
					'You will be notified by email whenever the tax rules affecting your scenarios change. You can unsubscribe at any time.'
				)}
			</p>
		{:else if data.status === 'unsubscribed'}
			<h2 class="section-h2 section-h2--first">{pick('Subscrição cancelada', 'Subscription cancelled')}</h2>
			<p>{pick('Esta subscrição já tinha sido cancelada, por isso não vais receber avisos.', 'This subscription had already been cancelled, so you will not receive alerts.')}</p>
		{:else}
			<h2 class="section-h2 section-h2--first">{pick('Ligação inválida', 'Invalid link')}</h2>
			<p>{pick('Esta ligação de confirmação não é válida ou já expirou.', 'This confirmation link is not valid or has expired.')}</p>
		{/if}
	</div>
</div>
