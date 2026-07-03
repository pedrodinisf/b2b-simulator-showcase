<script lang="ts">
	let { data } = $props();
</script>

<div class="tab-content active">{@html data.setup}{@html data.obligations}</div>
