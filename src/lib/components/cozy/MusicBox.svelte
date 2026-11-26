<script lang="ts">
	// A tiny pixel music box on the footer line. While i'm listening to something the lid is open,
	// the cylinder turns and notes float up; hover says what's playing, click goes to /music.
	import { onDestroy, onMount } from 'svelte';
	import { scale } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { nowPlaying } from '$lib/components/site/presence';
	import Pixels from './Pixels.svelte';
	import { cozy, prefersReducedMotion } from './cozy';

	const palette = { o: '#3a2a22', w: '#8a5a3c', W: '#a8724c', g: '#E6C255', c: '#c8d0df' };
	const closed = ['..............', '.oooooooooooo.', '.owwwwwwwwwwo.', '.oggggggggggo.', '.oWWWWWWWWWWo.', '.oWWWWggWWWWo.', '.oWWWWWWWWWWo.', '.oooooooooooo.'];
	const open = (turn: boolean) => [
		'..oooooooooooo',
		'..owwwwwwwwwwo',
		'.oooooooooooo.',
		turn ? '.o.c.c.c.c.co.' : '.oc.c.c.c.c.o.',
		'.oggggggggggo.',
		'.oWWWWWWWWWWo.',
		'.oWWWWggWWWWo.',
		'.oooooooooooo.'
	];

	let turn = false;
	let reduced = false;
	let hover = false;
	let spin: ReturnType<typeof setInterval>;
	let notes: { id: number; x: number; glyph: string }[] = [];
	let noteTimer: ReturnType<typeof setInterval>;
	let id = 0;

	$: np = $nowPlaying;
	// ?musicbox opens it for checking, even with nothing playing.
	let forceOpen = false;
	$: playing = forceOpen || !!(np?.track && np.isPlayingNow && !np.isPaused);
	$: song = np?.title ?? np?.track?.name ?? '';
	$: artist = np?.artistLine ?? '';

	onMount(() => {
		reduced = prefersReducedMotion();
		forceOpen = new URLSearchParams(location.search).has('musicbox');
		spin = setInterval(() => playing && !reduced && (turn = !turn), 300);
		noteTimer = setInterval(() => {
			if (!playing || reduced || document.hidden) return;
			const note = { id: ++id, x: 4 + Math.random() * 18, glyph: Math.random() < 0.5 ? '♪' : '♫' };
			notes = [...notes.slice(-4), note];
			setTimeout(() => (notes = notes.filter((n) => n.id !== note.id)), 2400);
		}, 900);
	});
	onDestroy(() => (clearInterval(spin), clearInterval(noteTimer)));
</script>

{#if $cozy?.musicBox ?? true}
	<button
		class="box absolute bottom-0 right-0 pointer-events-auto"
		on:click={() => goto('/music')}
		on:mouseenter={() => (hover = true)}
		on:mouseleave={() => (hover = false)}
		on:focus={() => (hover = true)}
		on:blur={() => (hover = false)}
		aria-label={playing ? `music box: sundei is listening to ${song} by ${artist}` : 'music box, closed'}
	>
		{#each notes as n (n.id)}<span class="note absolute bottom-4 text-[10px]" style="left: {n.x}px" aria-hidden="true">{n.glyph}</span>{/each}
		<Pixels rows={playing ? open(turn) : closed} {palette} scale={2} />
		{#if hover}
			<span class="tip absolute bottom-9 right-0 w-max max-w-[16rem] rounded-xl glass border border-ocean-300/50 dark:border-ocean-700/50 px-2.5 py-1.5 text-[11px] text-left text-ocean-800 dark:text-ocean-200 shadow-lg" transition:scale={{ duration: 140, start: 0.9 }}>
				{#if playing}
					<span class="block text-[9px] uppercase tracking-widest text-ocean-500">playing right now</span>
					<span class="block truncate">{song}</span>
					{#if artist}<span class="block truncate text-ocean-500">{artist}</span>{/if}
				{:else}
					the music box is resting. nothing playing right now.
				{/if}
			</span>
		{/if}
	</button>
{/if}

<style>
	.box {
		cursor: pointer;
		transition: transform 0.2s;
	}
	.box:hover {
		transform: translateY(-2px);
	}
	.note {
		color: var(--trail-2, #e6c255);
		animation: float-up 2.4s ease-out forwards;
	}
	@keyframes float-up {
		from {
			opacity: 0;
			transform: translate(0, 0) rotate(-10deg);
		}
		20% {
			opacity: 1;
		}
		to {
			opacity: 0;
			transform: translate(6px, -28px) rotate(12deg);
		}
	}
</style>
