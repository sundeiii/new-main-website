<script lang="ts">
	// At night (22:00–6:00 for the visitor): faint stars over the page, and now and then a shooting
	// star. Off in /admin → cozy, or per visitor from ctrl+k. Still stars only for reduced motion.
	// ?night shows it any time (for checking).
	import { onDestroy, onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { cozy, isNight, nightSkyOff, prefersReducedMotion } from './cozy';
	import { snowOff, snowSeason } from '$lib/components/site/Seasonal.svelte';

	let night = false;
	let reduced = false;
	let shooting: { id: number; top: number; left: number } | null = null;
	let timer: ReturnType<typeof setTimeout>;
	let clock: ReturnType<typeof setInterval>;
	let id = 0;

	// Fixed positions, so the sky doesn't reshuffle on every page.
	const stars = Array.from({ length: 46 }, (_, i) => ({
		left: (i * 61 + 13) % 100,
		top: (i * 37 + 7) % 100,
		size: i % 7 === 0 ? 2.5 : i % 3 === 0 ? 2 : 1.5,
		delay: (i * 0.53) % 6,
		dur: 3 + (i % 5)
	}));

	function shoot() {
		timer = setTimeout(() => {
			if (!document.hidden) {
				shooting = { id: ++id, top: 5 + Math.random() * 35, left: 10 + Math.random() * 60 };
				setTimeout(() => (shooting = null), 1400);
			}
			shoot();
		}, 25_000 + Math.random() * 35_000);
	}

	onMount(() => {
		const forced = new URLSearchParams(location.search).has('night');
		const check = () => (night = forced || isNight());
		check();
		clock = setInterval(check, 60_000);
		reduced = prefersReducedMotion();
		if (!reduced) shoot();
	});
	onDestroy(() => (clearTimeout(timer), clearInterval(clock)));

	// While it's snowing the snow is the night sky; both at once is too much.
	$: snowing = $snowSeason && !$snowOff;
	$: show = night && ($cozy?.nightSky ?? true) && !$nightSkyOff && !snowing;
</script>

{#if show}
	<div class="sky fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true" transition:fade={{ duration: 800 }}>
		{#each stars as s}
			<span class="star absolute rounded-full {reduced ? '' : 'twinkle'}" style="left: {s.left}%; top: {s.top}%; width: {s.size}px; height: {s.size}px; animation-delay: {s.delay}s; animation-duration: {s.dur}s" />
		{/each}
		{#if shooting}
			{#key shooting.id}<span class="shooting absolute" style="top: {shooting.top}%; left: {shooting.left}%" />{/key}
		{/if}
	</div>
{/if}

<style>
	.star {
		background: var(--trail-2, #e6c255);
		opacity: 0.45;
	}
	:global(.dark) .star {
		background: #e9eef8;
		opacity: 0.35;
	}
	/* trans theme: stars in the flag's colours */
	:global(html[data-theme='trans']) .star:nth-child(3n) {
		background: #5bcefa;
	}
	:global(html[data-theme='trans']) .star:nth-child(3n + 1) {
		background: #f5a9b8;
	}
	:global(html[data-theme='trans']) .star:nth-child(3n + 2) {
		background: #ffffff;
	}
	.twinkle {
		animation: twinkle ease-in-out infinite;
	}
	@keyframes twinkle {
		0%,
		100% {
			opacity: 0.12;
		}
		50% {
			opacity: 0.6;
		}
	}
	.shooting {
		width: 90px;
		height: 1.5px;
		background: linear-gradient(90deg, rgb(255 255 255 / 0.9), transparent);
		border-radius: 999px;
		transform: rotate(-24deg);
		animation: shoot 1.3s ease-out forwards;
	}
	@keyframes shoot {
		from {
			opacity: 0;
			translate: 0 0;
		}
		15% {
			opacity: 1;
		}
		to {
			opacity: 0;
			translate: -260px 115px;
		}
	}
</style>
