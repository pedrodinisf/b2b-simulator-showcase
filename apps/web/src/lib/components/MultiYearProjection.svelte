<script lang="ts">
	import { pick, fmtEur } from '$lib/i18n';
	import { fetchProjection } from '$lib/state.svelte';
	import type { FiveYearProjection } from '@b2bsim/engine';

	let status = $state<'idle' | 'loading' | 'ok' | 'error'>('idle');
	let projection = $state<FiveYearProjection | null>(null);

	async function run() {
		if (status === 'loading') return;
		status = 'loading';
		const p = await fetchProjection();
		if (p) {
			projection = p;
			status = 'ok';
		} else {
			status = 'error';
		}
	}

	const rows = $derived(
		projection
			? [
					{ label: pick('ENI Simplificado (Ano 1 a 3+)', 'Simplified ENI (Year 1 to 3+)'), row: projection.eniSimplificado },
					{ label: pick('ENI Contabilidade Organizada', 'ENI (organised accounts)'), row: projection.eniOrganizada },
					{ label: pick('Unipessoal Lda. (salário atual)', 'Unipessoal Lda. (current salary)'), row: projection.lda }
				]
			: []
	);
</script>

<div class="card projection-panel">
	<h3 class="section-h3">{pick('Projeção a 5 anos', '5-year projection')}</h3>
	<p class="pj-sub">
		{pick(
			'Valores nominais (sem atualização de faturação), com base nos teus números atuais.',
			'Nominal values (no revenue growth assumed), based on your current numbers.'
		)}
	</p>

	{#if status === 'idle'}
		<button class="pj-btn" type="button" onclick={run}>{pick('Ver projeção', 'See projection')}</button>
	{:else if status === 'loading'}
		<p class="pj-sub">{pick('A calcular…', 'Calculating…')}</p>
	{:else if status === 'error'}
		<p class="pj-error">{pick('Não foi possível calcular a projeção. Tenta novamente.', 'We could not calculate the projection. Please try again.')}</p>
		<button class="pj-btn" type="button" onclick={run}>{pick('Tentar novamente', 'Try again')}</button>
	{:else}
		<div class="pj-table-wrap">
			<table class="pj-table">
				<thead>
					<tr>
						<th>{pick('Regime', 'Regime')}</th>
						{#each projection?.eniSimplificado.years ?? [] as y (y)}
							<th>{pick('Ano', 'Year')} {y}</th>
						{/each}
						<th>{pick('Total 5 anos', '5-year total')}</th>
					</tr>
				</thead>
				<tbody>
					{#each rows as r (r.label)}
						<tr>
							<td class="pj-label">{r.label}</td>
							{#each r.row.net as n, i (i)}
								<td class="mono">{fmtEur(n)}</td>
							{/each}
							<td class="mono pj-total">{fmtEur(r.row.cumulative[r.row.cumulative.length - 1])}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<button class="pj-btn pj-refresh" type="button" onclick={run}>{pick('Atualizar', 'Refresh')}</button>
	{/if}
</div>

<style>
	.projection-panel {
		margin-top: 16px;
	}
	.pj-sub {
		color: var(--text-dim, #666);
		font-size: 14px;
		margin: 4px 0 12px;
	}
	.pj-btn {
		padding: 10px 18px;
		border: none;
		border-radius: 8px;
		background: var(--accent, #0b5fff);
		color: #fff;
		font-size: 15px;
		font-weight: 600;
		cursor: pointer;
	}
	.pj-refresh {
		margin-top: 12px;
		background: transparent;
		border: 1px solid var(--border, #d1d5db);
		color: var(--text, #1a1a1a);
	}
	.pj-error {
		color: var(--red, #c0392b);
		font-size: 14px;
		margin: 0 0 10px;
	}
	.pj-table-wrap {
		overflow-x: auto;
	}
	.pj-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 14px;
	}
	.pj-table th,
	.pj-table td {
		padding: 8px 10px;
		text-align: right;
		border-bottom: 1px solid var(--border, #e5e7eb);
		white-space: nowrap;
	}
	.pj-table th:first-child,
	.pj-label {
		text-align: left;
	}
	.pj-total {
		font-weight: 700;
	}
</style>
