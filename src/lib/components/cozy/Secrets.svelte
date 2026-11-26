<script lang="ts">
	// Hidden things on some pages: a tiny star to click (five pages), or an envelope with a little
	// letter inside (three pages, letters set in /admin → cozy). Each only shows until found.
	import { fade, scale } from 'svelte/transition';
	import { LETTER_PAGES, STAR_PAGES } from '$lib/collectibles';
	import { cozy } from './cozy';
	import { findStar, openLetter, passport } from './collect';

	export let path: string;

	// Where on the page, near the top so it's on screen without being in the way.
	const spots: Record<string, string> = {
		'/about': 'top: 2.6rem; right: 7%',
		'/music': 'top: 1rem; right: 34%',
		'/tournaments': 'top: 3.4rem; right: 5%',
		'/guestbook': 'top: 1.8rem; right: 14%',
		'/scrapbook': 'top: 0.6rem; right: 22%',
		'/projects': 'top: 2rem; right: 6%',
		'/now': 'top: 1.4rem; right: 10%',
		'/uses': 'top: 2.2rem; right: 8%'
	};

	$: star = (STAR_PAGES as readonly string[]).includes(path) && !$passport.stars.includes(path);
	$: letterIndex = (LETTER_PAGES as readonly string[]).indexOf(path);
	$: letter = letterIndex >= 0 ? $cozy?.letters?.[letterIndex] ?? '' : '';
	let burst = false;
	let reading = false;

	function clickStar() {
		burst = true;
		setTimeout(() => (findStar(path), (burst = false)), 450);
	}
	function open() {
		reading = true;
		openLetter(path);
	}
</script>

<svelte:window on:keydown={(e) => e.key === 'Escape' && (reading = false)} />

{#if star && spots[path]}
	<button class="secret-star absolute z-20 w-6 h-6 grid place-items-center {burst ? 'burst' : ''}" style={spots[path]} on:click={clickStar} aria-label="a tiny star" title="✦" out:fade={{ duration: 200 }}>
		<span aria-hidden="true">✦</span>
	</button>
{/if}

{#if letter && spots[path]}
	<button class="envelope absolute z-20 {$passport.letters.includes(path) ? 'opened' : ''}" style={spots[path]} on:click={open} aria-label="an envelope" title="for you">
		<span class="block w-7 h-5 relative" aria-hidden="true">
			<span class="absolute inset-0 rounded-[2px] bg-[#f6f0e1] shadow" />
			<span class="flap absolute inset-x-0 top-0 h-3" />
			<span class="absolute left-1/2 top-[7px] -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#c96a6a]" />
		</span>
	</button>
{/if}

{#if reading}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-6" on:click={() => (reading = false)} transition:fade={{ duration: 150 }}>
		<div class="letter relative max-w-sm w-full px-7 pt-7 pb-8 shadow-2xl rotate-1" on:click|stopPropagation transition:scale={{ duration: 220, start: 0.85 }}>
			<p class="hand text-[#2a3248] text-lg leading-8 whitespace-pre-line">{letter}</p>
			<p class="hand text-right text-[#2a3248]/70 mt-4">- sundei</p>
			<button on:click={() => (reading = false)} class="absolute top-2 right-3 text-[#2a3248]/50 hover:text-[#2a3248]" aria-label="close">✕</button>
		</div>
	</div>
{/if}

<style>
	.secret-star {
		color: var(--trail-2, #e6c255);
		opacity: 0.35;
		font-size: 11px;
		transition: opacity 0.3s, transform 0.3s;
		animation: glimmer 4s ease-in-out infinite;
	}
	.secret-star:hover {
		opacity: 1;
		transform: scale(1.6) rotate(20deg);
	}
	.secret-star.burst {
		animation: pop 0.45s ease-out forwards;
	}
	@keyframes glimmer {
		0%,
		100% {
			opacity: 0.25;
		}
		50% {
			opacity: 0.55;
		}
	}
	@keyframes pop {
		to {
			opacity: 0;
			transform: scale(3.5) rotate(90deg);
			filter: blur(1px);
		}
	}
	.envelope {
		opacity: 0.55;
		transform: rotate(-8deg);
		transition: opacity 0.3s, transform 0.3s;
	}
	.envelope:hover {
		opacity: 1;
		transform: rotate(0) translateY(-2px);
	}
	.envelope.opened {
		opacity: 0.3;
	}
	.flap {
		background: #e9dfc6;
		clip-path: polygon(0 0, 100% 0, 50% 100%);
	}
	.letter {
		background: repeating-linear-gradient(to bottom, transparent 0 calc(2rem - 1px), rgb(120 140 180 / 0.25) calc(2rem - 1px) 2rem) 0 1.6rem / 100% 100% no-repeat, #f6f0e1;
	}
	.hand {
		font-family: 'Segoe Print', 'Bradley Hand', 'Chalkboard SE', 'Comic Neue', 'Comic Sans MS', cursive;
	}
	@media (prefers-reduced-motion: reduce) {
		.secret-star {
			animation: none;
		}
	}
</style>
