<script context="module" lang="ts">
	import type { Load } from '@sveltejs/kit';

	// Content is edited in /admin → pages → osu!. Live stats are fetched in the browser.
	export const load: Load = async ({ fetch }) => {
		const [osu, tournaments] = await Promise.all([
			fetch('/api/site/osu').then((r) => (r.ok ? r.json() : null)).catch(() => null),
			fetch('/api/tournaments').then((r) => (r.ok ? r.json() : [])).catch(() => [])
		]);
		return { props: { osu, tournaments } };
	};
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { marked } from 'marked';
	import PostBody from '$lib/components/PostBody.svelte';
	import { countryName, flagUrl } from '$lib/flags';
	import { settingDefaults, type OsuSettings } from '$lib/siteSettings';
	import type { TournamentYear } from '$lib/tournamentSeed';

	export let osu: OsuSettings | null;
	export let tournaments: TournamentYear[];

	$: page = osu ?? settingDefaults.osu;
	$: introHtml = page.intro ? (marked.parse(page.intro, { async: false, gfm: true, breaks: true }) as string) : '';
	$: staffed = tournaments.flatMap((y) => y.events.map((e) => ({ ...e, year: y.year })));
	$: latest = [...staffed].reverse().slice(0, 3);

	interface Stats {
		username: string;
		avatar_url: string;
		cover_url: string;
		country_code: string;
		global_rank: number | null;
		country_rank: number | null;
		pp: number | null;
		team: { id: number; name: string; short_name: string | null; flag_url: string | null } | null;
	}
	let stats: Stats | null = null;

	onMount(async () => {
		if (!page.showStats || !page.username) return;
		try {
			const res = await fetch(`/api/osu-user?u=${encodeURIComponent(page.username)}`);
			if (res.ok) stats = await res.json();
		} catch {}
	});

	const fmt = (n: number | null | undefined) => (n == null ? '–' : Math.round(n).toLocaleString('en-US'));</script>

<svelte:head>
	<title>osu!</title>
	<meta property="og:title" content="osu!" />
	<meta name="description" content="tournaments, maps and osu! things" />
	<meta property="og:description" content="tournaments, maps and osu! things" />
</svelte:head>

