<script lang="ts">
	// A small pixel cat on the footer line. Mostly asleep; now and then it wakes up, wanders somewhere
	// else and goes back to sleep. Click it to wake it up or give it a scratch. It doesn't wander at
	// night, while the tab is hidden, or for people who prefer reduced motion.
	import { onDestroy, onMount } from 'svelte';
	import { scale } from 'svelte/transition';
	import Pixels from './Pixels.svelte';
	import { catHat, cozy, isNight, pickOne, prefersReducedMotion } from './cozy';
	import { collect } from './collect';

	const palette = {
		o: '#2a3248',
		b: '#c8d0df',
		B: '#9fabc2',
		l: '#eef2f8',
		e: '#E6C255',
		n: '#c98b8b',
		// the bell: gold, or the theme's own (pink with the trans theme)
		g: 'var(--bell, #E6C255)'
	};
	const sprites = {
		sleep: [
			'..........o...o.',
			'.........obo.obo',
			'.........obbbbbo',
			'..oooooooobobobo',
			'.obbbbbbbbbbnbbo',
			'obbbbbbbbbblllbo',
			'obBBbbbbbbbbbbbo',
			'obbBBBBbbbbbbbo.',
			'.oooooooooooooo.'
		],
		sit: [
			'......o...o.',
			'.....obo.obo',
			'.....obbbbbo',
			'.....obebebo',
			'.....obbbnbo',
			'......olllo.',
			'.....obbgbo.',
			'....obbbbbbo',
			'...obbbbbbbo',
			'o..obbbbbbbo',
			'ob.obbbbblbo',
			'obbobbbbblbo',
			'.obbbbbbblbo',
			'..oooooooooo'
		],
		walkA: [
			'...........o...o.',
			'..........obo.obo',
			'..........obbbbbo',
			'o.........obbebeo',
			'.o.oooooooobbbbno',
			'..obbbbbbbbbbllo.',
			'..obbbbbbbbbbbo..',
			'..obBbbbbbbbbbo..',
			'...ob.ob...ob.ob.',
			'...oo.oo...oo.oo.'
		],
		walkB: [
			'...........o...o.',
			'..........obo.obo',
			'..........obbbbbo',
			'o.........obbebeo',
			'.o.oooooooobbbbno',
			'..obbbbbbbbbbllo.',
			'..obbbbbbbbbbbo..',
			'..obBbbbbbbbbbo..',
			'..ob...ob.ob...ob',
			'..oo...oo.oo...oo'
		]
	};

	// Seasonal hats, drawn on top of the cat's head (see catHat in ./cozy).
	const hats = {
		santa: { rows: ['....ww', '..rrr.', '.rrrr.', 'wwwwww'], palette: { r: '#c94b4b', w: '#eef2f8' } },
		witch: { rows: ['...p..', '..pp..', '.pgpp.', 'pppppp'], palette: { p: '#3b2a52', g: '#E6C255' } },
		flower: { rows: ['.p.', 'pcp', '.p.'], palette: { p: '#8FB3E0', c: '#E6C255' } }
	};
	// Where the head is in each sprite: its middle column, top row and right ear column.
	const heads = { sleep: { mid: 12.5, top: 1, ear: 14 }, sit: { mid: 8.5, top: 1, ear: 10 }, walk: { mid: 13.5, top: 1, ear: 15 } };
	const SCALE = 2;
	let hat: keyof typeof hats | null = null;
	$: hatSprite = hat && ($cozy?.seasonalTouches ?? true) ? hats[hat] : null;
	$: hatPos = (() => {
		if (!hatSprite) return '';
		const w = hatSprite.rows[0].length;
		const h = hatSprite.rows.length;
		const head = heads[state];
		const spriteW = Math.max(...rows.map((r) => r.length));
		// The flower sits on an ear; hats sit on top of the head.
		let center = hat === 'flower' ? head.ear : head.mid;
		if (facingLeft) center = spriteW - center;
		const top = hat === 'flower' ? -h + 2 : head.top + 1 - h;
		return `left: ${(center - w / 2) * SCALE}px; top: ${top * SCALE}px`;
	})();

	type State = 'sleep' | 'sit' | 'walk';
	let state: State = 'sleep';
	let x = 15 + Math.random() * 55; // % across the footer
	let facingLeft = false;
	let walkMs = 0;
	let frame = false;
	let bubble = '';
	let hearts = 0;
	let clicks: number[] = [];
	let reduced = false;
	let timers: ReturnType<typeof setTimeout>[] = [];
	let frameTimer: ReturnType<typeof setInterval>;
	let bubbleTimer: ReturnType<typeof setTimeout>;

	$: rows = state === 'sleep' ? sprites.sleep : state === 'walk' ? (frame ? sprites.walkB : sprites.walkA) : sprites.sit;
	$: name = $cozy?.catName || 'mochi';

	const later = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms));
	const clearAll = () => (timers.forEach(clearTimeout), (timers = []));

	function say(text: string, ms = 2200) {
		bubble = text;
		clearTimeout(bubbleTimer);
		bubbleTimer = setTimeout(() => (bubble = ''), ms);
	}

	function napLater() {
		const wait = 25_000 + Math.random() * 30_000;
		later(() => {
			if (document.hidden || isNight() || reduced) return napLater();
			wander();
		}, wait);
	}

	function wander() {
		clearAll();
		state = 'sit';
		later(() => {
			// Not all the way right: the music box lives there.
			const to = 5 + Math.random() * 78;
			facingLeft = to < x;
			walkMs = Math.abs(to - x) * 90;
			state = 'walk';
			x = to;
			later(() => {
				state = 'sit';
				later(() => ((state = 'sleep'), napLater()), 3000 + Math.random() * 4000);
			}, walkMs);
		}, 1200);
	}

	function poke() {
		const now = Date.now();
		clicks = [...clicks.filter((t) => now - t < 1500), now];
		clearAll();
		collect('cat');
		if (state === 'sleep') {
			state = 'sit';
			say(pickOne(['mrrp?', '...?', 'mew']));
		} else if (clicks.length >= 5) {
			say('MROW. enough.', 2600);
			collect('catmad');
			clicks = [];
			if (!reduced) later(() => wander(), 2600);
		} else {
			hearts++;
			say(pickOne(['purr', 'prrrr', 'mrrp :)', '♡']));
		}
		later(() => ((state = 'sleep'), napLater()), 9000);
	}

	onMount(() => {
		reduced = prefersReducedMotion();
		// ?hat=santa|witch|flower tries one on any day.
		const tryOn = new URLSearchParams(location.search).get('hat');
		hat = tryOn && tryOn in hats ? (tryOn as keyof typeof hats) : catHat();
		frameTimer = setInterval(() => state === 'walk' && (frame = !frame), 220);
		napLater();
	});
	onDestroy(() => {
		clearAll();
		clearInterval(frameTimer);
		clearTimeout(bubbleTimer);
	});
