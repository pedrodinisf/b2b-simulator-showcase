<script lang="ts">
	// The calculator. Inputs live in the client store; results are computed on the SERVER
	// (/api/simulate) so the municipality rate table never reaches the browser. The first
	// paint uses the server-computed default (data.result); changes trigger a debounced recompute.
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import InputsPanel from '$lib/components/InputsPanel.svelte';
	import Results from '$lib/components/Results.svelte';
	import EmailReport from '$lib/components/EmailReport.svelte';
	import MultiYearProjection from '$lib/components/MultiYearProjection.svelte';
	import { applyEncoded } from '$lib/share';
	import { calc, recompute } from '$lib/state.svelte';

	let { data } = $props();

	// Prefer the client-fetched result; fall back to the SSR default from the server load.
	const result = $derived(calc.currentResult ?? data.result);
	const sensitivity = $derived(calc.sensitivity ?? data.sensitivity);
	const constants = $derived(calc.T ?? data.constants);

	let lastHash = JSON.stringify({ p: calc.params, t: calc.T });
	let timer: ReturnType<typeof setTimeout>;

	onMount(() => {
		const m = location.hash.match(/#s=(.+)$/);
		if (m) applyEncoded(m[1], calc.params);
	});

	// Debounced server recompute on any input/constant change. The initial (unchanged)
	// state is skipped — the SSR default (data.result) is already shown.
	$effect(() => {
		const h = JSON.stringify({ p: calc.params, t: calc.T });
		clearTimeout(timer);
		timer = setTimeout(() => {
			if (h === lastHash) return;
			lastHash = h;
			recompute(page.data.lang, true);
		}, 400);
		return () => clearTimeout(timer);
	});
</script>

<div id="tab-calculator" class="tab-content active">
	<div id="calc-inputs"><InputsPanel {result} {constants} regions={data.regions} municipalities={data.municipalities} /></div>
	<div id="calc-results">
		<Results {result} {sensitivity} regions={data.regions} />
		<MultiYearProjection />
		<EmailReport source="calculator" />
	</div>
</div>