<section class="p-8 sm:p-12 lg:p-24 lg:py-16 font-cascadia">
	<div class="flex flex-col gap-8 max-w-3xl">
		<div in:fly={{ y: -20, duration: 400 }}>
			<h1 class="text-ocean-900 dark:text-ocean-100">osu!</h1>
			<p class="text-ocean-700 dark:text-ocean-400">circles, tournaments and everything around them</p>
		</div>

		<!-- profile card -->
		{#if page.showStats}
			<a
				href="https://osu.ppy.sh/users/{stats?.username ?? page.username}"
				target="_blank"
				rel="noopener noreferrer"
				class="group relative block rounded-lg overflow-hidden border border-ocean-300 dark:border-ocean-700"
				in:fly={{ y: 20, duration: 400, delay: 80 }}
			>
				{#if stats?.cover_url}
					<img src={stats.cover_url} alt="" class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
				{/if}
				<div class="absolute inset-0 {stats?.cover_url ? 'bg-black/60' : 'bg-ocean-200/50 dark:bg-ocean-800/50'}" />
				<div class="relative p-5 flex items-center gap-4">
					{#if stats?.avatar_url}
						<img src={stats.avatar_url} alt="" class="w-16 h-16 rounded-lg" />
					{/if}
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2 {stats?.cover_url ? 'text-white' : 'text-ocean-900 dark:text-ocean-100'}">
							{#if stats?.team?.short_name}
								<span class="text-lg opacity-70" title={stats.team.name}>[{stats.team.short_name}]</span>
							{/if}
							<span class="text-lg">{stats?.username ?? page.username}</span>
							{#if stats?.team?.flag_url}
								<img src={stats.team.flag_url} alt={stats.team.name} title={stats.team.name} class="h-4 rounded-sm" />
							{/if}
							{#if stats?.country_code}<img src={flagUrl(stats.country_code)} alt={countryName(stats.country_code)} title={countryName(stats.country_code)} class="h-4" />{/if}
						</div>
						<div class="flex flex-wrap gap-x-5 gap-y-1 mt-1 text-sm {stats?.cover_url ? 'text-white/80' : 'text-ocean-700 dark:text-ocean-400'}">
							<span>#{fmt(stats?.global_rank)} global</span>
							<span>#{fmt(stats?.country_rank)} country</span>
							<span>{fmt(stats?.pp)}pp</span>
						</div>
					</div>
				</div>
			</a>
		{/if}

		{#if introHtml}
			<div in:fly={{ y: 20, duration: 400, delay: 120 }}><PostBody html={introHtml} /></div>
		{/if}

		<!-- tournaments -->
		{#if staffed.length}
			<div class="flex flex-col gap-3" in:fly={{ y: 20, duration: 400, delay: 160 }}>
				<h2 class="text-ocean-900 dark:text-ocean-100 text-lg">
					tournaments <span class="text-ocean-500 text-sm">· {staffed.length} staffed</span>
				</h2>
				<ul class="flex flex-col gap-1 text-sm">
					{#each latest as t}
						<li class="text-ocean-800 dark:text-ocean-300">
							<a href={t.link} target="_blank" rel="noopener noreferrer" class="underline hover:text-ocean-900 dark:hover:text-ocean-100">{t.name}</a>
							<span class="text-ocean-500">– {t.role} ({t.year})</span>
						</li>
					{/each}
				</ul>
				<a href="/tournaments" class="text-sm text-ocean-600 dark:text-ocean-400 hover:underline">see all →</a>
			</div>
		{/if}

		<!-- favourite maps -->
		{#if page.maps.length}
			<div class="flex flex-col gap-3" in:fly={{ y: 20, duration: 400, delay: 200 }}>
				<h2 class="text-ocean-900 dark:text-ocean-100 text-lg">maps i love</h2>
				<div class="grid gap-2 sm:grid-cols-2">
					{#each page.maps as map}
						<a
							href={map.url}
							target="_blank"
							rel="noopener noreferrer"
							class="group relative overflow-hidden border border-ocean-300 dark:border-ocean-700 rounded p-3 hover:border-ocean-500 transition-colors"
						>
							{#if map.cover}
								<img src={map.cover} alt="" loading="lazy" class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
								<div class="absolute inset-0 bg-gradient-to-r from-black/90 via-black/75 to-black/40 transition-opacity group-hover:opacity-80" />
							{/if}
							<div class="relative {map.cover ? 'banner-text' : ''}">
								<div class="{map.cover ? 'text-white' : 'text-ocean-900 dark:text-ocean-100'} text-sm">{map.title}</div>
								{#if map.mapper || map.stars}
									<div class="{map.cover ? 'text-white/70' : 'text-ocean-600 dark:text-ocean-400'} text-xs mt-0.5">
										{[map.mapper ? `mapped by ${map.mapper}` : '', map.stars ? `${map.stars}★` : ''].filter(Boolean).join(' · ')}
									</div>
								{/if}
								{#if map.note}<div class="{map.cover ? 'text-white/90' : 'text-ocean-700 dark:text-ocean-300'} text-xs italic mt-1.5">“{map.note}”</div>{/if}
							</div>
						</a>
					{/each}
				</div>
			</div>
		{/if}

		<!-- achievements -->
		{#if page.achievements.length}
			<div class="flex flex-col gap-3" in:fly={{ y: 20, duration: 400, delay: 240 }}>
				<h2 class="text-ocean-900 dark:text-ocean-100 text-lg">achievements (questionable)</h2>
				<ul class="flex flex-col gap-1.5 text-sm">
					{#each page.achievements as a}
						<li class="flex gap-3">
							{#if a.date}<span class="text-ocean-500 shrink-0">{a.date}</span>{/if}
							<span class="text-ocean-800 dark:text-ocean-300">🏆 {a.text}</span>
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		<!-- more -->
		<div class="flex flex-wrap gap-2 text-sm" in:fly={{ y: 20, duration: 400, delay: 280 }}>
			<a href="/skins" class="px-3 py-1.5 rounded border border-ocean-300 dark:border-ocean-700 text-ocean-800 dark:text-ocean-200 hover:bg-ocean-200 dark:hover:bg-ocean-800">my skins</a>
			<a href="/events" class="px-3 py-1.5 rounded border border-ocean-300 dark:border-ocean-700 text-ocean-800 dark:text-ocean-200 hover:bg-ocean-200 dark:hover:bg-ocean-800">LANs & events</a>
		</div>
	</div>
</section>

<style>
	/* A soft shadow keeps white text readable on bright parts of a map cover. */
	.banner-text {
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9), 0 0 12px rgba(0, 0, 0, 0.6);
	}
</style>
