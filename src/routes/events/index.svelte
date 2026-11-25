<script context="module" lang="ts">
	// LANs and other events (written in /admin → blog as kind "event"), as upcoming and past timelines.
	import type { Load } from '@sveltejs/kit';

	// LANs and other events, written in /admin → blog as kind "event".
	export const load: Load = async ({ fetch }) => {
		const res = await fetch('/api/blog?kind=event');
		return { props: { events: res.ok ? await res.json() : [] } };
	};
</script>

<script lang="ts">
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { daysBetween, eventTiming, formatRange, today } from '$lib/dates';
	import { app } from '$lib/components/site/app';
	import { stickyAside } from '$lib/components/site/sticky';

	interface EventItem {
		slug: string;
		title: string;
		date: string;
		endDate: string | null;
		excerpt: string;
		banner: string | null;
		location: string | null;
	}
	export let events: EventItem[];

	const rise = (i: number) => (app.hydrated ? { y: 12, duration: 500, delay: 60 + i * 70, easing: cubicOut } : { duration: 0 });

	// Events still going on count as upcoming.
	$: upcoming = events.filter((e) => eventTiming(e) !== 'past').sort((a, b) => a.date.localeCompare(b.date));
	$: past = events.filter((e) => eventTiming(e) === 'past');
	$: next = upcoming[0];
	$: nextDays = next ? daysBetween(today(), next.date) : 0;
	$: places = new Set(events.map((e) => e.location).filter(Boolean)).size;

	const countdown = (e: EventItem) => {
		if (eventTiming(e) === 'now') return 'happening now';
		const days = daysBetween(today(), e.date);
		return days === 1 ? 'tomorrow' : `in ${days} days`;
	};

	const label = 'text-[11px] uppercase tracking-widest text-ocean-500';
	const muted = 'text-ocean-600 dark:text-ocean-400';
	const strong = 'text-ocean-900 dark:text-ocean-100';
</script>

<svelte:head>
	<title>events</title>
	<meta property="og:title" content="events" />
	<meta name="description" content="LANs and events i've been to" />
	<meta property="og:description" content="LANs and events i've been to" />
</svelte:head>

<section class="px-8 sm:px-12 lg:px-24 pt-8 sm:pt-12 pb-4 font-cascadia grid gap-14 lg:grid-cols-[17rem_1fr] xl:gap-24">
	<!-- ── what's next + totals ── -->
	<aside use:stickyAside class="flex flex-col gap-7 lg:self-start" in:fly={rise(0)}>
		<div>
			<h1 class="text-3xl {strong}">events</h1>
			<p class="text-sm {muted} mt-2">LANs, meetups and other places i've been</p>
		</div>

		{#if next}
			<a href="/events/{next.slug}" class="group glass rounded-2xl border border-ocean-300/50 dark:border-ocean-700/50 p-4 flex flex-col gap-1">
				<span class={label}>next up</span>
				{#if eventTiming(next) === 'now'}
					<span class="flex items-center gap-2 text-2xl {strong}">
						<span class="relative flex w-2.5 h-2.5"><span class="absolute inset-0 rounded-full accent-bg animate-ping opacity-60" /><span class="relative w-2.5 h-2.5 rounded-full accent-bg" /></span>
						now
					</span>
				{:else}
					<span class="text-4xl tabular-nums {strong}">{nextDays}<span class="text-base {muted}"> day{nextDays === 1 ? '' : 's'}</span></span>
				{/if}
				<span class="text-sm {strong} group-hover:underline">{next.title}</span>
				<span class="text-xs {muted}">{formatRange(next.date, next.endDate)}{next.location ? ` · ${next.location}` : ''}</span>
			</a>
		{/if}

		<div class="grid grid-cols-2 gap-2">
			{#each [{ v: past.length, l: 'been to' }, { v: places, l: places === 1 ? 'place' : 'places' }] as s}
				<div class="glass rounded-xl border border-ocean-300/50 dark:border-ocean-700/50 px-3 py-2.5">
					<div class="text-xl tabular-nums {strong}">{s.v}</div>
					<div class="text-[11px] {muted}">{s.l}</div>
				</div>
			{/each}
		</div>
	</aside>

	<!-- ── timelines ── -->
	<div class="flex flex-col gap-14 min-w-0">
		{#each [{ title: 'upcoming', items: upcoming }, { title: 'past', items: past }] as group, gi}
			{#if group.items.length}
				<div class="flex flex-col gap-5" in:fly={rise(1 + gi)}>
					<span class={label}>{group.title}</span>
					<ol class="relative border-l border-ocean-300/70 dark:border-ocean-700/70 ml-1.5 flex flex-col gap-5">
						{#each group.items as event (event.slug)}
							{@const now = eventTiming(event) === 'now'}
							<li class="relative pl-7">
								{#if now}
									<span class="absolute -left-[6px] top-6 flex w-[11px] h-[11px]"><span class="absolute inset-0 rounded-full accent-bg animate-ping opacity-60" /><span class="relative w-[11px] h-[11px] rounded-full accent-bg" /></span>
								{:else}
									<span class="absolute -left-[6px] top-6 w-[11px] h-[11px] rounded-full {group.title === 'upcoming' ? 'accent-bg' : 'bg-ocean-400 dark:bg-ocean-600'}" />
								{/if}
								<a href="/events/{event.slug}" class="group relative block overflow-hidden rounded-2xl border border-ocean-300/50 dark:border-ocean-700/50 {event.banner ? 'min-h-[9rem]' : 'glass'}" data-vt="banner-{event.slug}">
									{#if event.banner}
										<div class="absolute inset-0">
											<img src={event.banner} alt="" loading="lazy" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
										</div>
										<div class="absolute inset-0 bg-gradient-to-r from-black/90 via-black/65 to-black/20" />
									{/if}
									<div class="relative p-5 flex flex-col gap-1 {event.banner ? 'text-white banner-text' : ''}">
										<div class="flex flex-wrap items-baseline justify-between gap-2">
											<h3 class="text-lg {event.banner ? '' : strong} group-hover:underline">{event.title}</h3>
											{#if group.title === 'upcoming'}
												<span class="text-xs px-2.5 py-1 rounded-full accent-bg" style="color: var(--accent-fg)">{countdown(event)}</span>
											{/if}
										</div>
										<span class="text-sm {event.banner ? 'opacity-80' : muted}">{formatRange(event.date, event.endDate)}{event.location ? ` · ${event.location}` : ''}</span>
										{#if event.excerpt}<p class="text-sm mt-1 {event.banner ? 'opacity-90' : 'text-ocean-700 dark:text-ocean-300'}">{event.excerpt}</p>{/if}
									</div>
								</a>
							</li>
						{/each}
					</ol>
				</div>
			{/if}
		{/each}
		{#if !events.length}
			<p class={muted}>nothing here yet. soon™</p>
		{/if}
	</div>
</section>

<style>
	.banner-text {
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9), 0 0 12px rgba(0, 0, 0, 0.6);
	}
</style>
