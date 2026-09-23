<script context="module" lang="ts">
	import type { Load } from '@sveltejs/kit';

	// Albums are managed in /admin → pages → gallery.
	export const load: Load = async ({ fetch }) => {
		const res = await fetch('/api/site/gallery').catch(() => null);
		return { props: { gallery: res?.ok ? await res.json() : null } };
	};
</script>

<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { settingDefaults, type GalleryPhoto, type GallerySettings } from '$lib/siteSettings';

	export let gallery: GallerySettings | null;

	$: albums = (gallery ?? settingDefaults.gallery).albums.filter((a) => a.photos.length);
	let albumSlug = 'all';
	$: current = albumSlug === 'all' ? null : albums.find((a) => a.slug === albumSlug) ?? null;
	$: photos = current ? current.photos : albums.flatMap((a) => a.photos);

	let open: number | null = null;
	$: shown = open === null ? null : photos[open];
	function step(d: number) {
		if (open !== null) open = (open + d + photos.length) % photos.length;
	}
	function onKey(e: KeyboardEvent) {
		if (open === null) return;
		if (e.key === 'Escape') open = null;
		if (e.key === 'ArrowRight') step(1);
		if (e.key === 'ArrowLeft') step(-1);
	}

	const formatDate = (d: string, month: 'short' | 'long' = 'short') => {
		const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(d) ? d + 'T00:00:00' : d);
		return isNaN(date.getTime()) ? d : date.toLocaleDateString('en-US', { month, day: 'numeric', year: 'numeric' });
	};
	const describe = (p: GalleryPhoto) => p.caption || 'photo';
</script>

<svelte:window on:keydown={onKey} />

<svelte:head>
	<title>gallery</title>
	<meta property="og:title" content="gallery" />
	<meta name="description" content="photos and visual works" />
	<meta property="og:description" content="photos and visual works" />
</svelte:head>

<section class="p-8 sm:p-12 lg:p-24 lg:py-16 font-cascadia">
	<div class="flex flex-col gap-7">
		<div in:fly={{ y: -20, duration: 400 }}>
			<h1 class="text-ocean-900 dark:text-ocean-100">gallery</h1>
			<p class="text-ocean-700 dark:text-ocean-400">photos and visual works</p>
		</div>

		{#if albums.length > 1}
			<div class="flex flex-wrap gap-1.5 text-sm" in:fly={{ y: -10, duration: 400, delay: 50 }}>
				{#each [{ slug: 'all', title: 'all', count: albums.reduce((n, a) => n + a.photos.length, 0) }, ...albums.map((a) => ({ slug: a.slug, title: a.title, count: a.photos.length }))] as tab}
					<button
						on:click={() => ((albumSlug = tab.slug), (open = null))}
						class="px-3 py-1 rounded-full border transition-colors {albumSlug === tab.slug
							? 'bg-ocean-700 dark:bg-ocean-300 text-ocean-100 dark:text-ocean-900 border-transparent'
							: 'border-ocean-300 dark:border-ocean-700 text-ocean-700 dark:text-ocean-400 hover:border-ocean-500'}"
					>
						{tab.title} <span class="opacity-60">{tab.count}</span>
					</button>
				{/each}
			</div>
		{/if}

		{#if current?.description}
			<p class="text-ocean-700 dark:text-ocean-300 text-sm max-w-2xl -mt-3">{current.description}</p>
		{/if}

		{#key albumSlug}
			<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" in:fade={{ duration: 300 }}>
				{#each photos as photo, i}
					<button
						class="group relative aspect-square overflow-hidden rounded border border-ocean-300 dark:border-ocean-700 hover:border-ocean-500 transition-colors"
						on:click={() => (open = i)}
					>
						<img src={photo.src} alt={describe(photo)} loading="lazy" decoding="async" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
						{#if photo.caption || photo.date}
							<div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
								<div class="absolute bottom-0 left-0 right-0 p-3 text-left">
									{#if photo.caption}<p class="text-white text-sm">{photo.caption}</p>{/if}
									{#if photo.date}<p class="text-white/75 text-xs">{formatDate(photo.date)}</p>{/if}
								</div>
							</div>
						{/if}
					</button>
				{:else}
					<p class="col-span-full text-ocean-700 dark:text-ocean-400">no photos yet. coming soon!</p>
				{/each}
			</div>
		{/key}
	</div>
</section>

{#if shown}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<div class="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" on:click={() => (open = null)} transition:fade={{ duration: 150 }}>
		<button class="absolute top-4 right-4 text-white text-4xl hover:text-ocean-300" on:click={() => (open = null)} aria-label="close">×</button>
		{#if photos.length > 1}
			<button class="absolute left-3 top-1/2 -translate-y-1/2 text-white/80 hover:text-white text-4xl px-3" on:click|stopPropagation={() => step(-1)} aria-label="previous">‹</button>
			<button class="absolute right-3 top-1/2 -translate-y-1/2 text-white/80 hover:text-white text-4xl px-3" on:click|stopPropagation={() => step(1)} aria-label="next">›</button>
		{/if}
		<div class="max-w-5xl max-h-[92vh] flex flex-col items-center" on:click|stopPropagation>
			<img src={shown.src} alt={describe(shown)} class="max-w-full max-h-[80vh] object-contain rounded" />
			<div class="mt-3 text-center">
				{#if shown.caption}<p class="text-white text-lg">{shown.caption}</p>{/if}
				<p class="text-white/70 text-sm">
					{#if shown.date}{formatDate(shown.date, 'long')} · {/if}{(open ?? 0) + 1} / {photos.length}
				</p>
			</div>
		</div>
	</div>
{/if}
