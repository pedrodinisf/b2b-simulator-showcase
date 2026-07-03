<script lang="ts">
	// One dense expense/perk input cell (ports xfield()). data-tip becomes the styled hover tip.
	interface Props {
		label: string;
		expKey: string;
		value: number;
		step: number;
		unit?: string;
		badge?: string;
		badgeClass?: string;
		note?: string;
	}
	let {
		label,
		expKey,
		value = $bindable(),
		step,
		unit = '',
		badge = '',
		badgeClass = 'muted',
		note = ''
	}: Props = $props();
</script>

<div class="xf" data-tip={note ? `${label}. ${note}` : undefined}>
	<div class="xf-head">
		<span class="xf-label">{label}</span>
		{#if badge}<span class="xf-badge {badgeClass}">{badge}</span>{/if}
	</div>
	<div class="xf-inwrap">
		<input type="number" class="xf-num" data-exp={expKey} {step} bind:value />
		<span class="xf-unit">{unit}</span>
	</div>
</div>
