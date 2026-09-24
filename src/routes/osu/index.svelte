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
		id: number;
		username: string;
		avatar_url: string;
		cover_url: string;
		country_code: string;
		global_rank: number | null;
		country_rank: number | null;
		pp: number | null;
		team: { id: number; name: string; short_name: string | null; flag_url: string | null } | null;
		rank_history: number[];
	}
	let stats: Stats | null = null;

	// Rank graph: last 90 days from osu!, oldest first. Better (lower) ranks are drawn higher.
	const W = 600, H = 120, PAD = 6;
	let hover: number | null = null;
	$: history = (stats?.rank_history ?? []).map((rank, i, all) => ({ rank, daysAgo: all.length - 1 - i })).filter((d) => d.rank > 0);
	$: best = Math.min(...history.map((d) => d.rank));
	$: worst = Math.max(...history.map((d) => d.rank));
	$: xOf = (i: number) => PAD + (i / Math.max(history.length - 1, 1)) * (W - PAD * 2);
	$: yOf = (rank: number) => PAD + ((rank - best) / Math.max(worst - best, 1)) * (H - PAD * 2);
	$: line = history.map((d, i) => `${i ? 'L' : 'M'}${xOf(i).toFixed(1)},${yOf(d.rank).toFixed(1)}`).join('');
	$: area = history.length ? `${line}L${xOf(history.length - 1)},${H}L${xOf(0)},${H}Z` : '';
	$: gained = history.length > 1 ? history[0].rank - history[history.length - 1].rank : 0;
	$: hovered = hover == null ? null : history[hover];
	function onGraphMove(e: PointerEvent) {
		const box = (e.currentTarget as SVGElement).getBoundingClientRect();
		const x = ((e.clientX - box.left) / box.width) * W;
		hover = Math.round(((x - PAD) / (W - PAD * 2)) * (history.length - 1));
		hover = Math.max(0, Math.min(history.length - 1, hover));
	}

	onMount(async () => {
		if (!page.showStats || !page.username) return;
		try {
			const res = await fetch(`/api/osu-user?u=${encodeURIComponent(page.username)}`);
			if (res.ok) stats = await res.json();
		} catch {}
		if (!stats?.id) return;
		// Top plays show first; recent ones load in the background for the other tab.
		for (const type of ['best', 'recent'] as const) {
			fetch(`/api/osu-scores?id=${stats.id}&type=${type}`)
				.then((r) => (r.ok ? r.json() : []))
				.then((list: Score[]) => (scores = { ...scores, [type]: list }))
				.catch(() => (scores = { ...scores, [type]: [] }));
		}
	});

	interface Score {
		id: number;
		url: string;
		title: string;
		artist: string;
		version: string;
		stars: number | null;
		cover: string | null;
		rank: string;
		pp: number | null;
		accuracy: number;
		combo: number;
		mods: string[];
		date: string;
	}
	let scores: { best?: Score[]; recent?: Score[] } = {};
	let tab: 'best' | 'recent' = 'best';
	$: shown = scores[tab];

	// osu! calls SS "X"; the H versions are the silver (hidden/flashlight) grades.
	const gradeLabel = (r: string) => (r.startsWith('X') ? 'SS' : r.replace('H', ''));
	const gradeColor = (r: string) =>
		r.endsWith('H') ? 'text-slate-200' : r.startsWith('X') || r === 'S' ? 'text-yellow-300' : r === 'A' ? 'text-green-400' : r === 'B' ? 'text-sky-400' : r === 'C' ? 'text-purple-400' : 'text-red-400';
	const details = (s: Score) =>
		[`[${s.version}]`, s.stars ? `${s.stars.toFixed(2)}★` : '', `${(s.accuracy * 100).toFixed(2)}%`, `${s.combo}x`, s.mods.length ? `+${s.mods.join('')}` : '', ago(s.date)]
			.filter(Boolean)
			.join(' · ');
	function ago(iso: string) {
		const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
		if (m < 60) return `${Math.max(m, 1)}m ago`;
		if (m < 1440) return `${Math.round(m / 60)}h ago`;
		const d = Math.round(m / 1440);
		return d < 30 ? `${d}d ago` : new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
	}

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

		<!-- rank graph -->
		{#if page.showStats && history.length > 1}
			<div class="flex flex-col gap-2" in:fly={{ y: 20, duration: 400, delay: 90 }}>
				<div class="flex items-baseline justify-between gap-4 flex-wrap">
					<h2 class="text-ocean-900 dark:text-ocean-100 text-lg">
						rank <span class="text-ocean-500 text-sm">· last {history[0].daysAgo + 1} days</span>
					</h2>
					<span class="text-sm text-ocean-700 dark:text-ocean-400">
						{#if hovered}
							#{fmt(hovered.rank)} · {hovered.daysAgo === 0 ? 'today' : hovered.daysAgo === 1 ? 'yesterday' : `${hovered.daysAgo} days ago`}
						{:else if gained}
							<span class={gained > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>{gained > 0 ? '▲' : '▼'} {fmt(Math.abs(gained))}</span> places
						{/if}
					</span>
				</div>
				<svg
					viewBox="0 0 {W} {H}"
					preserveAspectRatio="none"
					class="w-full h-28 rounded border border-ocean-300 dark:border-ocean-700 text-ocean-500 touch-none"
					role="img"
					aria-label="global rank over the last {history.length} days, from #{fmt(history[0].rank)} to #{fmt(history[history.length - 1].rank)}"
					on:pointermove={onGraphMove}
					on:pointerdown={onGraphMove}
					on:pointerleave={() => (hover = null)}
				>
					<path d={area} fill="currentColor" opacity="0.15" />
					<path d={line} fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" />
					{#if hovered && hover != null}
						<line x1={xOf(hover)} x2={xOf(hover)} y1="0" y2={H} stroke="currentColor" opacity="0.4" vector-effect="non-scaling-stroke" />
					{/if}
				</svg>
				<div class="flex justify-between text-xs text-ocean-500">
					<span>#{fmt(history[0].rank)}</span>
					<span>#{fmt(history[history.length - 1].rank)}</span>
				</div>
			</div>
		{/if}

		<!-- plays -->
		{#if page.showStats && stats?.id}
			<div class="flex flex-col gap-3" in:fly={{ y: 20, duration: 400, delay: 100 }}>
				<div class="flex items-center gap-4">
					<h2 class="text-ocean-900 dark:text-ocean-100 text-lg">plays</h2>
					<div class="flex gap-1 text-sm">
						{#each [{ key: 'best', label: 'top' }, { key: 'recent', label: 'recent' }] as t}
							<button
								on:click={() => (tab = t.key === 'recent' ? 'recent' : 'best')}
								class="px-2.5 py-0.5 rounded border transition-colors {tab === t.key
									? 'border-ocean-500 bg-ocean-200 dark:bg-ocean-800 text-ocean-900 dark:text-ocean-100'
									: 'border-ocean-300 dark:border-ocean-700 text-ocean-600 dark:text-ocean-400 hover:border-ocean-500'}">{t.label}</button
							>
						{/each}
					</div>
				</div>
				{#if !shown}
					<p class="text-sm text-ocean-500">loading…</p>
				{:else if !shown.length}
					<p class="text-sm text-ocean-500">{tab === 'recent' ? 'nothing passed in the last 24 hours' : 'no plays found'}</p>
				{:else}
					<div class="flex flex-col gap-1.5">
						{#each shown as s (s.id)}
							<a
								href={s.url}
								target="_blank"
								rel="noopener noreferrer"
								class="group relative overflow-hidden rounded border border-ocean-300 dark:border-ocean-700 hover:border-ocean-500 transition-colors"
							>
								{#if s.cover}
									<img src={s.cover} alt="" loading="lazy" class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
								{/if}
								<div class="absolute inset-0 {s.cover ? 'bg-gradient-to-r from-black/90 via-black/80 to-black/50' : 'bg-ocean-800'}" />
								<div class="relative banner-text flex items-center gap-3 px-3 py-2 text-white">
									<span class="w-7 text-center font-bold {gradeColor(s.rank)}">{gradeLabel(s.rank)}</span>
									<div class="flex-1 min-w-0">
										<div class="text-sm truncate">{s.artist} – {s.title}</div>
										<div class="text-xs text-white/70 truncate">
											{details(s)}
										</div>
									</div>
									<span class="text-sm font-medium shrink-0">{s.pp == null ? '–' : `${Math.round(s.pp)}pp`}</span>
								</div>
							</a>
						{/each}
					</div>
				{/if}
			</div>
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
