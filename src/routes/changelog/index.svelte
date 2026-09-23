<script context="module" lang="ts">
	import type { Load } from '@sveltejs/kit';

	export const load: Load = async ({ fetch }) => {
		const res = await fetch('/api/changelog');
		return { props: { entries: res.ok ? await res.json() : [] } };
	};
</script>

<script lang="ts">
	import { fly } from 'svelte/transition';

	export let entries: { id: number; date: string; text: string }[];

	// 23.09.26, like a proper old-web changelog
	const short = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(2, 4)}`;
</script>

<svelte:head>
	<title>changelog</title>
	<meta property="og:title" content="changelog" />
	<meta name="description" content="what changed on this site" />
	<meta property="og:description" content="what changed on this site" />
</svelte:head>

<section class="p-8 sm:p-12 lg:p-24 lg:py-16 font-cascadia">
	<div class="flex flex-col gap-7 max-w-2xl">
		<div in:fly={{ y: -20, duration: 400 }}>
			<h1 class="text-ocean-900 dark:text-ocean-100">changelog</h1>
			<p class="text-ocean-700 dark:text-ocean-400">what changed around here</p>
		</div>

		<ul class="flex flex-col gap-1.5 text-sm" in:fly={{ y: 20, duration: 400, delay: 100 }}>
			{#each entries as entry (entry.id)}
				<li class="flex gap-3">
					<time datetime={entry.date} class="text-ocean-500 shrink-0">{short(entry.date)}</time>
					<span class="text-ocean-800 dark:text-ocean-300">– {entry.text}</span>
				</li>
			{:else}
				<li class="text-ocean-700 dark:text-ocean-400">nothing logged yet</li>
			{/each}
		</ul>
	</div>
</section>
