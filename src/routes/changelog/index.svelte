<script context="module" lang="ts">
	// The changelog, as a timeline grouped by month.
	import type { Load } from '@sveltejs/kit';

	export const load: Load = async ({ fetch }) => {
		const res = await fetch('/api/changelog');
		return { props: { entries: res.ok ? await res.json() : [] } };
	};
</script>

<script lang="ts">
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { app } from '$lib/components/site/app';

	export let entries: { id: number; date: string; text: string }[];

	const rise = (i: number) => (app.hydrated ? { y: 12, duration: 500, delay: 60 + i * 60, easing: cubicOut } : { duration: 0 });
	const monthOf = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
	const dayOf = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
	$: months = entries.reduce((list: { month: string; items: typeof entries }[], e) => {
		const month = monthOf(e.date);
		const last = list[list.length - 1];
		if (last?.month === month) last.items.push(e);
		else list.push({ month, items: [e] });
		return list;
	}, []);

	const label = 'text-[11px] uppercase tracking-widest text-ocean-500';
	const muted = 'text-ocean-600 dark:text-ocean-400';
	const strong = 'text-ocean-900 dark:text-ocean-100';
</script>

<svelte:head>
	<title>changelog</title>
	<meta property="og:title" content="changelog" />
	<meta name="description" content="what changed on this site" />
	<meta property="og:description" content="what changed on this site" />
</svelte:head>

<section class="px-8 sm:px-12 lg:px-24 pt-8 sm:pt-12 pb-4 font-cascadia flex flex-col gap-10 max-w-3xl">
	<header in:fly={rise(0)}>
		<h1 class="text-3xl {strong}">changelog</h1>
		<p class="text-sm {muted} mt-2">what changed around here</p>
	</header>

	{#each months as m, mi}
		<div class="flex flex-col gap-4" in:fly={rise(1 + mi)}>
			<span class={label}>{m.month}</span>
			<ol class="relative border-l border-ocean-300/70 dark:border-ocean-700/70 ml-1.5 flex flex-col gap-4">
				{#each m.items as entry (entry.id)}
					<li class="relative pl-7">
						<span class="absolute -left-[5px] top-1.5 w-[9px] h-[9px] rounded-full {mi === 0 ? 'accent-bg' : 'bg-ocean-400 dark:bg-ocean-600'}" />
						<time datetime={entry.date} class="block text-xs {muted} tabular-nums">{dayOf(entry.date)}</time>
						<p class="text-sm text-ocean-800 dark:text-ocean-200">{entry.text}</p>
					</li>
				{/each}
			</ol>
		</div>
	{:else}
		<p class={muted}>nothing logged yet</p>
	{/each}
</section>
