<script context="module" lang="ts">
	// The gallery (albums are managed in /admin → pages → gallery), as a masonry wall where photos
	// keep their own shape.
	import type { Load } from '@sveltejs/kit';

	// Albums are managed in /admin → pages → gallery.
	export const load: Load = async ({ fetch }) => {
		const res = await fetch('/api/site/gallery').catch(() => null);
		return { props: { gallery: res?.ok ? await res.json() : null } };
	};
</script>

<script lang="ts">
	import { fade, fly, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { settingDefaults, type GalleryPhoto, type GallerySettings } from '$lib/siteSettings';
	import { app } from '$lib/components/site/app';

	export let gallery: GallerySettings | null;

	const rise = (i: number) => (app.hydrated ? { y: 12, duration: 500, delay: 60 + i * 70, easing: cubicOut } : { duration: 0 });

	$: albums = (gallery ?? settingDefaults.gallery).albums.filter((a) => a.photos.length);
	$: total = albums.reduce((n, a) => n + a.photos.length, 0);
	let albumSlug = 'all';
	$: current = albumSlug === 'all' ? null : albums.find((a) => a.slug === albumSlug) ?? null;
	$: photos = current ? current.photos : albums.flatMap((a) => a.photos);

	// Full-screen viewer: arrow keys / swipe to move, Escape or a click outside to close.
	let open: number | null = null;
	$: shown = open === null ? null : photos[open];
	const step = (d: number) => open !== null && (open = (open + d + photos.length) % photos.length);
	function onKey(e: KeyboardEvent) {
		if (open === null) return;
		if (e.key === 'Escape') open = null;
		if (e.key === 'ArrowRight') step(1);
		if (e.key === 'ArrowLeft') step(-1);
	}
	let touchX: number | null = null;
	const swipeEnd = (e: TouchEvent) => {
		if (touchX === null) return;
		const dx = e.changedTouches[0].clientX - touchX;
		if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
		touchX = null;
	};

	const formatDate = (d: string, month: 'short' | 'long' = 'short') => {
		const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(d) ? d + 'T00:00:00' : d);
		return isNaN(date.getTime()) ? d : date.toLocaleDateString('en-GB', { month, day: 'numeric', year: 'numeric' });
	};
	const describe = (p: GalleryPhoto) => p.caption || 'photo';

	const muted = 'text-ocean-600 dark:text-ocean-400';
	const strong = 'text-ocean-900 dark:text-ocean-100';
</script>

<svelte:window on:keydown={onKey} />

<svelte:head>
	<title>gallery</title>
	<meta property="og:title" content="gallery" />
	<meta name="description" content="photos and visual works" />
	<meta property="og:description" content="photos and visual works" />
</svelte:head>

<section class="px-8 sm:px-12 lg:px-24 pt-8 sm:pt-12 pb-4 font-cascadia flex flex-col gap-8">
	<header class="flex flex-wrap items-end justify-between gap-4" in:fly={rise(0)}>
		<div>
			<h1 class="text-3xl {strong}">gallery</h1>
			<p class="text-sm {muted} mt-2">photos and visual works · {total} so far</p>
		</div>
		{#if albums.length > 1}
			<div class="flex flex-wrap gap-1 p-1 rounded-full glass border border-ocean-300/50 dark:border-ocean-700/50 text-xs">
				{#each [{ slug: 'all', title: 'all', count: total }, ...albums.map((a) => ({ slug: a.slug, title: a.title, count: a.photos.length }))] as tab}
					<button
						on:click={() => ((albumSlug = tab.slug), (open = null))}
						class="px-3 py-1 rounded-full transition-colors {albumSlug === tab.slug ? 'accent-soft ' + strong : muted + ' hover:text-ocean-900 dark:hover:text-ocean-100'}"
						aria-pressed={albumSlug === tab.slug}
					>
						{tab.title} <span class="opacity-60">{tab.count}</span>
					</button>
				{/each}
			</div>
		{/if}
	</header>

	{#if current?.description}
		<p class="text-sm text-ocean-700 dark:text-ocean-300 max-w-2xl -mt-4">{current.description}</p>
	{/if}

	{#key albumSlug}
		<div class="columns-2 sm:columns-3 xl:columns-4 gap-3 [&>*]:mb-3" in:fade={{ duration: 300 }}>
			{#each photos as photo, i}
				<button class="group relative block w-full overflow-hidden rounded-2xl border border-ocean-300/50 dark:border-ocean-700/50 break-inside-avoid" on:click={() => (open = i)}>
					<img src={photo.src} alt={describe(photo)} loading="lazy" decoding="async" class="block w-full h-auto transition-transform duration-700 group-hover:scale-105" />
					{#if photo.caption || photo.date}
						<div class="absolute inset-x-0 bottom-0 p-3 text-left bg-gradient-to-t from-black/80 to-transparent translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
							{#if photo.caption}<p class="text-white text-sm">{photo.caption}</p>{/if}
							{#if photo.date}<p class="text-white/75 text-xs">{formatDate(photo.date)}</p>{/if}
						</div>
					{/if}
				</button>
			{:else}
				<p class={muted}>no photos yet. coming soon!</p>
			{/each}
		</div>
	{/key}
</section>

{#if shown}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<div
		class="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 font-cascadia"
		role="dialog"
		aria-modal="true"
		aria-label={describe(shown)}
		on:click={() => (open = null)}
		on:touchstart|passive={(e) => (touchX = e.touches[0].clientX)}
		on:touchend={swipeEnd}
		transition:fade={{ duration: 180 }}
	>
		<button class="absolute top-4 right-5 text-white/80 hover:text-white text-3xl" on:click={() => (open = null)} aria-label="close">×</button>
		{#if photos.length > 1}
			<button class="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl" on:click|stopPropagation={() => step(-1)} aria-label="previous">‹</button>
			<button class="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl" on:click|stopPropagation={() => step(1)} aria-label="next">›</button>
		{/if}
		{#key open}
			<div class="max-w-5xl max-h-[92vh] flex flex-col items-center" on:click|stopPropagation in:scale={{ start: 0.97, duration: 220, easing: cubicOut }}>
				<img src={shown.src} alt={describe(shown)} class="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl" />
				<div class="mt-3 text-center">
					{#if shown.caption}<p class="text-white text-lg">{shown.caption}</p>{/if}
					<p class="text-white/60 text-sm">{#if shown.date}{formatDate(shown.date, 'long')} · {/if}{(open ?? 0) + 1} / {photos.length}</p>
				</div>
			</div>
		{/key}
	</div>
{/if}
