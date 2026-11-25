<script context="module" lang="ts">
	// The /now page (edited in /admin → pages → now).
	import type { Load } from '@sveltejs/kit';

	// Sections are edited in /admin → pages → now.
	export const load: Load = async ({ fetch }) => {
		const res = await fetch('/api/site/now');
		return { props: { now: res.ok ? await res.json() : null } };
	};
</script>

<script lang="ts">
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { settingDefaults, type NowSettings } from '$lib/siteSettings';
	import { presence } from '$lib/components/site/presence';
	import { app } from '$lib/components/site/app';

	export let now: NowSettings | null;
	$: page = now ?? settingDefaults.now;

	const rise = (i: number) => (app.hydrated ? { y: 12, duration: 500, delay: 60 + i * 60, easing: cubicOut } : { duration: 0 });
	const muted = 'text-ocean-600 dark:text-ocean-400';
	const strong = 'text-ocean-900 dark:text-ocean-100';
</script>

<svelte:head>
	<title>now</title>
	<meta property="og:title" content="now" />
	<meta name="description" content="what i'm up to right now" />
	<meta property="og:description" content="what i'm up to right now" />
</svelte:head>

<section class="px-8 sm:px-12 lg:px-24 pt-8 sm:pt-12 pb-4 font-cascadia flex flex-col gap-10 max-w-6xl">
	<header class="flex flex-col gap-4" in:fly={rise(0)}>
		<div class="flex flex-wrap items-end justify-between gap-4">
			<div>
				<h1 class="text-3xl {strong}">now</h1>
				<p class="text-sm {muted} mt-2">what i'm up to these days · updated {page.updated}</p>
			</div>
			{#if $presence?.items.length}
				<span class="flex items-center gap-2 text-xs {muted}">
					<span class="relative flex w-2 h-2"><span class="absolute inset-0 rounded-full accent-bg animate-ping opacity-60" /><span class="relative w-2 h-2 rounded-full accent-bg" /></span>
					this very second: {$presence.short}
				</span>
			{/if}
		</div>
		{#if page.status}
			<p class="text-xl sm:text-2xl leading-snug {strong} border-l-2 pl-5 max-w-3xl" style="border-color: var(--accent)">{page.status}</p>
		{/if}
	</header>

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
		{#each page.sections as section, i}
			<div class="glass rounded-2xl border border-ocean-300/50 dark:border-ocean-700/50 p-5 flex flex-col gap-3" in:fly={rise(1 + i)}>
				<div class="flex items-center gap-3">
					<span class="w-10 h-10 grid place-items-center rounded-xl accent-soft text-lg">{section.icon || '·'}</span>
					<h2 class="{strong}">{section.title}</h2>
				</div>
				<ul class="flex flex-col gap-1.5 text-sm">
					{#each section.items as item}
						<li class="flex gap-2 text-ocean-700 dark:text-ocean-300"><span class="text-ocean-400 dark:text-ocean-600">›</span><span>{item}</span></li>
					{/each}
				</ul>
			</div>
		{/each}
	</div>

	<p class="text-xs {muted}">
		this is a <a href="https://nownownow.com/about" target="_blank" rel="noopener noreferrer" class="underline">/now page</a>, inspired by
		<a href="https://sive.rs/nowff" target="_blank" rel="noopener noreferrer" class="underline">Derek Sivers</a>. if you have your own site, make one too.
	</p>
</section>
