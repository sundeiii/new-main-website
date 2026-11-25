<script context="module" lang="ts">
	// The /now page (edited in /admin → pages → now).
	import type { Load } from '@sveltejs/kit';

	// Sections are edited in /admin → pages → now.
	export const load: Load = async ({ fetch }) => {
		const [res, dates] = await Promise.all([fetch('/api/site/now'), fetch('/api/site/updated?keys=now').catch(() => null)]);
		return { props: { now: res.ok ? await res.json() : null, updatedAt: dates?.ok ? (await dates.json()).now : null } };
	};
</script>

<script lang="ts">
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { settingDefaults, type NowSettings } from '$lib/siteSettings';
	import { presence } from '$lib/components/site/presence';
	import { app } from '$lib/components/site/app';
	import { stickyAside } from '$lib/components/site/sticky';
	import { ago } from '$lib/dates';

	export let now: NowSettings | null;
	// When it was last saved in admin; the typed "last updated" text is the fallback.
	export let updatedAt: string | null = null;
	$: page = now ?? settingDefaults.now;

	const rise = (i: number) => (app.hydrated ? { y: 12, duration: 500, delay: 60 + i * 60, easing: cubicOut } : { duration: 0 });
	const muted = 'text-ocean-600 dark:text-ocean-400';
	const label = 'text-[11px] uppercase tracking-widest text-ocean-500';
	const strong = 'text-ocean-900 dark:text-ocean-100';
</script>

<svelte:head>
	<title>now</title>
	<meta property="og:title" content="now" />
	<meta name="description" content="what i'm up to right now" />
	<meta property="og:description" content="what i'm up to right now" />
</svelte:head>

<section class="px-8 sm:px-12 lg:px-24 pt-8 sm:pt-12 pb-4 font-cascadia grid gap-14 lg:grid-cols-[17rem_1fr] xl:gap-24">
	<!-- ── side: title, when, and what's happening this second ── -->
	<aside use:stickyAside class="flex flex-col gap-7 lg:self-start" in:fly={rise(0)}>
		<div>
			<h1 class="text-3xl {strong}">now</h1>
			<p class="text-sm {muted} mt-2">what i'm up to these days</p>
			{#if updatedAt}
				<p class="text-xs text-ocean-500 mt-1">
					<time datetime={updatedAt} title={new Date(updatedAt).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' })}>updated {ago(updatedAt)}</time>
				</p>
			{:else if page.updated}
				<p class="text-xs text-ocean-500 mt-1">updated {page.updated}</p>
			{/if}
		</div>

		<!-- Always there (so nothing jumps when Discord connects); says so when nothing's on. -->
		<div class="flex flex-col gap-2">
			<span class={label}>this very second</span>
			<div class="glass rounded-2xl border border-ocean-300/50 dark:border-ocean-700/50 p-3 flex flex-col gap-1 min-h-[3.5rem]">
				{#each ($presence?.items ?? []).slice(0, 3) as item}
					<div class="flex items-center gap-3 p-1">
						{#if item.image}
							<img src={item.image} alt="" class="w-8 h-8 rounded-md object-cover shrink-0" on:error={(e) => (e.currentTarget.style.visibility = 'hidden')} />
						{:else}
							<span class="w-8 h-8 rounded-md shrink-0 grid place-items-center accent-soft text-sm">{item.label === 'coding' ? '⌨' : item.label === 'listening' ? '♪' : '●'}</span>
						{/if}
						<span class="min-w-0 text-xs">
							<span class="block text-[10px] uppercase tracking-widest text-ocean-500">{item.label}{item.live ? '' : ' · paused'}</span>
							<span class="block truncate {strong}">{item.title}</span>
						</span>
					</div>
				{:else}
					<p class="p-1 text-xs {muted}">{$presence ? `nothing much, i'm ${$presence.short}` : 'checking…'}</p>
				{/each}
			</div>
		</div>

		{#if page.sections.length > 2}
			<div class="hidden lg:flex flex-col gap-2">
				<span class={label}>on this page</span>
				<div class="flex flex-wrap gap-1.5">
					{#each page.sections as section, i}
						<button
							on:click={() => document.getElementById(`now-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
							class="px-3 py-1 rounded-full text-xs border border-ocean-300/70 dark:border-ocean-700/70 {muted} hover:text-ocean-900 dark:hover:text-ocean-100 hover:border-ocean-500 transition-colors"
						>
							{section.icon} {section.title}
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<p class="text-xs {muted}">
			a <a href="https://nownownow.com/about" target="_blank" rel="noopener noreferrer" class="underline">/now page</a>, inspired by
			<a href="https://sive.rs/nowff" target="_blank" rel="noopener noreferrer" class="underline">Derek Sivers</a>. make one too!
		</p>
	</aside>

	<!-- ── the sections ── -->
	<div class="flex flex-col gap-10 min-w-0">
		{#if page.status}
			<p class="text-xl sm:text-2xl leading-snug {strong} border-l-2 pl-5 max-w-3xl" style="border-color: var(--accent)" in:fly={rise(1)}>{page.status}</p>
		{/if}

		<div class="grid gap-4 md:grid-cols-2">
			{#each page.sections as section, i}
				<div id="now-{i}" class="glass rounded-2xl border border-ocean-300/50 dark:border-ocean-700/50 p-5 flex flex-col gap-3 scroll-mt-28" in:fly={rise(2 + i)}>
					<div class="flex items-center gap-3">
						<span class="w-10 h-10 grid place-items-center rounded-xl accent-soft text-lg">{section.icon || '·'}</span>
						<h2 class={strong}>{section.title}</h2>
						<span class="ml-auto text-xs text-ocean-500 tabular-nums">{section.items.length}</span>
					</div>
					<ul class="flex flex-col text-sm">
						{#each section.items as item}
							<li class="flex gap-2 py-1.5 border-t border-ocean-300/40 dark:border-ocean-700/40 first:border-t-0 text-ocean-700 dark:text-ocean-300">
								<span class="text-ocean-400 dark:text-ocean-600">›</span><span>{item}</span>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>
	</div>
</section>
