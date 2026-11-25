<script context="module" lang="ts">
	// The osu! page (edited in /admin → pages → osu!), as a dashboard with a profile column.
	// Live stats are fetched in the browser.
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
	import { cubicOut } from 'svelte/easing';
	import { marked } from 'marked';
	import PostBody from '$lib/components/PostBody.svelte';
	import { countryName, flagUrl } from '$lib/flags';
	import { settingDefaults, type OsuSettings } from '$lib/siteSettings';
	import type { TournamentYear } from '$lib/tournamentSeed';
	import { app } from '$lib/components/site/app';
	import { stickyAside } from '$lib/components/site/sticky';

	export let osu: OsuSettings | null;
	export let tournaments: TournamentYear[];

	const rise = (i: number) => (app.hydrated ? { y: 12, duration: 500, delay: 60 + i * 70, easing: cubicOut } : { duration: 0 });

	$: page = osu ?? settingDefaults.osu;
	$: introHtml = page.intro ? (marked.parse(page.intro, { async: false, gfm: true, breaks: true }) as string) : '';
	$: staffed = tournaments.flatMap((y) => y.events.map((e) => ({ ...e, year: y.year })));
	$: latestTournaments = [...staffed].reverse().slice(0, 4);

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
	let statsLoaded = false;

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

	onMount(async () => {
		if (!page.showStats || !page.username) return;
		try {
			const res = await fetch(`/api/osu-user?u=${encodeURIComponent(page.username)}`);
			if (res.ok) stats = await res.json();
		} catch {}
		statsLoaded = true;
		if (!stats?.id) return;
		for (const type of ['best', 'recent'] as const) {
			fetch(`/api/osu-scores?id=${stats.id}&type=${type}`)
				.then((r) => (r.ok ? r.json() : []))
				.then((list: Score[]) => (scores = { ...scores, [type]: list }))
				.catch(() => (scores = { ...scores, [type]: [] }));
		}
	});

	// ── rank graph: last 90 days from osu!, oldest first; better (lower) ranks are drawn higher ──
	const W = 800, H = 180, PAD = 8;
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
		hover = Math.max(0, Math.min(history.length - 1, Math.round(((x - PAD) / (W - PAD * 2)) * (history.length - 1))));
	}

	// osu! calls SS "X"; the H versions are the silver (hidden/flashlight) grades.
	const gradeLabel = (r: string) => (r.startsWith('X') ? 'SS' : r.replace('H', ''));
	const gradeColor = (r: string) =>
		r.endsWith('H') ? 'text-slate-200' : r.startsWith('X') || r === 'S' ? 'text-yellow-300' : r === 'A' ? 'text-green-400' : r === 'B' ? 'text-sky-400' : r === 'C' ? 'text-purple-400' : 'text-red-400';
	function ago(iso: string) {
		const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
		if (m < 60) return `${Math.max(m, 1)}m ago`;
		if (m < 1440) return `${Math.round(m / 60)}h ago`;
		const d = Math.round(m / 1440);
		return d < 30 ? `${d}d ago` : new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
	}
	const fmt = (n: number | null | undefined) => (n == null ? '–' : Math.round(n).toLocaleString('en-US'));

	const label = 'text-[11px] uppercase tracking-widest text-ocean-500';
	const muted = 'text-ocean-600 dark:text-ocean-400';
	const strong = 'text-ocean-900 dark:text-ocean-100';
	const chip = 'px-3 py-1 rounded-full text-xs border border-ocean-300/70 dark:border-ocean-700/70 text-ocean-600 dark:text-ocean-400 hover:text-ocean-900 dark:hover:text-ocean-100 hover:border-ocean-500 transition-colors';
</script>

<svelte:head>
	<title>osu!</title>
	<meta property="og:title" content="osu!" />
	<meta name="description" content="tournaments, maps and osu! things" />
	<meta property="og:description" content="tournaments, maps and osu! things" />
</svelte:head>

