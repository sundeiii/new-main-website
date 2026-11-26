<script lang="ts">
	// Ryo (or whoever is set in /admin → cozy) as a round sticker in the corner of the home page.
	// Click her: a headpat (counted for everyone) and something to say. At night she's asleep.
	// Hidden on small screens. Closed with ✕, she peeks out of the corner until clicked (or brought
	// back from ctrl+k).
	import { onDestroy, onMount } from 'svelte';
	import { fade, fly, scale } from 'svelte/transition';
	import { nowPlaying } from '$lib/components/site/presence';
	import { collect } from './collect';
	import { companionClosed, cozy, isNight, pickOne, prefersReducedMotion, restoreCompanionClosed, setCompanionClosed } from './cozy';

	let mounted = false;
	$: hidden = !mounted || $companionClosed;
	let line = '';
	let lastLine = '';
	let lineTimer: ReturnType<typeof setTimeout>;
	let idleTimer: ReturnType<typeof setTimeout>;
	let total: number | null = null;
	let pending = 0;
	let flushTimer: ReturnType<typeof setTimeout>;
	let hearts: { id: number; x: number }[] = [];
	let heartId = 0;
	let squish = false;
	let asleep = false;
	let woke = false;
	let reduced = false;
	// Moves up while the footer is on screen, so she doesn't sit on the visit counter.
	let lift = 0;
	let onScroll: (() => void) | null = null;

	$: c = $cozy;
	// See-through pictures are shown cut out, with a white sticker edge; others in a circle.
	$: cutout = /\.(png|webp|gif)(\?|$)/i.test(c?.companionImage ?? '');
	$: song = $nowPlaying?.isPlayingNow && !$nowPlaying.isPaused ? $nowPlaying : null;

	function lines() {
		const all = c?.companionLines ?? [];
		return all
			.filter((l) => (/\{(song|artist)\}/.test(l) ? !!song?.track : true))
			.map((l) =>
				l.replace(/\{song\}/g, song?.title ?? song?.track?.name ?? '').replace(/\{artist\}/g, song?.artistLine ?? song?.track?.artists?.[0]?.name ?? '')
			);
	}

	function say(text: string, ms = 4500) {
		line = text;
		clearTimeout(lineTimer);
		lineTimer = setTimeout(() => (line = ''), ms);
	}

	function flush() {
		if (!pending) return;
		const pats = Math.min(10, pending);
		pending -= pats;
		fetch('/api/headpats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pats }) })
			.then((r) => (r.ok ? r.json() : null))
			.then((d) => d && typeof d.total === 'number' && (total = Math.max(total ?? 0, d.total + pending)))
			.catch(() => {});
		if (pending) flushTimer = setTimeout(flush, 1500);
	}

	function pat(event: MouseEvent) {
		clearTimeout(idleTimer);
		collect('headpat');
		if (c?.headpats) {
			pending++;
			total = (total ?? 0) + 1;
			clearTimeout(flushTimer);
			flushTimer = setTimeout(flush, pending >= 10 ? 0 : 1200);
		}
		if (!reduced) {
			squish = false;
			requestAnimationFrame(() => (squish = true));
			const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
			const id = ++heartId;
			hearts = [...hearts, { id, x: event.clientX - box.left }];
			setTimeout(() => (hearts = hearts.filter((h) => h.id !== id)), 1100);
		}
		if (asleep && !woke) {
			woke = true;
			return say('...i was asleep. fine. one headpat.');
		}
		const options = lines();
		const next = Math.random() < 0.2 ? 'thanks for the headpat.' : options.length ? pickOne(options, lastLine) : '...';
		lastLine = next;
		say(next);
	}

	function close() {
		line = '';
		setCompanionClosed(true);
	}
	function comeBack() {
		setCompanionClosed(false);
		collect('ryoback');
		say(pickOne(['...you missed me, huh.', 'i was only gone for a bit.', 'fine. i\'m back.', 'did you bring money this time?']));
	}

	onMount(() => {
		reduced = prefersReducedMotion();
		asleep = isNight();
		restoreCompanionClosed();
		mounted = true;
		const footer = document.querySelector('footer');
		if (footer) {
			let queued = false;
			onScroll = () => {
				if (queued) return;
				queued = true;
				requestAnimationFrame(() => {
					queued = false;
					lift = Math.max(0, innerHeight - footer.getBoundingClientRect().top);
				});
			};
			onScroll();
			addEventListener('scroll', onScroll, { passive: true });
			addEventListener('resize', onScroll, { passive: true });
		}
		fetch('/api/headpats')
			.then((r) => (r.ok ? r.json() : null))
			.then((d) => d && (total = d.total))
			.catch(() => {});
		// One thing said unprompted, a little while after arriving.
		idleTimer = setTimeout(() => !line && say(asleep ? 'zzz... five more minutes.' : pickOne(lines().length ? lines() : ['...'])), 25_000);
	});
	onDestroy(() => {
		clearTimeout(lineTimer);
		clearTimeout(idleTimer);
		clearTimeout(flushTimer);
		flush();
		if (onScroll) removeEventListener('scroll', onScroll), removeEventListener('resize', onScroll);
	});

	const name = () => c?.companionName || 'ryo';
</script>

{#if c?.companion && c.companionImage && !hidden}
	<div class="companion fixed right-5 z-30 hidden md:flex flex-col items-end gap-2 font-cascadia pointer-events-none" style="bottom: {20 + lift}px" in:fly={{ y: 20, duration: 500 }}>
		{#if line}
			<div class="pointer-events-auto max-w-[15rem] rounded-2xl rounded-br-sm glass border border-ocean-300/50 dark:border-ocean-700/50 px-3 py-2 text-xs text-ocean-800 dark:text-ocean-200 shadow-lg" transition:scale={{ duration: 180, start: 0.85 }}>
				<span class="block text-[10px] uppercase tracking-widest text-ocean-500 mb-0.5">{name()}</span>
				{line}
				{#if c.headpats && total !== null}<span class="block mt-1.5 text-[10px] text-ocean-500 tabular-nums">♡ {total.toLocaleString('en-US')} {total === 1 ? 'headpat' : 'headpats'} from everyone</span>{/if}
			</div>
		{/if}
		<div class="relative group pointer-events-auto">
			<button
				on:click={pat}
				class="sticker relative block {cutout ? 'cutout w-28' : 'w-24 h-24 rounded-full overflow-hidden border-2 border-white/80 shadow-xl'} {squish ? 'squish' : ''} {asleep && !woke ? 'asleep' : ''}"
				aria-label="give {name()} a headpat"
				title="headpat {name()}"
				on:animationend={() => (squish = false)}
			>
				<img src={c.companionImage} alt={name()} class={cutout ? 'w-full h-auto' : 'w-full h-full object-cover scale-110'} draggable="false" />
			</button>
			{#if asleep && !woke}<span class="zzz absolute -top-2 left-0 text-xs text-ocean-500" aria-hidden="true">z<span class="text-[10px]">z</span></span>{/if}
			{#each hearts as h (h.id)}
				<span class="heart absolute top-0 text-sm pointer-events-none" style="left: {h.x - 6}px" aria-hidden="true" out:fade={{ duration: 150 }}>♡</span>
			{/each}
			<button
				on:click={close}
				class="absolute -top-1 -right-1 w-5 h-5 rounded-full glass border border-ocean-300/50 dark:border-ocean-700/50 text-[10px] text-ocean-600 dark:text-ocean-300 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
				aria-label="hide {name()}"
				title="hide {name()} for now">✕</button
			>
		</div>
	</div>
{:else if mounted && c?.companion && c.companionImage && $companionClosed}
	<!-- closed: just the top of her head, peeking up from the bottom of the screen -->
	<button
		on:click={comeBack}
		class="peek fixed bottom-0 right-10 z-30 hidden md:block w-16 overflow-hidden"
		aria-label="bring {name()} back"
		title="bring {name()} back"
		in:fly={{ y: 30, duration: 600, delay: 400 }}
	>
		<img src={c.companionImage} alt="" class="w-full h-auto {cutout ? 'cutout-peek' : 'rounded-full'}" draggable="false" />
	</button>
{/if}

<style>
	.peek {
		height: 1.6rem;
		transition: height 0.25s ease-out;
	}
	.peek:hover,
	.peek:focus-visible {
		height: 2.6rem;
	}
	.cutout-peek {
		filter: drop-shadow(1.5px 0 0 #fff) drop-shadow(-1.5px 0 0 #fff) drop-shadow(0 -1.5px 0 #fff);
	}
	.sticker {
		animation: bob 4s ease-in-out infinite;
		transition: filter 0.4s;
	}
	.sticker:hover {
		filter: brightness(1.05);
	}
	.cutout {
		transform-origin: bottom center;
	}
	.cutout img {
		filter: drop-shadow(2px 0 0 #fff) drop-shadow(-2px 0 0 #fff) drop-shadow(0 2px 0 #fff) drop-shadow(0 -2px 0 #fff) drop-shadow(0 8px 12px rgb(0 0 0 / 0.35));
	}
	.sticker.asleep {
		filter: saturate(0.6) brightness(0.8);
		animation-duration: 7s;
	}
	.sticker.squish {
		animation: squish 0.35s ease-out;
	}
	@keyframes bob {
		0%,
		100% {
			transform: translateY(0) rotate(-2deg);
		}
		50% {
			transform: translateY(-4px) rotate(2deg);
		}
	}
	@keyframes squish {
		0% {
			transform: scale(1, 1);
		}
		40% {
			transform: scale(1.08, 0.88);
		}
		100% {
			transform: scale(1, 1);
		}
	}
	.heart {
		color: var(--trail-2, var(--accent));
		animation: rise 1.1s ease-out forwards;
	}
	@keyframes rise {
		from {
			opacity: 1;
			transform: translateY(0) scale(0.8);
		}
		to {
			opacity: 0;
			transform: translateY(-36px) scale(1.2);
		}
	}
	.zzz {
		animation: drift 3s ease-in-out infinite;
	}
	@keyframes drift {
		0%,
		100% {
			transform: translate(0, 0);
			opacity: 0.5;
		}
		50% {
			transform: translate(-3px, -5px);
			opacity: 1;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.sticker,
		.sticker.asleep,
		.sticker.squish,
		.zzz {
			animation: none;
		}
	}
</style>
