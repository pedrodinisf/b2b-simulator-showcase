<script lang="ts">
	// Paired range + number input editing one value; bind:value keeps them in sync
	// (replaces the original sliderField's manual oninput cross-updates).
	interface Props {
		id: string;
		label: string;
		unit?: string;
		min: number;
		max: number;
		step: number;
		value: number;
		sub?: string;
	}
	let { id, label, unit = '', min, max, step, value = $bindable(), sub = '' }: Props = $props();
</script>

<div class="ctrl">
	<div class="ctrl-head"><label for={id}>{label}</label><span class="ctrl-unit">{unit}</span></div>
	<div class="ctrl-row">
		<input type="range" class="ctrl-range" {id} {min} {max} {step} aria-label={label} bind:value />
		<input type="number" class="ctrl-num" {min} {max} {step} bind:value />
	</div>
	{#if sub}<div class="ctrl-sub">{sub}</div>{/if}
</div>
