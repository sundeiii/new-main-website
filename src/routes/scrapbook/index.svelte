<script context="module" lang="ts">
	// The scrapbook: pages of polaroids, handwritten notes, ticket stubs and stickers, held on with
	// washi tape. Edited in /admin → scrapbook.
	import type { Load } from '@sveltejs/kit';

	export const load: Load = async ({ fetch }) => {
		const res = await fetch('/api/site/scrapbook').catch(() => null);
		return { props: { book: res?.ok ? await res.json() : null } };
	};
</script>

<script lang="ts">
	import { fade, fly, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { app } from '$lib/components/site/app';
	import Pixels from '$lib/components/cozy/Pixels.svelte';
	import { collect } from '$lib/components/cozy/collect';
	import { settingDefaults, type ScrapbookSettings, type ScrapItem } from '$lib/siteSettings';
	import { PAPER, STICKERS, TAPES, seeded } from '$lib/scrapbook';

	export let book: ScrapbookSettings | null;
	$: data = book ?? settingDefaults.scrapbook;

	// Hand-placed look: a small tilt, a little up or down, and which tape — the same every visit.
	function placement(item: ScrapItem, key: string) {
		const r = seeded(key);
		const r2 = seeded(key + '·');
		const tilt = item.tilt ?? Math.round((r * 2 - 1) * (item.kind === 'sticker' ? 14 : 6));
		const tape =
			item.tape !== 'auto' ? item.tape : item.kind === 'ticket' || item.kind === 'sticker' ? 'none' : r2 < 0.45 ? 'top' : r2 < 0.8 ? 'corners' : 'side';
		return { tilt, tape, offset: Math.round((r2 * 2 - 1) * 14), tapeA: TAPES[Math.floor(r * TAPES.length)], tapeB: TAPES[Math.floor(r2 * TAPES.length)] };
	}

	const widths: Record<ScrapItem['kind'], Record<ScrapItem['size'], string>> = {
		photo: { s: '9.5rem', m: '12.5rem', l: '16rem' },
		note: { s: '10rem', m: '13rem', l: '16rem' },
		ticket: { s: '12rem', m: '15rem', l: '18rem' },
		sticker: { s: '4.5rem', m: '6.5rem', l: '9rem' }
	};

	function niceDate(d: string) {
		if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
		return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toLowerCase();
	}

	let zoomed: ScrapItem | null = null;

	const rise = (i: number) => (app.hydrated ? { y: 12, duration: 500, delay: 60 + i * 70, easing: cubicOut } : { duration: 0 });
	const muted = 'text-ocean-600 dark:text-ocean-400';
	const strong = 'text-ocean-900 dark:text-ocean-100';
	const slug = (t: string, i: number) => `page-${i + 1}`;
</script>

<svelte:head>
	<title>scrapbook</title>
	<meta property="og:title" content="scrapbook" />
	<meta name="description" content={data.intro || 'a little scrapbook'} />
	<meta property="og:description" content={data.intro || 'a little scrapbook'} />
</svelte:head>

<svelte:window on:keydown={(e) => e.key === 'Escape' && (zoomed = null)} />

<section class="px-8 sm:px-12 lg:px-24 pt-8 sm:pt-12 pb-4 font-cascadia flex flex-col gap-10">
	<header class="flex flex-col gap-3 max-w-2xl" in:fly={rise(0)}>
		<h1 class="text-3xl {strong}">scrapbook</h1>
		{#if data.intro}<p class="text-sm {muted} leading-relaxed">{data.intro}</p>{/if}
		{#if data.pages.length > 1}
			<nav class="flex flex-wrap gap-2 text-xs" aria-label="pages">
				{#each data.pages as p, i}
					<a href="#{slug(p.title, i)}" class="px-3 py-1 rounded-full glass border border-ocean-300/50 dark:border-ocean-700/50 {muted} hover:text-ocean-900 dark:hover:text-ocean-100 transition-colors">{p.title || `page ${i + 1}`}</a>
				{/each}
			</nav>
		{/if}
	</header>

	{#each data.pages as page, pi}
		<article id={slug(page.title, pi)} class="paper relative rounded-md shadow-2xl px-5 sm:px-10 pt-8 pb-12 scroll-mt-24" in:fly={rise(pi + 1)}>
			<span class="binding absolute left-0 inset-y-6 w-3" aria-hidden="true" />
			<header class="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 mb-8 pl-3">
				<h2 class="hand text-3xl sm:text-4xl">{page.title}</h2>
				{#if page.date}<span class="hand text-sm opacity-70">{niceDate(page.date)}</span>{/if}
				{#if page.note}<p class="hand w-full text-base opacity-80">{page.note}</p>{/if}
			</header>

			<div class="flex flex-wrap justify-center items-start gap-x-8 gap-y-10">
				{#each page.items as item, ii}
					{@const at = placement(item, `${pi}:${ii}:${item.kind}:${item.text}:${item.image}`)}
					{@const paper = PAPER[item.color] ?? PAPER.cream}
					<div class="item relative" style="--tilt: {at.tilt}deg; --offset: {at.offset}px; width: {widths[item.kind][item.size]}">
						{#if item.kind === 'photo'}
							<button class="polaroid block w-full bg-[#fbfaf7] p-2.5 pb-3 shadow-lg text-left" on:click={() => ((zoomed = item), collect('closer'))} aria-label="look closer{item.text ? `: ${item.text}` : ''}">
								<img src={item.image} alt={item.text} loading="lazy" class="w-full aspect-square object-cover bg-ocean-200" />
								<span class="hand block mt-2 text-[#2a3248] text-sm leading-tight min-h-[1.25rem]">{item.text}</span>
								{#if item.date}<span class="hand block text-[11px] text-[#2a3248]/60">{niceDate(item.date)}</span>{/if}
							</button>
						{:else if item.kind === 'note'}
							<div class="note relative px-4 pt-4 pb-5 shadow-md" style="--bg: {paper.bg}; --line: {paper.line}; color: {paper.ink}">
								<p class="hand text-[15px] leading-[1.6rem] whitespace-pre-line">{item.text}</p>
								{#if item.sub}<p class="hand text-right text-sm mt-1 opacity-75">{item.sub}</p>{/if}
								{#if item.date}<p class="hand text-[11px] mt-1 opacity-60">{niceDate(item.date)}</p>{/if}
								<span class="fold absolute bottom-0 right-0 w-5 h-5" aria-hidden="true" />
							</div>
						{:else if item.kind === 'ticket'}
							<div class="ticket relative flex shadow-md" style="--bg: {paper.bg}; color: {paper.ink}">
								<div class="flex-1 min-w-0 px-4 py-3">
									<span class="block text-[9px] uppercase tracking-[0.25em] opacity-60">admit one</span>
									<span class="block font-bold leading-tight mt-1 break-words">{item.text}</span>
									{#if item.sub}<span class="block text-xs mt-1 opacity-75">{item.sub}</span>{/if}
								</div>
								<div class="stub w-14 shrink-0 grid place-items-center border-l-2 border-dashed" style="border-color: {paper.line}">
									<span class="text-[10px] tracking-widest [writing-mode:vertical-rl] rotate-180 opacity-70">{item.date ? niceDate(item.date) : 'n° 001'}</span>
								</div>
							</div>
						{:else}
							{@const sticker = item.image ? { image: item.image } : STICKERS[item.text]}
							<div class="sticker grid place-items-center" title={item.text}>
								{#if sticker?.image}
									<img src={sticker.image} alt={item.text} loading="lazy" class="w-full h-auto" />
								{:else if sticker?.rows}
									<Pixels rows={sticker.rows} palette={sticker.palette ?? {}} scale={item.size === 'l' ? 8 : item.size === 'm' ? 6 : 4.5} />
								{/if}
							</div>
						{/if}

						{#if at.tape === 'top'}
							<span class="tape absolute -top-3 left-1/2 w-16 h-5" style="background: {at.tapeA}; transform: translateX(-50%) rotate({at.offset / 4}deg)" aria-hidden="true" />
						{:else if at.tape === 'corners'}
							<span class="tape absolute -top-2 -left-4 w-14 h-4 -rotate-[38deg]" style="background: {at.tapeA}" aria-hidden="true" />
							<span class="tape absolute -top-2 -right-4 w-14 h-4 rotate-[38deg]" style="background: {at.tapeB}" aria-hidden="true" />
						{:else if at.tape === 'side'}
							<span class="tape absolute top-1/2 -left-3 w-5 h-14 -translate-y-1/2" style="background: {at.tapeA}" aria-hidden="true" />
						{/if}
					</div>
				{/each}
			</div>
		</article>
	{:else}
		<p class="text-sm {muted}">nothing in here yet.</p>
	{/each}
</section>

{#if zoomed}
	<div class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-6" on:click={() => (zoomed = null)} transition:fade={{ duration: 150 }}>
		<figure class="bg-[#fbfaf7] p-4 pb-5 shadow-2xl max-w-[min(90vw,40rem)] -rotate-1" on:click|stopPropagation transition:scale={{ duration: 200, start: 0.9 }}>
			<img src={zoomed.image} alt={zoomed.text} class="max-h-[70vh] w-auto mx-auto" />
			<figcaption class="hand mt-3 text-[#2a3248] text-lg flex items-baseline justify-between gap-4">
				<span>{zoomed.text}</span>
				{#if zoomed.date}<span class="text-sm opacity-60">{niceDate(zoomed.date)}</span>{/if}
			</figcaption>
		</figure>
	</div>
{/if}

<style>
	.hand {
		font-family: 'Segoe Print', 'Bradley Hand', 'Chalkboard SE', 'Comic Neue', 'Comic Sans MS', cursive;
	}
	.paper {
		background: radial-gradient(circle, rgb(42 50 72 / 0.12) 1px, transparent 1.5px) 0 0 / 22px 22px, #f7f2e6;
		color: #2a3248;
	}
	:global(.dark) .paper {
		background: radial-gradient(circle, rgb(200 210 230 / 0.1) 1px, transparent 1.5px) 0 0 / 22px 22px, #1b2234;
		color: #dfe6f3;
	}
	.binding {
		background: repeating-linear-gradient(to bottom, transparent 0 14px, rgb(42 50 72 / 0.25) 14px 20px);
		border-radius: 0 3px 3px 0;
	}
	:global(.dark) .binding {
		background: repeating-linear-gradient(to bottom, transparent 0 14px, rgb(200 210 230 / 0.18) 14px 20px);
	}
	.item {
		transform: translateY(var(--offset)) rotate(var(--tilt));
		transition: transform 0.25s ease-out;
	}
	.item:hover {
		transform: translateY(calc(var(--offset) - 4px)) rotate(calc(var(--tilt) * 0.3)) scale(1.03);
		z-index: 10;
	}
	.polaroid {
		cursor: zoom-in;
	}
	.note {
		background: repeating-linear-gradient(to bottom, transparent 0 calc(1.6rem - 1px), var(--line) calc(1.6rem - 1px) 1.6rem) 0 1rem / 100% 100% no-repeat, var(--bg);
	}
	.fold {
		background: linear-gradient(135deg, var(--bg) 50%, rgb(0 0 0 / 0.12) 50%);
	}
	.ticket {
		background: var(--bg);
		-webkit-mask: radial-gradient(circle at 0 50%, transparent 7px, #000 7.5px) left / 51% 100% no-repeat, radial-gradient(circle at 100% 50%, transparent 7px, #000 7.5px) right / 51% 100% no-repeat;
		mask: radial-gradient(circle at 0 50%, transparent 7px, #000 7.5px) left / 51% 100% no-repeat, radial-gradient(circle at 100% 50%, transparent 7px, #000 7.5px) right / 51% 100% no-repeat;
	}
	.sticker :global(img),
	.sticker :global(svg) {
		filter: drop-shadow(2px 0 0 #fff) drop-shadow(-2px 0 0 #fff) drop-shadow(0 2px 0 #fff) drop-shadow(0 -2px 0 #fff) drop-shadow(0 4px 6px rgb(0 0 0 / 0.25));
	}
	.tape {
		opacity: 0.9;
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.12);
		mix-blend-mode: multiply;
	}
	:global(.dark) .tape {
		mix-blend-mode: normal;
		opacity: 0.8;
	}
	@media (prefers-reduced-motion: reduce) {
		.item,
		.item:hover {
			transition: none;
		}
	}
</style>