<section class="px-8 sm:px-12 lg:px-24 pt-8 sm:pt-12 pb-4 font-cascadia grid gap-14 lg:grid-cols-[19rem_1fr] xl:gap-20">
	<!-- ── profile (sticky on wide screens) ── -->
	<aside use:stickyAside class="flex flex-col gap-6 lg:self-start" in:fly={rise(0)}>
		<div>
			<h1 class="text-3xl {strong}">osu!</h1>
			<p class="text-sm {muted} mt-2">circles, tournaments and everything around them</p>
		</div>

		{#if page.showStats}
			<a href="https://osu.ppy.sh/users/{stats?.id ?? page.username}" target="_blank" rel="noopener noreferrer" class="group relative block overflow-hidden rounded-2xl border border-ocean-300/50 dark:border-ocean-700/50">
				{#if stats?.cover_url}
					<img src={stats.cover_url} alt="" class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
					<div class="absolute inset-0 bg-gradient-to-b from-black/30 via-black/60 to-black/90" />
				{:else}
					<div class="absolute inset-0 glass" />
				{/if}
				<div class="relative p-5 flex flex-col gap-4 {stats?.cover_url ? 'text-white' : strong}">
					<div class="flex items-center gap-3">
						{#if stats?.avatar_url}
							<img src={stats.avatar_url} alt="" class="w-16 h-16 rounded-2xl ring-2 ring-white/20" />
						{:else}
							<div class="w-16 h-16 rounded-2xl bg-ocean-300/40 dark:bg-ocean-700/40 {statsLoaded ? '' : 'animate-pulse'}" />
						{/if}
						<div class="min-w-0">
							<div class="flex items-center gap-1.5 flex-wrap text-lg">
								{#if stats?.team?.short_name}<span class="opacity-70" title={stats.team.name}>[{stats.team.short_name}]</span>{/if}
								<span class="truncate">{stats?.username ?? page.username}</span>
							</div>
							<div class="flex items-center gap-1.5 mt-1">
								{#if stats?.country_code}<img src={flagUrl(stats.country_code)} alt={countryName(stats.country_code)} title={countryName(stats.country_code)} class="h-4" />{/if}
								{#if stats?.team?.flag_url}<img src={stats.team.flag_url} alt={stats.team.name} title={stats.team.name} class="h-4 rounded-sm" />{/if}
							</div>
						</div>
					</div>
					<div class="grid grid-cols-3 gap-2 text-center">
						{#each [{ v: `#${fmt(stats?.global_rank)}`, l: 'global' }, { v: `#${fmt(stats?.country_rank)}`, l: 'country' }, { v: fmt(stats?.pp), l: 'pp' }] as s}
							<div class="rounded-xl py-2 {stats?.cover_url ? 'bg-black/30' : 'bg-ocean-200/50 dark:bg-ocean-800/50'}">
								<div class="text-sm tabular-nums">{s.v}</div>
								<div class="text-[10px] opacity-70">{s.l}</div>
							</div>
						{/each}
					</div>
				</div>
			</a>
		{/if}

		{#if introHtml}
			<div class="text-sm"><PostBody html={introHtml} /></div>
		{/if}

		<div class="flex flex-wrap gap-1.5">
			<a href="/tournaments" class={chip}>tournaments · {staffed.length}</a>
			<a href="/skins" class={chip}>my skins</a>
			<a href="/events" class={chip}>LANs & events</a>
		</div>
	</aside>

	<!-- ── dashboard ── -->
	<div class="flex flex-col gap-14 min-w-0">
		<!-- rank graph -->
		{#if page.showStats}
			<div class="flex flex-col gap-3" in:fly={rise(1)}>
				<div class="flex items-end justify-between gap-4 flex-wrap">
					<div class="flex flex-col gap-1">
						<span class={label}>global rank · last {history.length ? history[0].daysAgo + 1 : 90} days</span>
						<span class="text-2xl tabular-nums {strong}">
							{#if hovered}#{fmt(hovered.rank)}{:else}#{fmt(stats?.global_rank)}{/if}
						</span>
					</div>
					<span class="text-sm {muted}">
						{#if hovered}
							{hovered.daysAgo === 0 ? 'today' : hovered.daysAgo === 1 ? 'yesterday' : `${hovered.daysAgo} days ago`}
						{:else if gained}
							<span class={gained > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>{gained > 0 ? '▲' : '▼'} {fmt(Math.abs(gained))}</span> places
						{/if}
					</span>
				</div>
				{#if history.length > 1}
					<svg
						viewBox="0 0 {W} {H}"
						preserveAspectRatio="none"
						class="w-full h-44 rounded-2xl glass border border-ocean-300/50 dark:border-ocean-700/50 touch-none"
						role="img"
						aria-label="global rank over the last {history.length} days, from #{fmt(history[0].rank)} to #{fmt(history[history.length - 1].rank)}"
						on:pointermove={onGraphMove}
						on:pointerdown={onGraphMove}
						on:pointerleave={() => (hover = null)}
					>
						<defs>
							<linearGradient id="rank-fill" x1="0" x2="0" y1="0" y2="1">
								<stop offset="0%" stop-color="var(--accent)" stop-opacity="0.35" />
								<stop offset="100%" stop-color="var(--accent)" stop-opacity="0" />
							</linearGradient>
						</defs>
						<path d={area} fill="url(#rank-fill)" />
						<path d={line} fill="none" stroke="var(--accent)" stroke-width="2.5" vector-effect="non-scaling-stroke" stroke-linejoin="round" />
						{#if hovered && hover != null}
							<line x1={xOf(hover)} x2={xOf(hover)} y1="0" y2={H} stroke="currentColor" class="text-ocean-500" opacity="0.5" vector-effect="non-scaling-stroke" />
							<circle cx={xOf(hover)} cy={yOf(hovered.rank)} r="5" fill="var(--accent)" vector-effect="non-scaling-stroke" />
						{/if}
					</svg>
					<div class="flex justify-between text-xs {muted} -mt-1">
						<span>#{fmt(history[0].rank)}</span>
						<span>#{fmt(history[history.length - 1].rank)}</span>
					</div>
				{:else}
					<div class="h-44 rounded-2xl glass border border-ocean-300/50 dark:border-ocean-700/50 {statsLoaded ? '' : 'animate-pulse'}" />
				{/if}
			</div>

			<!-- plays -->
			<div class="flex flex-col gap-3" in:fly={rise(2)}>
				<div class="flex items-center justify-between gap-4">
					<span class={label}>plays</span>
					<div class="flex gap-1 p-1 rounded-full glass border border-ocean-300/50 dark:border-ocean-700/50 text-xs">
						{#each [{ key: 'best', label: 'top' }, { key: 'recent', label: 'recent' }] as t}
							<button
								on:click={() => (tab = t.key === 'recent' ? 'recent' : 'best')}
								class="px-3 py-1 rounded-full transition-colors {tab === t.key ? 'accent-soft ' + strong : muted + ' hover:text-ocean-900 dark:hover:text-ocean-100'}"
								aria-pressed={tab === t.key}>{t.label}</button
							>
						{/each}
					</div>
				</div>
				{#if !shown}
					<div class="flex flex-col gap-2">
						{#each [0, 1, 2] as _}<div class="h-16 rounded-2xl glass border border-ocean-300/50 dark:border-ocean-700/50 animate-pulse" />{/each}
					</div>
				{:else if !shown.length}
					<p class="text-sm {muted}">{tab === 'recent' ? 'nothing passed in the last 24 hours' : 'no plays found'}</p>
				{:else}
					<ol class="flex flex-col">
						{#each shown as s, i (s.id)}
							<li>
								<a href={s.url} target="_blank" rel="noopener noreferrer" class="group grid grid-cols-[2rem_3.5rem_1fr_auto] items-center gap-3 py-3 border-t border-ocean-300/50 dark:border-ocean-700/50">
									<span class="text-xs tabular-nums text-ocean-400 dark:text-ocean-600">{String(i + 1).padStart(2, '0')}</span>
									<span class="relative w-14 h-10 rounded-lg overflow-hidden bg-ocean-300/40 dark:bg-ocean-700/40">
										{#if s.cover}<img src={s.cover} alt="" loading="lazy" class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />{/if}
										<span class="absolute inset-0 grid place-items-center bg-black/40 font-bold text-sm {gradeColor(s.rank)}">{gradeLabel(s.rank)}</span>
									</span>
									<span class="min-w-0">
										<span class="block truncate text-sm {strong} group-hover:underline">{s.artist} – {s.title}</span>
										<span class="block truncate text-xs {muted}">
											[{s.version}]{s.stars ? ` · ${s.stars.toFixed(2)}★` : ''} · {(s.accuracy * 100).toFixed(2)}% · {s.combo}x{s.mods.length ? ` · +${s.mods.join('')}` : ''} · {ago(s.date)}
										</span>
									</span>
									<span class="text-sm tabular-nums {strong}">{s.pp == null ? '–' : `${Math.round(s.pp)}pp`}</span>
								</a>
							</li>
						{/each}
					</ol>
				{/if}
			</div>
		{/if}

		<!-- maps i love, as a cover grid -->
		{#if page.maps.length}
			<div class="flex flex-col gap-3" in:fly={rise(3)}>
				<span class={label}>maps i love</span>
				<div class="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
					{#each page.maps as map}
						<a href={map.url} target="_blank" rel="noopener noreferrer" class="group relative overflow-hidden rounded-2xl border border-ocean-300/50 dark:border-ocean-700/50 min-h-[8.5rem] flex">
							{#if map.cover}
								<img src={map.cover} alt="" loading="lazy" class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
								<div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/10" />
							{:else}
								<div class="absolute inset-0 glass" />
							{/if}
							<div class="relative mt-auto p-4 flex flex-col gap-1 {map.cover ? 'banner-text text-white' : strong}">
								<span class="text-sm leading-snug">{map.title}</span>
								{#if map.mapper || map.stars}
									<span class="text-xs opacity-75">{[map.mapper ? `mapped by ${map.mapper}` : '', map.stars ? `${map.stars}★` : ''].filter(Boolean).join(' · ')}</span>
								{/if}
								{#if map.note}<span class="text-xs italic opacity-90 mt-1">“{map.note}”</span>{/if}
							</div>
						</a>
					{/each}
				</div>
			</div>
		{/if}

		<!-- latest tournaments, as a short timeline -->
		{#if latestTournaments.length}
			<div class="flex flex-col gap-4" in:fly={rise(4)}>
				<div class="flex items-baseline justify-between">
					<span class={label}>latest tournaments</span>
					<a href="/tournaments" class="text-xs {muted} hover:underline">all {staffed.length} →</a>
				</div>
				<ol class="relative border-l border-ocean-300/70 dark:border-ocean-700/70 ml-1.5 flex flex-col gap-5">
					{#each latestTournaments as t}
						<li class="relative pl-7">
							<span class="absolute -left-[6px] top-1.5 w-[11px] h-[11px] rounded-full accent-bg" />
							<a href={t.link} target="_blank" rel="noopener noreferrer" class="{strong} hover:underline">{t.name}</a>
							<div class="text-xs {muted} mt-0.5">{t.role} · {t.year}</div>
						</li>
					{/each}
				</ol>
			</div>
		{/if}

		<!-- achievements -->
		{#if page.achievements.length}
			<div class="flex flex-col gap-3" in:fly={rise(5)}>
				<span class={label}>achievements (questionable)</span>
				<ul class="flex flex-col">
					{#each page.achievements as a}
						<li class="flex gap-4 py-3 border-t border-ocean-300/50 dark:border-ocean-700/50 text-sm">
							<span class="text-ocean-400 dark:text-ocean-600 shrink-0 w-24 tabular-nums text-xs pt-0.5">{a.date || '—'}</span>
							<span class="text-ocean-800 dark:text-ocean-200">{a.text}</span>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>
</section>

<style>
	/* A soft shadow keeps white text readable on bright parts of a cover. */
	.banner-text {
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9), 0 0 12px rgba(0, 0, 0, 0.6);
	}
</style>
