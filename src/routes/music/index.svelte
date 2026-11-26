<script context="module" lang="ts">
	// Music (song of the month and notes are edited in /admin → pages → music): now playing in the
	// side column, and top tracks / history / stats as a chart, a timeline and bars.
	import type { Load } from '@sveltejs/kit';

	// Design, song of the month and notes are edited in /admin → pages → music.
	export const load: Load = async ({ fetch }) => {
		const res = await fetch('/api/site/music').catch(() => null);
		return { props: { music: res?.ok ? await res.json() : null } };
	};
</script>

<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { browser } from '$app/env';
	import { marked } from 'marked';
	import PostBody from '$lib/components/PostBody.svelte';
	import { settingDefaults, type MusicSettings } from '$lib/siteSettings';
	import type { SpotifyTimeRange, TopTracksResponse } from '$lib/types';
	import { nowPlaying } from '$lib/components/site/presence';
	import { app } from '$lib/components/site/app';
	import { stickyAside } from '$lib/components/site/sticky';

	export let music: MusicSettings | null;
	$: settings = music ?? settingDefaults.music;
	$: notesHtml = settings.notes ? (marked.parse(settings.notes, { async: false, gfm: true, breaks: true }) as string) : '';
	$: sotm = settings.songOfTheMonth;

	const rise = (i: number) => (app.hydrated ? { y: 12, duration: 500, delay: 60 + i * 70, easing: cubicOut } : { duration: 0 });

	// ── now playing (shared with the nav), with a progress bar that keeps moving between polls ──
	let progress = 0;
	let tick: ReturnType<typeof setInterval>;
	$: np = $nowPlaying;
	$: if (np?.track) progress = np.progressMs ?? 0;
	$: started = np?.fetchedAt ? Math.min(np.fetchedAt, Date.now()) : Date.now();
	onMount(() => {
		tick = setInterval(() => {
			if (np?.track && np.isPlayingNow && !np.isPaused) progress = Math.min((np.progressMs ?? 0) + (Date.now() - started), np.track.duration_ms);
		}, 250);
	});
	onDestroy(() => clearInterval(tick));
	const mmss = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms / 1000) % 60)).padStart(2, '0')}`;

	// ── tabs ──
	const tabs = [
		{ key: 'top', label: 'top tracks' },
		{ key: 'history', label: 'history' },
		{ key: 'stats', label: 'stats' }
	] as const;
	let activeTab: 'top' | 'history' | 'stats' = 'top';

	// ── romaji for Japanese names (shared) ──
	let romaji: Record<string, string> = {};
	const JP = /[　-〿぀-ゟ゠-ヿ＀-ﾟ一-龯㐀-䶿]/;
	function romanize(text: string) {
		if (!text || text in romaji || !JP.test(text)) return;
		romaji[text] = text;
		fetch('/api/romanize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) })
			.then((r) => (r.ok ? r.json() : null))
			.then((d) => d?.romanized && (romaji = { ...romaji, [text]: d.romanized }))
			.catch(() => {});
	}
	// Reactive ($:), so the lists redraw once the romaji comes back.
	$: r = (text: string) => romaji[text] || text;
	$: joinArtists = (artists: { name: string }[] | undefined) => (artists ?? []).map((a) => r(a.name)).join(', ');

	// ── top tracks ──
	const ranges: { name: string; value: SpotifyTimeRange }[] = [
		{ name: 'month', value: 'short_term' },
		{ name: '6 months', value: 'medium_term' },
		{ name: 'all time', value: 'long_term' }
	];
	let range: SpotifyTimeRange = 'short_term';
	let tracks: Partial<Record<SpotifyTimeRange, TopTracksResponse>> = {};
	let topError: Partial<Record<SpotifyTimeRange, string>> = {};
	function loadTop(rg: SpotifyTimeRange) {
		if (tracks[rg] || topError[rg] === 'loading') return;
		topError = { ...topError, [rg]: 'loading' };
		fetch('/api/top-tracks?time_range=' + rg)
			.then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
			.then((list: TopTracksResponse) => {
				tracks = { ...tracks, [rg]: list };
				topError = { ...topError, [rg]: '' };
				list.forEach((t) => (romanize(t.name), t.artists.forEach((a) => romanize(a.name))));
			})
			.catch(() => (topError = { ...topError, [rg]: "couldn't load top tracks" }));
	}
	$: if (browser && activeTab === 'top') loadTop(range);
	$: top = tracks[range];

	// ── history ──
	let history: any[] | null = null;
	let historyError = '';
	function loadHistory() {
		if (history || historyError === 'loading') return;
		historyError = 'loading';
		fetch('/api/listening-history')
			.then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
			.then((items: any[]) => {
				history = items;
				historyError = '';
				items.forEach((i) => (romanize(i.track?.name), (i.track?.artists ?? []).forEach((a: any) => romanize(a.name))));
			})
			.catch(() => (historyError = "couldn't load listening history"));
	}
	$: if (browser && activeTab === 'history') loadHistory();
	$: days = Object.entries(
		(history ?? []).reduce((groups: Record<string, any[]>, item) => {
			const key = new Date(item.played_at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
			(groups[key] ??= []).push(item);
			return groups;
		}, {})
	);

	// ── last.fm stats ──
	const periods = [
		{ value: '7day', label: 'week' },
		{ value: '1month', label: 'month' },
		{ value: '12month', label: 'year' },
		{ value: 'overall', label: 'all time' }
	];
	let period = '7day';
	let stats: Record<string, any> = {};
	let statsError = '';
	function loadStats(p: string) {
		if (stats[p]) return;
		statsError = '';
		fetch(`/api/lastfm-stats?period=${p}`)
			.then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
			.then((d) => {
				stats = { ...stats, [p]: d };
				d.topArtists.forEach((a: any) => romanize(a.name));
				d.topTracks.forEach((t: any) => (romanize(t.name), romanize(t.artist)));
			})
			.catch(() => (statsError = "neither last.fm nor spotify is responding right now, so the stats can't load"));
	}
	$: if (browser && activeTab === 'stats') loadStats(period);
	$: s = stats[period];
	// Spotify (used when last.fm is down) has no play counts, so rows may come without plays.
	type StatRow = { name: string; sub: string; plays?: number; url: string };
	$: statLists = s
		? [
				{ title: 'top artists', rows: s.topArtists.map((a: any): StatRow => ({ name: a.name, sub: '', plays: a.plays, url: a.url })) },
				{ title: 'top tracks', rows: s.topTracks.map((t: any): StatRow => ({ name: t.name, sub: t.artist, plays: t.plays, url: t.url })) }
		  ]
		: [];
	const num = (n: number) => n.toLocaleString('en-US');

	const label = 'text-[11px] uppercase tracking-widest text-ocean-500';
	const muted = 'text-ocean-600 dark:text-ocean-400';
	const strong = 'text-ocean-900 dark:text-ocean-100';
	const segment = 'flex flex-wrap gap-1 p-1 rounded-full glass border border-ocean-300/50 dark:border-ocean-700/50 text-xs w-fit';
	const segBtn = (on: boolean) => `px-3 py-1 rounded-full transition-colors ${on ? 'accent-soft ' + strong : muted + ' hover:text-ocean-900 dark:hover:text-ocean-100'}`;
	const skeleton = 'rounded-2xl glass border border-ocean-300/50 dark:border-ocean-700/50 animate-pulse';
</script>

<svelte:head>
	<title>music</title>
	<meta property="og:title" content="music" />
	<meta name="description" content="tracks i've listened to the most" />
	<meta property="og:description" content="tracks i've listened to the most" />
</svelte:head>

<section class="px-8 sm:px-12 lg:px-24 pt-8 sm:pt-12 pb-4 font-cascadia grid gap-14 lg:grid-cols-[19rem_1fr] xl:gap-20">
	<!-- ── now playing, song of the month, notes ── -->
	<aside use:stickyAside class="flex flex-col gap-6 lg:self-start" in:fly={rise(0)}>
		<div>
			<h1 class="text-3xl {strong}">music</h1>
			<p class="text-sm {muted} mt-2">what i've been listening to</p>
		</div>

		<!-- The spot is always there, so nothing below jumps when Spotify answers. -->
		<a href={np?.track?.external_urls?.spotify} target="_blank" rel="noopener noreferrer" class="group relative overflow-hidden rounded-2xl border border-ocean-300/50 dark:border-ocean-700/50 block min-h-[7.5rem]">
			{#if np?.track}
				{@const cover = np.track.album?.images?.[0]?.url}
				{#if cover}<img src={cover} alt="" class="absolute inset-0 w-full h-full object-cover blur-2xl scale-125 opacity-60" />{/if}
				<div class="absolute inset-0 bg-black/45" />
				<div class="relative p-4 flex gap-4 items-center text-white" in:fade={{ duration: 250 }}>
					{#if cover}<img src={cover} alt="" class="w-20 h-20 rounded-xl shadow-xl shrink-0 transition-transform duration-500 group-hover:rotate-3" />{/if}
					<div class="min-w-0 flex-1">
						<span class="block text-[10px] uppercase tracking-widest opacity-70">
							{np.isPlayingNow ? (np.isPaused ? 'paused' : 'now playing') : 'last played'}
						</span>
						<span class="block truncate">{np.title ?? np.track.name}</span>
						<span class="block truncate text-sm opacity-75">{np.artistLine ?? ''}</span>
						{#if np.isPlayingNow}
							<div class="flex items-center gap-2 mt-2 text-[10px] tabular-nums opacity-75">
								<span>{mmss(progress)}</span>
								<span class="flex-1 h-1 rounded-full bg-white/25 overflow-hidden"><span class="block h-full rounded-full bg-white transition-all duration-200" style="width: {(progress / np.track.duration_ms) * 100}%" /></span>
								<span>{mmss(np.track.duration_ms)}</span>
							</div>
						{/if}
					</div>
				</div>
			{:else}
				<div class="absolute inset-0 glass animate-pulse" />
			{/if}
		</a>

		{#if sotm}
			<a href={sotm.url || undefined} target="_blank" rel="noopener noreferrer" class="group glass rounded-2xl border border-ocean-300/50 dark:border-ocean-700/50 p-3 flex gap-3 items-center">
				{#if sotm.image}<img src={sotm.image} alt="" class="w-14 h-14 rounded-lg shadow transition-transform duration-500 group-hover:-rotate-3" />{/if}
				<span class="min-w-0">
					<span class="block {label}">song of the month</span>
					<span class="block truncate text-sm {strong}">{sotm.title}</span>
					{#if sotm.artist}<span class="block truncate text-xs {muted}">{sotm.artist}</span>{/if}
					{#if sotm.note}<span class="block text-xs italic {muted} mt-0.5">“{sotm.note}”</span>{/if}
				</span>
			</a>
		{/if}

		{#if notesHtml}<div class="text-sm"><PostBody html={notesHtml} /></div>{/if}
	</aside>

	<!-- ── charts ── -->
	<div class="flex flex-col gap-6 min-w-0" in:fly={rise(1)}>
		<div class={segment} role="tablist">
			{#each tabs as t}
				<button role="tab" aria-selected={activeTab === t.key} on:click={() => (activeTab = t.key)} class={segBtn(activeTab === t.key)}>{t.label}</button>
			{/each}
		</div>

		{#if activeTab === 'top'}
			<div class="flex flex-col gap-4" in:fade={{ duration: 200 }}>
				<div class={segment}>
					{#each ranges as rg}<button on:click={() => (range = rg.value)} class={segBtn(range === rg.value)}>{rg.name}</button>{/each}
				</div>
				{#if top}
					{@const [first, ...others] = top}
					{#key range}
						<div class="flex flex-col gap-4" in:fade={{ duration: 250 }}>
							{#if first}
								<!-- #1 gets the big spot -->
								<a href={first.external_urls.spotify} target="_blank" rel="noopener noreferrer" class="group relative overflow-hidden rounded-2xl border border-ocean-300/50 dark:border-ocean-700/50 flex items-center gap-5 p-5 text-white">
									<img src={first.album.images[0]?.url} alt="" class="absolute inset-0 w-full h-full object-cover blur-2xl scale-125 opacity-70" />
									<div class="absolute inset-0 bg-black/45" />
									<img src={first.album.images[1]?.url || first.album.images[0]?.url} alt="" class="relative w-28 h-28 rounded-xl shadow-2xl transition-transform duration-500 group-hover:scale-105" />
									<span class="relative min-w-0">
										<span class="block text-5xl tabular-nums opacity-90">#1</span>
										<span class="block text-lg truncate group-hover:underline">{r(first.name)}</span>
										<span class="block text-sm opacity-75 truncate">{joinArtists(first.artists)}</span>
									</span>
								</a>
							{/if}
							<ol class="grid gap-x-6 sm:grid-cols-2">
								{#each others as track, i}
									<li>
										<a href={track.external_urls.spotify} target="_blank" rel="noopener noreferrer" class="group grid grid-cols-[2rem_3rem_1fr] items-center gap-3 py-2.5 border-t border-ocean-300/50 dark:border-ocean-700/50">
											<span class="text-sm tabular-nums text-ocean-400 dark:text-ocean-600 text-right">{i + 2}</span>
											<img src={track.album.images[2]?.url || track.album.images[0]?.url} alt="" loading="lazy" class="w-12 h-12 rounded-lg transition-transform duration-300 group-hover:scale-105" />
											<span class="min-w-0">
												<span class="block truncate text-sm {strong} group-hover:underline">{r(track.name)}</span>
												<span class="block truncate text-xs {muted}">{joinArtists(track.artists)}</span>
											</span>
										</a>
									</li>
								{/each}
							</ol>
						</div>
					{/key}
				{:else if topError[range] && topError[range] !== 'loading'}
					<p class="text-sm text-red-500">{topError[range]}. <button class="underline" on:click={() => ((topError = { ...topError, [range]: '' }), loadTop(range))}>try again</button></p>
				{:else}
					<div class="h-40 {skeleton}" />
					<div class="grid gap-3 sm:grid-cols-2">{#each Array(6) as _}<div class="h-14 {skeleton}" />{/each}</div>
				{/if}
			</div>
		{:else if activeTab === 'history'}
			<div class="flex flex-col gap-8" in:fade={{ duration: 200 }}>
				{#if history}
					<p class="text-xs {muted}">the last 50 things i listened to</p>
					{#each days as [day, items]}
						<div class="flex flex-col gap-3">
							<span class={label}>{day} · {items.length}</span>
							<ol class="relative border-l border-ocean-300/70 dark:border-ocean-700/70 ml-1.5 flex flex-col">
								{#each items as item}
									<li class="relative pl-7">
										<span class="absolute -left-[5px] top-1/2 -translate-y-1/2 w-[9px] h-[9px] rounded-full bg-ocean-400 dark:bg-ocean-600" />
										<a href={item.track?.external_urls?.spotify || '#'} target="_blank" rel="noopener noreferrer" class="group flex items-center gap-3 py-2 rounded-xl px-2 -mx-2 hover:bg-ocean-200/30 dark:hover:bg-ocean-800/30 transition-colors">
											{#if item.track?.album?.images?.[2]?.url || item.track?.album?.images?.[0]?.url}
												<img src={item.track.album.images[2]?.url || item.track.album.images[0]?.url} alt="" loading="lazy" class="w-10 h-10 rounded-md shrink-0" />
											{/if}
											<span class="min-w-0 flex-1">
												<span class="block truncate text-sm {strong} group-hover:underline">{r(item.track?.name ?? '')}</span>
												<span class="block truncate text-xs {muted}">{joinArtists(item.track?.artists)}</span>
											</span>
											{#if item.source === 'lastfm'}<span class="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-600 dark:text-red-400 shrink-0" title="from last.fm">last.fm</span>{/if}
											<span class="text-xs {muted} tabular-nums shrink-0">{new Date(item.played_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
										</a>
									</li>
								{/each}
							</ol>
						</div>
					{/each}
				{:else if historyError && historyError !== 'loading'}
					<p class="text-sm text-red-500">{historyError}</p>
				{:else}
					{#each Array(6) as _}<div class="h-12 {skeleton}" />{/each}
				{/if}
			</div>
		{:else}
			<div class="flex flex-col gap-6" in:fade={{ duration: 200 }}>
				<div class={segment}>
					{#each periods as p}<button on:click={() => (period = p.value)} class={segBtn(period === p.value)}>{p.label}</button>{/each}
				</div>
				{#if statsError}
					<p class="text-sm text-red-500">{statsError}. <button class="underline" on:click={() => loadStats(period)}>try again</button></p>
				{:else if !s}
					<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">{#each Array(4) as _}<div class="h-20 {skeleton}" />{/each}</div>
				{:else}
					{#if s.staleSince}<p class="text-xs text-ocean-600 dark:text-ocean-400">last.fm isn't responding right now, so these are the stats from {new Date(s.staleSince).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}.</p>{/if}
					{#if s.source !== 'spotify'}
					<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
						{#each [
							{ label: 'scrobbles', value: num(s.total), sub: `since ${new Date(s.since).getFullYear()}` },
							{ label: 'last 24 hours', value: num(s.last24h), sub: 'songs' },
							{ label: 'last 7 days', value: num(s.last7d), sub: `~${Math.round(s.last7d / 7)} a day` },
							{ label: 'per day', value: num(Math.round(s.total / Math.max(1, (Date.now() - s.since) / 864e5))), sub: 'on average' }
						] as tile}
							<div class="glass rounded-2xl border border-ocean-300/50 dark:border-ocean-700/50 p-4">
								<div class={label}>{tile.label}</div>
								<div class="text-2xl tabular-nums {strong} mt-1">{tile.value}</div>
								<div class="text-xs {muted}">{tile.sub}</div>
							</div>
						{/each}
					</div>
					{/if}
					<div class="grid md:grid-cols-2 gap-8">
						{#each statLists as list}
							<div class="flex flex-col gap-2">
								<span class={label}>{list.title}</span>
								{#each list.rows as row, i}
									<a href={row.url} target="_blank" rel="noopener noreferrer" class="group relative block rounded-lg overflow-hidden text-sm">
										{#if row.plays !== undefined}<span class="absolute inset-y-0 left-0 accent-soft transition-all duration-500" style="width: {(row.plays / (list.rows[0]?.plays || 1)) * 100}%" />{/if}
										<span class="relative flex items-baseline gap-2 px-3 py-1.5">
											<span class="text-ocean-500 w-5 text-right shrink-0 tabular-nums">{i + 1}</span>
											<span class="truncate {strong}">{r(row.name)}</span>
											{#if row.sub}<span class="truncate text-xs {muted}">{r(row.sub)}</span>{/if}
											{#if row.plays !== undefined}<span class="ml-auto text-xs {muted} shrink-0 tabular-nums">{num(row.plays)}</span>{/if}
										</span>
									</a>
								{:else}
									<p class="text-sm {muted}">nothing yet</p>
								{/each}
							</div>
						{/each}
					</div>
					{#if s.source === 'spotify'}
						<p class="text-xs text-ocean-500">from spotify, over {s.span} · last.fm isn't available right now, so there are no play counts</p>
					{:else}
						<p class="text-xs text-ocean-500">from <a href={s.url} target="_blank" rel="noopener noreferrer" class="underline">last.fm</a> · updates every ~10 minutes</p>
					{/if}
				{/if}
			</div>
		{/if}
	</div>
</section>
