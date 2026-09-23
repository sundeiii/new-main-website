<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/env';

	let visible = false;

	onMount(() => {
		if (browser) {
			visible = true;
		}
	});
</script>

{#if visible}
	<div class="mesh fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
		<div class="mesh-layer layer-1"></div>
		<div class="mesh-layer layer-2"></div>
		<div class="mesh-layer layer-3"></div>
		<div class="noise-overlay"></div>
	</div>
{/if}

<style>
	.mesh {
		contain: strict;
	}

	.mesh-layer {
		position: absolute;
		inset: -50%;
		width: 200%;
		height: 200%;
		opacity: 0.15;
		/* Keep each layer on its own GPU layer so the animation only moves an
		   already-painted texture instead of repainting 4x-viewport gradients. */
		will-change: transform;
		backface-visibility: hidden;
	}

	:global(.dark) .mesh-layer {
		opacity: 0.10;
	}

	.layer-1 {
		background: 
			radial-gradient(ellipse 80% 50% at 20% 30%, #8FA1B3 0%, transparent 50%),
			radial-gradient(ellipse 60% 80% at 80% 20%, #96B5B4 0%, transparent 50%),
			radial-gradient(ellipse 70% 60% at 70% 80%, #B48EAD 0%, transparent 50%);
		animation: mesh-move-1 30s ease-in-out infinite alternate;
	}

	.layer-2 {
		background: 
			radial-gradient(ellipse 50% 70% at 30% 70%, #A3BE8C 0%, transparent 50%),
			radial-gradient(ellipse 80% 40% at 60% 40%, #EBCB8B 0%, transparent 50%),
			radial-gradient(ellipse 60% 60% at 10% 50%, #96B5B4 0%, transparent 50%);
		animation: mesh-move-2 35s ease-in-out infinite alternate;
	}

	.layer-3 {
		background: 
			radial-gradient(ellipse 40% 80% at 50% 10%, #8FA1B3 0%, transparent 50%),
			radial-gradient(ellipse 70% 50% at 90% 60%, #AB7967 0%, transparent 50%);
		animation: mesh-move-3 25s ease-in-out infinite alternate;
		opacity: 0.10;
	}

	:global(.dark) .layer-3 {
		opacity: 0.07;
	}

	/* Secret trans theme (type `tf` in the console) */
	:global(.trans) .layer-1 {
		background:
			radial-gradient(ellipse 80% 50% at 20% 30%, #5BCEFA 0%, transparent 50%),
			radial-gradient(ellipse 60% 80% at 80% 20%, #F5A9B8 0%, transparent 50%),
			radial-gradient(ellipse 70% 60% at 70% 80%, #5BCEFA 0%, transparent 50%);
	}

	:global(.trans) .layer-2 {
		background:
			radial-gradient(ellipse 50% 70% at 30% 70%, #F5A9B8 0%, transparent 50%),
			radial-gradient(ellipse 80% 40% at 60% 40%, #FFFFFF 0%, transparent 50%),
			radial-gradient(ellipse 60% 60% at 10% 50%, #5BCEFA 0%, transparent 50%);
	}

	:global(.trans) .layer-3 {
		background:
			radial-gradient(ellipse 40% 80% at 50% 10%, #F5A9B8 0%, transparent 50%),
			radial-gradient(ellipse 70% 50% at 90% 60%, #5BCEFA 0%, transparent 50%);
	}

	:global(.trans) .mesh-layer {
		opacity: 0.28;
	}

	:global(.dark.trans) .mesh-layer {
		opacity: 0.16;
	}

	/* Subtle noise texture to break up banding */
	.noise-overlay {
		position: absolute;
		inset: 0;
		opacity: 0.03;
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
		background-repeat: repeat;
		background-size: 256px 256px;
	}

	:global(.dark) .noise-overlay {
		opacity: 0.04;
	}

	@keyframes mesh-move-1 {
		0% { transform: translate(0%, 0%) rotate(0deg) scale(1); }
		50% { transform: translate(5%, 8%) rotate(10deg) scale(1.05); }
		100% { transform: translate(-3%, 4%) rotate(-5deg) scale(0.97); }
	}

	@keyframes mesh-move-2 {
		0% { transform: translate(0%, 0%) rotate(0deg) scale(1); }
		50% { transform: translate(-6%, -4%) rotate(-8deg) scale(1.03); }
		100% { transform: translate(4%, -6%) rotate(6deg) scale(0.98); }
	}

	@keyframes mesh-move-3 {
		0% { transform: translate(0%, 0%) rotate(0deg) scale(1); }
		50% { transform: translate(3%, 6%) rotate(12deg) scale(1.06); }
		100% { transform: translate(-5%, 2%) rotate(-4deg) scale(0.95); }
	}

	@media (prefers-reduced-motion: reduce) {
		.mesh-layer {
			animation: none !important;
		}
	}
</style>
