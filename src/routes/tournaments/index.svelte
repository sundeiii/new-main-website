<script context="module" lang="ts">
	import type { Load } from '@sveltejs/kit';

	// The list lives in the database now (managed at /admin); the API falls back to the old
	// hardcoded list until it's been imported.
	export const load: Load = async ({ fetch }) => {
		const res = await fetch('/api/tournaments');
		return { props: { tournaments: res.ok ? await res.json() : [] } };
	};
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import type { TournamentYear } from '$lib/tournamentSeed';
	import { fade, fly } from 'svelte/transition';
	import Tooltip from '$lib/components/Tooltip.svelte';
	import { countryName, flagUrl } from '$lib/flags';
	
	export let tournaments: TournamentYear[];

	let hostProfiles: Record<number, { cover_url: string | null; country_code: string | null; country_name: string | null }> = {};

	async function fetchProfile(userId: number) {
		if (hostProfiles[userId]) return;
		try {
			const res = await fetch(`/api/osu-profile?id=${userId}`);
			if (res.ok) {
				const data = await res.json();
				hostProfiles[userId] = data;
				hostProfiles = hostProfiles;
			}
		} catch {}
	}
	
	// Filter chips from the words used in roles ("referee/streamer" → referee, streamer).
	$: roleWords = [...new Set(tournaments.flatMap((t) => t.events.flatMap((e) => e.role.split('/').map((r) => r.trim().toLowerCase()))))].filter(Boolean);
	let roleFilter = '';
	$: shownYears = tournaments
		.map((t) => ({ ...t, events: roleFilter ? t.events.filter((e) => e.role.toLowerCase().split('/').map((r) => r.trim()).includes(roleFilter)) : t.events }))
		.filter((t) => t.events.length);
	$: total = tournaments.reduce((n, t) => n + t.events.length, 0);

	onMount(() => {
		const allHosts = tournaments.flatMap(t => t.events.flatMap(e => e.hosts || []));
		const uniqueIds = [...new Set(allHosts.map(h => h.id))];
		uniqueIds.forEach(id => fetchProfile(id));
	});
	
</script>

<svelte:head>
	<title>tournament staffing</title>
	<meta property="og:title" content="tournament staffing" />
	<meta name="description" content="osu! tournament staffing history" />
	<meta property="og:description" content="osu! tournament staffing history" />
	<meta name="theme-color" media="(prefers-color-scheme: light)" content="#f9f0f5" />
	<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#281c21" />
</svelte:head>

