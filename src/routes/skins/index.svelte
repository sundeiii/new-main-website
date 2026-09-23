<script context="module" lang="ts">
	import type { Load } from '@sveltejs/kit';

	// Skins are added in /admin → pages → skins.
	export const load: Load = async ({ fetch }) => {
		const res = await fetch('/api/site/skins').catch(() => null);
		return { props: { skins: res?.ok ? await res.json() : null } };
	};
</script>

<script lang="ts">
	import { fly } from 'svelte/transition';
	import { settingDefaults, type SkinsSettings } from '$lib/siteSettings';

	export let skins: SkinsSettings | null;
	$: items = (skins ?? settingDefaults.skins).items;

	// Lightbox for previews and screenshots
	let open: { images: string[]; index: number } | null = null;
	const show = (images: string[], index: number) => (open = { images, index });
	function step(d: number) {
		if (open) open = { ...open, index: (open.index + d + open.images.length) % open.images.length };
	}
	function onKey(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'Escape') open = null;
		if (e.key === 'ArrowRight') step(1);
		if (e.key === 'ArrowLeft') step(-1);
	}
</script>

<svelte:window on:keydown={onKey} />

<svelte:head>
	<title>skins</title>
	<meta property="og:title" content="skins" />
	<meta name="description" content="osu! skins that i use" />
	<meta property="og:description" content="osu! skins that i use" />
</svelte:head>

<section class="p-8 sm:p-12 lg:p-24 lg:py-16 font-cascadia">
	<div class="flex flex-col gap-10">
		<div in:fly={{ y: -20, duration: 400 }}>
			<h1 class="text-ocean-900 dark:text-ocean-100">skins</h1>
			<p class="text-ocean-600 dark:text-ocean-400 max-w-xl">osu! skins i use or have used on stream.</p>
		</div>

		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each items as skin, i}
				{@const gallery = [skin.preview, ...skin.screenshots].filter(Boolean)}
				<div
					class="flex flex-col border border-ocean-200 dark:border-ocean-800 rounded-lg overflow-hidden bg-ocean-50 dark:bg-ocean-900"
					in:fly={{ y: 20, duration: 400, delay: 100 + i * 80 }}
				>
					<button class="aspect-video bg-ocean-100 dark:bg-ocean-950 overflow-hidden group" on:click={() => gallery.length && show(gallery, 0)} aria-label="view {skin.name} screenshots">
						{#if skin.preview}
							<img src={skin.preview} alt={skin.name} loading="lazy" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
						{:else}
							<div class="w-full h-full flex items-center justify-center text-4xl text-ocean-400">⭕</div>
						{/if}
					</button>

					{#if skin.screenshots.length}
						<div class="flex gap-1.5 px-4 pt-3 overflow-x-auto">
							{#each skin.screenshots as shot, s}
								<button class="shrink-0" on:click={() => show(gallery, skin.preview ? s + 1 : s)} aria-label="screenshot {s + 1}">
									<img src={shot} alt="" loading="lazy" class="h-12 w-20 object-cover rounded border border-ocean-200 dark:border-ocean-700 hover:border-ocean-500" />
								</button>
							{/each}
						</div>
					{/if}

					<div class="flex flex-col gap-3 p-4 flex-1">
						<div class="flex flex-col gap-0.5">
							<span class="font-medium text-ocean-900 dark:text-ocean-100">{skin.name}</span>
							{#if skin.author}<span class="text-sm text-ocean-500">by {skin.author}</span>{/if}
						</div>
						{#if skin.description}
							<p class="text-sm text-ocean-700 dark:text-ocean-300 whitespace-pre-wrap">{skin.description}</p>
						{/if}
						{#if skin.download}
							<a
								href={skin.download}
								download
								class="mt-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-ocean-600 hover:bg-ocean-700 dark:bg-ocean-700 dark:hover:bg-ocean-600 text-white rounded transition-colors text-sm font-medium"
							>
								<span>⬇</span> download
							</a>
						{/if}
					</div>
				</div>
			{:else}
				<p class="text-ocean-600 dark:text-ocean-400">no skins yet</p>
			{/each}
		</div>
	</div>
</section>

{#if open}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<div class="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" on:click={() => (open = null)}>
		<img src={open.images[open.index]} alt="" class="max-h-[88vh] max-w-[92vw] rounded object-contain" on:click|stopPropagation={() => step(1)} />
		{#if open.images.length > 1}
			<button class="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white text-3xl px-3" on:click|stopPropagation={() => step(-1)} aria-label="previous">‹</button>
			<button class="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white text-3xl px-3" on:click|stopPropagation={() => step(1)} aria-label="next">›</button>
			<span class="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">{open.index + 1} / {open.images.length}</span>
		{/if}
	</div>
{/if}
