<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import HydraBootIntro from '$lib/components/HydraBootIntro.svelte';

	let { children } = $props();

	let dashboardState = $state<'hidden' | 'revealing' | 'revealed'>('hidden');
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<HydraBootIntro onStateChange={(s) => (dashboardState = s)} />

<div id="hydra-dashboard" class="dashboard-{dashboardState}">
	{@render children()}
</div>

<style>
	#hydra-dashboard {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		width: 100%;
		transition:
			opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1),
			filter 0.65s cubic-bezier(0.16, 1, 0.3, 1),
			transform 0.65s cubic-bezier(0.16, 1, 0.3, 1);
	}
	.dashboard-hidden {
		opacity: 0;
		filter: blur(8px);
		transform: scale(0.985);
	}
	.dashboard-revealing {
		opacity: 1;
		filter: blur(0);
		transform: scale(1);
	}
	.dashboard-revealed {
		opacity: 1;
		filter: blur(0);
		transform: scale(1);
		transition: none; /* Already settled */
	}
</style>