<section class="p-8 sm:p-12 lg:p-24 lg:py-16 font-cascadia">
	<div class="flex flex-col gap-7 max-w-3xl">
		<div in:fly={{ y: -20, duration: 400 }}>
			<h1 class="text-ocean-900 dark:text-ocean-100">tournament staffing</h1>
			<p class="text-ocean-700 dark:text-ocean-400">osu! tournaments I've helped staff · {total} and counting</p>
		</div>

		{#if roleWords.length > 1}
			<div class="flex flex-wrap gap-1.5 text-xs" in:fly={{ y: -10, duration: 400, delay: 50 }}>
				{#each ['', ...roleWords] as word}
					<button
						on:click={() => (roleFilter = word)}
						class="px-2.5 py-1 rounded-full border transition-colors {roleFilter === word
							? 'bg-ocean-700 dark:bg-ocean-300 text-ocean-100 dark:text-ocean-900 border-transparent'
							: 'border-ocean-300 dark:border-ocean-700 text-ocean-700 dark:text-ocean-400 hover:border-ocean-500'}"
					>
						{word || 'all'}
					</button>
				{/each}
			</div>
		{/if}

	{#each shownYears as { year, events }, i (year)}
		<div in:fly={{ y: 20, duration: 400, delay: 100 + (i * 100) }}>
			<h2 class="text-ocean-900 dark:text-ocean-100 text-2xl mb-3">{year}</h2>
			<p class="text-ocean-700 dark:text-ocean-400 text-sm mb-4">
				{events.length} tournament{events.length !== 1 ? 's' : ''}{roleFilter ? ` as ${roleFilter}` : ' staffed'}
			</p>
			<div class="flex flex-col gap-3">
				{#each events as event}
					<div 
						class="border border-ocean-300 dark:border-ocean-700 rounded overflow-hidden {event.banner ? 'group' : 'hover:bg-ocean-100 dark:hover:bg-ocean-800'} transition-all relative"
					>
						{#if event.banner}
							<img 
								src={event.banner}
								alt=""
								loading="lazy"
								decoding="async"
								class="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
							/>
							<!-- Darkest behind the text (left), so light banners stay readable -->
							<div class="absolute inset-0 bg-gradient-to-r from-black/90 via-black/75 to-black/40 transition-opacity duration-300 group-hover:opacity-80" />
						{/if}
						<!-- Not an <a> around everything: the host chips are links, and links can't be
							 nested (browsers split them when parsing the server HTML). The title's link is
							 stretched over the card instead, and the chips sit above it. -->
						<div class="relative p-4 {event.badge ? 'pr-28' : ''} {event.banner ? 'banner-text' : ''}">
							{#if event.badge}
								<img
									src={event.badge}
									alt="{event.name} badge"
									loading="lazy"
									decoding="async"
									class="absolute top-3 right-3 w-20 h-16 object-contain object-right-top pointer-events-none drop-shadow"
									on:error={(e) => (e.currentTarget.style.display = 'none')}
								/>
							{/if}
							<h3 class="{event.banner ? 'text-white' : 'text-ocean-900 dark:text-ocean-100'} font-medium mb-1">
								<a
									href={event.link}
									target="_blank"
									rel="noopener noreferrer"
									class="hover:underline after:absolute after:inset-0"
								>
									{event.name}
								</a>
							</h3>
							<p class="{event.banner ? 'text-white/70' : 'text-ocean-700 dark:text-ocean-400'} text-sm flex flex-wrap items-center gap-1.5">
								{event.role}
								{#each [{ icon: '✦', text: event.tier }, { icon: '📍', text: event.region }].filter((t) => t.text) as tag}
									<span
										class="inline-flex items-center gap-1 text-xs leading-none px-2 py-1 rounded-full border {event.banner
											? 'border-white/30 bg-black/30 text-white/90'
											: 'border-ocean-300 dark:border-ocean-600 bg-ocean-100 dark:bg-ocean-800 text-ocean-700 dark:text-ocean-300'}"
									>
										<span class="text-[10px] opacity-80">{tag.icon}</span>{tag.text}
									</span>
								{/each}
							</p>
							{#if event.memory}
								<p class="{event.banner ? 'text-white/80' : 'text-ocean-700 dark:text-ocean-300'} text-xs italic mt-1.5">“{event.memory}”</p>
							{/if}
							{#if event.hosts?.length}
								<div class="flex items-center gap-2 mt-2 flex-wrap">
									<span class="{event.banner ? 'text-white/60' : 'text-ocean-600 dark:text-ocean-500'} text-xs">hosted by</span>
									{#each event.hosts as host}
										<a
											href="https://osu.ppy.sh/users/{host.id}"
											target="_blank"
											rel="noopener noreferrer"
											class="relative z-10 inline-flex items-center gap-1.5 rounded-md pr-2 hover:brightness-110 transition-all"
											style="background: {hostProfiles[host.id]?.cover_url ? `url(${hostProfiles[host.id].cover_url}) center/cover` : 'linear-gradient(135deg, #334155, #1e293b)'};"
										>
											<div class="absolute inset-0 bg-black/50 rounded-md"></div>
											<img src="https://a.ppy.sh/{host.id}" alt={host.name} class="relative w-7 h-7 rounded-l-md object-cover" />
											<span class="relative text-white text-xs font-medium drop-shadow-sm">{host.name}</span>
											{#if hostProfiles[host.id]?.country_code}
												<Tooltip text={hostProfiles[host.id].country_name || countryName(hostProfiles[host.id].country_code)}>
													<img
														src={flagUrl(hostProfiles[host.id].country_code)}
														alt={hostProfiles[host.id].country_name || countryName(hostProfiles[host.id].country_code)}
														class="h-3.5 w-auto"
													/>
												</Tooltip>
											{/if}
										</a>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/each}
	</div>
</section>

<style>
	/* A soft shadow keeps white text readable on bright parts of a banner. */
	.banner-text {
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9), 0 0 12px rgba(0, 0, 0, 0.6);
	}
</style>
