<script lang="ts">
	// Numbers about the site and me: visits (the hit counter), github, discord, osu! (titanic) and spotify.
	// Everything loads in the browser at the same time, so one slow api doesn't hold up the rest.
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { lanyard } from '$lib/lanyard';
	import { app } from '$lib/components/site/app';
	import { BUILD_TIMESTAMP } from '$lib/buildtime';
	import commits from '$lib/commits.json';
	import type { HitStats } from '$lib/hitStats';

	const joinArtists = (artists: { name: string }[] | undefined) => (artists ?? []).map((a) => a.name).join(', ');
	const fmt = (n: number | null | undefined, suffix = '') => (typeof n === 'number' && isFinite(n) ? Math.round(n).toLocaleString() + suffix : '—');
	const pct = (n: number | null | undefined) => (typeof n === 'number' ? `${(n * 100).toFixed(2)}%` : '—');

	let hits: HitStats | null = null;
	let github: { repos: number; stars: number; forks: number; followers: number } | null = null;
	let contributions: { days: { date: string; count: number; level: number }[]; total: number } | null = null;
	let titanicUser: any = null;
	let topPlays: any[] = [];
	let lastPlayed: any = null;
	let loaded = { hits: false, github: false, contributions: false, titanic: false, plays: false, spotify: false };

	const get = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null);

	onMount(() => {
		get('/api/hits').then((d) => ((hits = d), (loaded.hits = true)));
		get('/api/github').then((d) => ((github = d?.error ? null : d), (loaded.github = true)));
		get('/api/github-contributions').then((d) => ((contributions = d?.days ? d : null), (loaded.contributions = true)));
		get('/api/titanic-user').then((d) => ((titanicUser = d), (loaded.titanic = true)));
		get('/api/titanic-osu').then((d) => {
			topPlays = (d?.scores ?? []).slice(0, 5);
			loaded.plays = true;
			romanizePlays(topPlays);
		});
		get('/api/recent-tracks').then((d) => ((lastPlayed = d), (loaded.spotify = true)));
	});

	// Japanese titles get romaji next to them, like on /music.
	let romaji: Record<string, string> = {};
	const hasJapanese = (s: string) => /[぀-ヿ㐀-䶿一-龯＀-ﾟ]/.test(s);
	function romanize(text: string) {
		if (!text || !hasJapanese(text) || text in romaji) return;
		romaji[text] = text;
		fetch('/api/romanize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) })
			.then((r) => (r.ok ? r.json() : null))
			.then((d) => d?.romanized && (romaji = { ...romaji, [text]: d.romanized }))
			.catch(() => {});
	}
	const rom = (text: string) => romaji[text] || text;
	function romanizePlays(plays: any[]) {
		for (const p of plays) {
			romanize(p.beatmap?.beatmapset?.artist ?? '');
			romanize(p.beatmap?.beatmapset?.title ?? '');
		}
	}
	$: if (lastPlayed?.track) {
		romanize(lastPlayed.track.name ?? '');
		romanize(joinArtists(lastPlayed.track.artists));
	}

	// Visits over the last 30 days; hovering a bar shows that day.
	let hoverDay: { day: string; views: number } | null = null;
	$: days = hits?.days ?? [];
	$: maxViews = Math.max(1, ...days.map((d) => d.views));
	$: monthViews = days.reduce((n, d) => n + d.views, 0);
	const dayLabel = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

	$: contribWeeks = (() => {
		const w: { date: string; count: number; level: number }[][] = [];
		for (let i = 0; i < (contributions?.days.length ?? 0); i += 7) w.push(contributions!.days.slice(i, i + 7));
		return w;
	})();
	const contribColor = ['bg-ocean-200 dark:bg-ocean-800', 'bg-ocean-green/30', 'bg-ocean-green/50', 'bg-ocean-green/70', 'bg-ocean-green'];

	$: d = $lanyard;
	$: spotify = d?.spotify;
	$: activePlatform = d
		? [d.active_on_discord_desktop && 'desktop', d.active_on_discord_web && 'web', d.active_on_discord_mobile && 'mobile'].filter(Boolean).join(', ') || 'nowhere'
		: '—';

	$: osu = titanicUser?.stats?.[0];
	$: ranks = titanicUser?.rankings?.['0'];

	const deployedAgo = (() => {
		const h = Math.floor((Date.now() - BUILD_TIMESTAMP) / 3600000);
		return h < 1 ? 'just now' : h < 48 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
	})();

	const rise = (i: number) => (app.hydrated ? { y: 12, duration: 500, delay: 60 + i * 70, easing: cubicOut } : { duration: 0 });
	const label = 'text-[11px] uppercase tracking-widest text-ocean-500';
	const muted = 'text-ocean-600 dark:text-ocean-400';
	const strong = 'text-ocean-900 dark:text-ocean-100';
	const card = 'glass rounded-2xl border border-ocean-300/50 dark:border-ocean-700/50 p-4';
</script>

<svelte:head>
	<title>stats</title>
	<meta property="og:title" content="stats" />
	<meta name="description" content="numbers about this site and me" />
	<meta property="og:description" content="numbers about this site and me" />
</svelte:head>

<section class="px-8 sm:px-12 lg:px-24 pt-8 sm:pt-12 pb-4 font-cascadia flex flex-col gap-14 max-w-6xl">
	<header in:fly={rise(0)}>
		<h1 class="text-3xl {strong}">stats</h1>
		<p class="text-sm {muted} mt-2">numbers about this site and me, live</p>
	</header>

	<!-- this site -->
	<div class="flex flex-col gap-3" in:fly={rise(1)}>
		<span class={label}>this site</span>
		<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
			{#each [{ k: 'visits', v: loaded.hits ? fmt(hits?.total) : '…' }, { k: 'today', v: loaded.hits ? fmt(hits?.today) : '…' }, { k: 'commits', v: fmt(commits.length) }, { k: 'last deploy', v: deployedAgo }] as t}
				<div class={card}>
					<span class="block {label}">{t.k}</span>
					<span class="block text-2xl {strong} tabular-nums mt-1">{t.v}</span>
				</div>
			{/each}
		</div>

		<div class="grid gap-3 lg:grid-cols-[2fr_1fr]">
			<div class={card}>
				<div class="flex items-baseline justify-between gap-4 mb-3">
					<span class={label}>visits, last 30 days</span>
					<span class="text-xs {muted} tabular-nums">
						{#if hoverDay}{dayLabel(hoverDay.day)}: <span class={strong}>{hoverDay.views.toLocaleString()}</span> visits{:else}{monthViews.toLocaleString()} in total{/if}
					</span>
				</div>
				{#if days.length}
					<!-- one column per day; the whole column is the hover target, the bar sits on the baseline -->
					<div class="flex items-end h-32 border-b border-ocean-300/70 dark:border-ocean-700/70" role="img" aria-label="visits per day for the last 30 days" on:mouseleave={() => (hoverDay = null)}>
						{#each days as day}
							<div class="flex-1 h-full flex items-end px-px" on:mouseenter={() => (hoverDay = day)} title="{dayLabel(day.day)}: {day.views} visits">
								<div
									class="w-full rounded-t accent-bg transition-opacity {hoverDay && hoverDay !== day ? 'opacity-40' : ''}"
									style="height: {day.views ? Math.max(4, (day.views / maxViews) * 100) : 0}%"
								/>
							</div>
						{/each}
					</div>
					<div class="flex justify-between text-[11px] {muted} mt-1.5 tabular-nums">
						<span>{dayLabel(days[0].day)}</span><span>today</span>
					</div>
				{:else}
					<p class="text-sm {muted}">{loaded.hits ? 'no visits counted yet' : 'loading…'}</p>
				{/if}
			</div>

			<div class={card}>
				<span class="block {label} mb-3">most viewed</span>
				{#if hits?.top.length}
					<ol class="flex flex-col gap-2 text-sm">
						{#each hits.top as t}
							<li class="flex justify-between gap-4">
								<a href={t.path} class="truncate {strong} hover:underline">{t.path}</a>
								<span class="{muted} tabular-nums shrink-0">{t.views.toLocaleString()}</span>
							</li>
						{/each}
					</ol>
				{:else}
					<p class="text-sm {muted}">{loaded.hits ? 'nothing yet' : 'loading…'}</p>
				{/if}
			</div>
		</div>
	</div>

	<!-- github -->
	<div class="flex flex-col gap-3" in:fly={rise(2)}>
		<span class={label}>github</span>
		<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
			{#each [{ k: 'public repos', v: github?.repos }, { k: 'stars', v: github?.stars }, { k: 'forks', v: github?.forks }, { k: 'followers', v: github?.followers }] as t}
				<div class={card}>
					<span class="block {label}">{t.k}</span>
					<span class="block text-2xl {strong} tabular-nums mt-1">{loaded.github ? fmt(t.v) : '…'}</span>
				</div>
			{/each}
		</div>
		<div class={card}>
			{#if contributions?.days.length}
				<p class="text-sm {muted} mb-3"><span class={strong}>{contributions.total.toLocaleString()}</span> contributions in the last year</p>
				<div class="overflow-x-auto">
					<div class="flex gap-[3px]" style="min-width: 720px">
						{#each contribWeeks as week}
							<div class="flex flex-col gap-[3px]">
								{#each week as day}
									<div class="w-[11px] h-[11px] rounded-sm {contribColor[day.level] ?? contribColor[0]}" title="{day.date}: {day.count} contribution{day.count !== 1 ? 's' : ''}" />
								{/each}
							</div>
						{/each}
					</div>
				</div>
				<div class="flex items-center gap-1.5 mt-3 justify-end text-xs {muted}">
					<span>less</span>
					{#each contribColor as c}<div class="w-[11px] h-[11px] rounded-sm {c}" />{/each}
					<span>more</span>
				</div>
			{:else}
				<p class="text-sm {muted}">{loaded.contributions ? 'no contribution data right now' : 'loading…'}</p>
			{/if}
		</div>
	</div>

	<!-- discord + spotify -->
	<div class="grid gap-3 lg:grid-cols-2" in:fly={rise(3)}>
		<div class="flex flex-col gap-3">
			<span class={label}>discord</span>
			<div class="grid grid-cols-2 gap-3">
				<div class={card}>
					<span class="block {label}">status</span>
					<span class="block text-lg {strong} mt-1 lowercase">{d?.discord_status ?? '—'}</span>
				</div>
				<div class={card}>
					<span class="block {label}">active on</span>
					<span class="block text-lg {strong} mt-1 lowercase">{activePlatform}</span>
				</div>
			</div>
		</div>
		<div class="flex flex-col gap-3">
			<span class={label}>{spotify ? 'listening now' : 'last played'}</span>
			<div class="{card} flex items-center gap-4 min-w-0">
				{#if spotify}
					{#if spotify.album_art_url}<img src={spotify.album_art_url} alt="" class="w-14 h-14 rounded-lg shrink-0" />{/if}
					<span class="min-w-0">
						<a href="https://open.spotify.com/track/{spotify.track_id}" target="_blank" rel="noopener noreferrer" class="block truncate {strong} hover:underline">{rom(spotify.song)}</a>
						<span class="block truncate text-sm {muted}">{spotify.artist}</span>
					</span>
				{:else if lastPlayed?.track}
					{#if lastPlayed.track.album?.images?.[0]?.url}<img src={lastPlayed.track.album.images[0].url} alt="" class="w-14 h-14 rounded-lg shrink-0" />{/if}
					<span class="min-w-0">
						<a href={lastPlayed.track.external_urls?.spotify} target="_blank" rel="noopener noreferrer" class="block truncate {strong} hover:underline">{rom(lastPlayed.track.name)}</a>
						<span class="block truncate text-sm {muted}">{rom(joinArtists(lastPlayed.track.artists))}</span>
						<span class="block text-xs {muted}">{new Date(lastPlayed.played_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</span>
					</span>
				{:else}
					<span class="text-sm {muted}">{loaded.spotify ? 'nothing played lately' : 'loading…'}</span>
				{/if}
			</div>
			<a href="/music" class="text-xs {muted} hover:underline">top tracks on /music →</a>
		</div>
	</div>

	<!-- osu! on titanic -->
	<div class="flex flex-col gap-3" in:fly={rise(4)}>
		<span class={label}>osu! · titanic{titanicUser?.name ? ` · ${titanicUser.name}` : ''}</span>
		{#if osu}
			<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
				{#each [{ k: 'global rank', v: fmt(ranks?.performance?.global ?? osu.rank, ''), pre: '#' }, { k: 'country rank', v: fmt(ranks?.performance?.country), pre: '#' }, { k: 'performance', v: fmt(osu.pp, 'pp') }, { k: 'accuracy', v: pct(osu.acc) }, { k: 'playcount', v: fmt(osu.playcount) }, { k: 'max combo', v: fmt(osu.max_combo, 'x') }] as t}
					<div class={card}>
						<span class="block {label}">{t.k}</span>
						<span class="block text-xl {strong} tabular-nums mt-1 truncate">{t.v !== '—' && t.pre ? t.pre : ''}{t.v}</span>
					</div>
				{/each}
			</div>
			<dl class="grid sm:grid-cols-2 gap-x-10 text-sm">
				{#each [{ k: 'ppv1', v: fmt(osu.ppv1, 'pp'), r: ranks?.ppv1?.global }, { k: 'ranked score', v: fmt(osu.rscore), r: ranks?.rscore?.global }, { k: 'total score', v: fmt(osu.tscore), r: ranks?.tscore?.global }, { k: 'country', v: titanicUser.country ?? '—' }] as row}
					<div class="flex items-baseline justify-between gap-4 py-2.5 border-t border-ocean-300/50 dark:border-ocean-700/50">
						<dt class="{label} shrink-0">{row.k}</dt>
						<dd class="{strong} tabular-nums text-right">{row.v}{#if row.r}<span class={muted}> · #{row.r.toLocaleString()}</span>{/if}</dd>
					</div>
				{/each}
			</dl>
		{:else}
			<p class="text-sm {muted}">{loaded.titanic ? "couldn't reach titanic right now" : 'loading…'}</p>
		{/if}

		{#if topPlays.length}
			<span class="{label} mt-4">top plays</span>
			<ol class="flex flex-col gap-2">
				{#each topPlays as play, i}
					{@const set = play.beatmap?.beatmapset}
					<li class="{card} flex items-center gap-4">
						<span class="{muted} tabular-nums w-5 shrink-0">{i + 1}</span>
						<span class="min-w-0 flex-1">
							<span class="block truncate {strong}">{rom(set?.artist ?? '')} - {rom(set?.title ?? '')}</span>
							<span class="block truncate text-xs {muted}">[{play.beatmap?.version}]</span>
						</span>
						<span class="shrink-0 text-right text-sm tabular-nums">
							<span class="block {strong}">{fmt(play.pp, 'pp')}</span>
							<span class="block text-xs {muted}">{pct(play.acc)} · {play.max_combo}x · {play.grade}</span>
						</span>
					</li>
				{/each}
			</ol>
		{:else if !loaded.plays}
			<p class="text-sm {muted}">loading top plays…</p>
		{/if}
	</div>
</section>
