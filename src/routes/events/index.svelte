<script context="module" lang="ts">
	import type { Load } from '@sveltejs/kit';

	// LANs and other events, written in /admin → blog as kind "event".
	export const load: Load = async ({ fetch }) => {
		const res = await fetch('/api/blog?kind=event');
		return { props: { events: res.ok ? await res.json() : [] } };
	};
</script>

<script lang="ts">
	import { fly } from 'svelte/transition';

	interface EventItem {
		slug: string;
		title: string;
		date: string;
		excerpt: string;
		banner: string | null;
		location: string | null;
	}

	export let events: EventItem[];

	const today = new Date().toISOString().slice(0, 10);
	$: upcoming = events.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
	$: past = events.filter((e) => e.date < today);

	const formatDate = (d: string) =>
		new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

	function countdown(d: string) {
		const days = Math.round((new Date(d + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / 864e5);
		return days === 0 ? 'today!' : days === 1 ? 'tomorrow' : `in ${days} days`;
	}
</script>

<svelte:head>
	<title>events</title>
	<meta property="og:title" content="events" />
	<meta name="description" content="LANs and events i've been to" />
	<meta property="og:description" content="LANs and events i've been to" />
</svelte:head>

<section class="p-8 sm:p-12 lg:p-24 lg:py-16 font-cascadia">
	<div class="flex flex-col gap-7 max-w-3xl">
		<div in:fly={{ y: -20, duration: 400 }}>
			<h1 class="text-ocean-900 dark:text-ocean-100">events</h1>
			<p class="text-ocean-700 dark:text-ocean-400">LANs, meetups and other places i've been</p>
		</div>

		{#each [{ label: 'upcoming', items: upcoming }, { label: 'past', items: past }] as group, gi}
			{#if group.items.length}
				<div class="flex flex-col gap-3" in:fly={{ y: 20, duration: 400, delay: 100 + gi * 100 }}>
					<h2 class="text-ocean-900 dark:text-ocean-100 text-xl">{group.label}</h2>
					{#each group.items as event}
						<a
							href="/events/{event.slug}"
							class="group relative block border border-ocean-300 dark:border-ocean-700 rounded overflow-hidden hover:border-ocean-400 dark:hover:border-ocean-600 transition-colors"
						>
							{#if event.banner}
								<img src={event.banner} alt="" loading="lazy" decoding="async" class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
								<div class="absolute inset-0 bg-black/60 group-hover:bg-black/45 transition-colors" />
							{/if}
							<div class="relative p-4">
								<div class="flex flex-wrap items-baseline justify-between gap-2">
									<h3 class="{event.banner ? 'text-white' : 'text-ocean-900 dark:text-ocean-100'} font-medium group-hover:underline">{event.title}</h3>
									{#if group.label === 'upcoming'}
										<span class="text-xs px-2 py-0.5 rounded-full bg-ocean-green/90 text-ocean-950">{countdown(event.date)}</span>
									{/if}
								</div>
								<p class="{event.banner ? 'text-white/70' : 'text-ocean-700 dark:text-ocean-400'} text-sm">
									{formatDate(event.date)}{#if event.location} · 📍 {event.location}{/if}
								</p>
								{#if event.excerpt}
									<p class="{event.banner ? 'text-white/85' : 'text-ocean-800 dark:text-ocean-300'} text-sm mt-2">{event.excerpt}</p>
								{/if}
							</div>
						</a>
					{/each}
				</div>
			{/if}
		{/each}

		{#if !events.length}
			<p class="text-ocean-700 dark:text-ocean-400">nothing here yet. soon™</p>
		{/if}
	</div>
</section>
