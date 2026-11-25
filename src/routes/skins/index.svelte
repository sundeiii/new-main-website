<script context="module" lang="ts">
	// osu! skins (added in /admin → pages → skins).
	import type { Load } from '@sveltejs/kit';

	// Skins are added in /admin → pages → skins.
	export const load: Load = async ({ fetch }) => {
		const res = await fetch('/api/site/skins').catch(() => null);
		return { props: { skins: res?.ok ? await res.json() : null } };
	};
</script>

<script lang="ts">
	import { fade, fly, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { settingDefaults, type SkinsSettings } from '$lib/siteSettings';
	import { app } from '$lib/components/site/app';

	export let skins: SkinsSettings | null;
	$: items = (skins ?? settingDefaults.skins).items;

	const rise = (i: number) => (app.hydrated ? { y: 12, duration: 500, delay: 60 + i * 70, easing: cubicOut } : { duration: 0 });

	// Viewer for previews and screenshots: arrow keys to move, Escape or a click outside to close.
	let open: { images: string[]; index: number; name: string } | null = null;
	const show = (images: string[], index: number, name: string) => images.length && (open = { images, index, name });
	const step = (d: number) => open && (open = { ...open, index: (open.index + d + open.images.length) % open.images.length });
	function onKey(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'Escape') open = null;
		if (e.key === 'ArrowRight') step(1);
		if (e.key === 'ArrowLeft') step(-1);
	}

	const muted = 'text-ocean-600 dark:text-ocean-400';
	const strong = 'text-ocean-900 dark:text-ocean-100';
</script>

<svelte:window on:keydown={onKey} />

<svelte:head>
	<title>skins</title>
	<meta property="og:title" content="skins" />
	<meta name="description" content="osu! skins that i use" />
	<meta property="og:description" content="osu! skins that i use" />
</svelte:head>

<section class="px-8 sm:px-12 lg:px-24 pt-8 sm:pt-12 pb-4 font-cascadia flex flex-col gap-10">
	<header in:fly={rise(0)}>
		<h1 class="text-3xl {strong}">skins</h1>
		<p class="text-sm {muted} mt-2">osu! skins i use or have used on stream.</p>
	</header>

	<div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
		{#each items as skin, i}
			{@const gallery = [skin.preview, ...skin.screenshots].filter(Boolean)}
			<article class="glass rounded-2xl border border-ocean-300/50 dark:border-ocean-700/50 overflow-hidden flex flex-col" in:fly={rise(1 + i)}>
				<button class="group relative aspect-video overflow-hidden bg-ocean-200/40 dark:bg-ocean-800/40" on:click={() => show(gallery, 0, skin.name)} aria-label="view {skin.name} screenshots">
					{#if skin.preview}
						<img src={skin.preview} alt={skin.name} loading="lazy" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
					{:else}
						<span class="w-full h-full grid place-items-center text-4xl text-ocean-400">⭕</span>
					{/if}
					{#if gallery.length > 1}<span class="absolute bottom-2 right-2 text-[10px] px-2 py-0.5 rounded-full bg-black/60 text-white">{gallery.length} pics</span>{/if}
				</button>
				{#if skin.screenshots.length}
					<div class="flex gap-1.5 px-4 pt-3 overflow-x-auto">
						{#each skin.screenshots as shot, s}
							<button class="shrink-0" on:click={() => show(gallery, skin.preview ? s + 1 : s, skin.name)} aria-label="screenshot {s + 1}">
								<img src={shot} alt="" loading="lazy" class="h-11 w-20 object-cover rounded-lg opacity-80 hover:opacity-100 transition-opacity" />
							</button>
						{/each}
					</div>
				{/if}
				<div class="flex flex-col gap-3 p-4 flex-1">
					<div>
						<h2 class={strong}>{skin.name}</h2>
						{#if skin.author}<span class="text-xs {muted}">by {skin.author}</span>{/if}
					</div>
					{#if skin.description}<p class="text-sm text-ocean-700 dark:text-ocean-300 whitespace-pre-wrap">{skin.description}</p>{/if}
					{#if skin.download}
						<a href={skin.download} download class="mt-auto w-fit px-4 py-2 rounded-full text-sm accent-bg" style="color: var(--accent-fg)">⬇ download</a>
					{/if}
				</div>
			</article>
		{:else}
			<p class={muted}>no skins yet</p>
		{/each}
	</div>
</section>

{#if open}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<div class="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 font-cascadia" role="dialog" aria-modal="true" aria-label="{open.name} screenshots" on:click={() => (open = null)} transition:fade={{ duration: 180 }}>
		<button class="absolute top-4 right-5 text-white/80 hover:text-white text-3xl" on:click={() => (open = null)} aria-label="close">×</button>
		{#if open.images.length > 1}
			<button class="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl" on:click|stopPropagation={() => step(-1)} aria-label="previous">‹</button>
			<button class="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl" on:click|stopPropagation={() => step(1)} aria-label="next">›</button>
		{/if}
		{#key open.index}
			<img src={open.images[open.index]} alt="" class="max-h-[85vh] max-w-[92vw] rounded-xl object-contain shadow-2xl" on:click|stopPropagation in:scale={{ start: 0.97, duration: 220, easing: cubicOut }} />
		{/key}
		{#if open.images.length > 1}<span class="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/60 text-sm">{open.index + 1} / {open.images.length}</span>{/if}
	</div>
{/if}