</script>

{#if $cozy?.cat ?? true}
	<div class="relative h-7 -mb-px pointer-events-none" aria-hidden="false">
		<button
			class="cat absolute bottom-0 pointer-events-auto -translate-x-1/2"
			style="left: {x}%; transition: left {walkMs}ms linear"
			on:click={poke}
			title={name}
			aria-label="{name} the cat{state === 'sleep' ? ', asleep' : ''}"
		>
			{#if bubble}
				<span class="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full glass border border-ocean-300/50 dark:border-ocean-700/50 px-2 py-0.5 text-[10px] text-ocean-700 dark:text-ocean-300" transition:scale={{ duration: 150, start: 0.8 }}>{bubble}</span>
			{/if}
			{#if state === 'sleep'}<span class="zzz absolute -top-3 right-0 text-[9px] text-ocean-500" aria-hidden="true">z</span>{/if}
			<span class="relative block {state === 'walk' ? 'bounce' : ''}">
				<Pixels {rows} {palette} scale={SCALE} flip={facingLeft} />
				{#if hatSprite}<span class="absolute" style={hatPos} aria-hidden="true"><Pixels rows={hatSprite.rows} palette={hatSprite.palette} scale={SCALE} flip={facingLeft} /></span>{/if}
			</span>
		</button>
	</div>
{/if}

<style>
	.cat {
		cursor: pointer;
	}
	.bounce {
		animation: bounce 0.44s steps(2) infinite;
	}
	@keyframes bounce {
		50% {
			transform: translateY(-1px);
		}
	}
	.zzz {
		animation: drift 2.6s ease-in-out infinite;
	}
	@keyframes drift {
		0%,
		100% {
			transform: translate(0, 0);
			opacity: 0.4;
		}
		50% {
			transform: translate(2px, -4px);
			opacity: 1;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.bounce,
		.zzz {
			animation: none;
		}
	}
</style>
