<script context="module" lang="ts">
	// One artist from my play log (last.fm history since 2021 + Spotify): plays, plays per month,
	// top songs with osu! maps. Linked from the lists on /music. Hidden artists 404.
	import type { Load } from '@sveltejs/kit';

	export const load: Load = async ({ params, fetch }) => {
		const res = await fetch(`/api/plays/artist?name=${encodeURIComponent(params.name)}`).catch(() => null);
		if (res?.status === 404 || res?.status === 400) return { status: 404, error: new Error('never played this artist') };
		if (!res?.ok) return { status: 500, error: new Error("couldn't load this artist") };
		return { props: { artist: await res.json() } };
	};
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { app } from '$lib/components/site/app';
	import OsuPill from '$lib/components/OsuPill.svelte';
	import { lookupOsuMaps } from '$lib/osuMaps';
	import { collect } from '$lib/components/cozy/collect';

	type Track = { name: string; plays: number; first: string; last: string; image: string | null; url: string };
	export let artist: {
		name: string;
		photo: string | null;
		image: string | null;
		spotify: string | null;
		rank: number | null;
		plays: number;
		minutes: number;
		tracks: number;
		first: { at: string; track: string | null; url: string };
		last: string;
		topTracks: Track[];
		months: { month: string; plays: number }[];
	};

	// Japanese names in romaji, like on /music.
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
	$: r = (text: string) => romaji[text] || text;

	onMount(() => {
		collect('artist');
		[artist.name, ...artist.topTracks.map((t) => t.name), artist.first.track ?? ''].forEach(romanize);
		lookupOsuMaps(artist.topTracks.map((t) => ({ artist: artist.name, title: t.name })));
	});

	// Every month from the first play to now, including the quiet ones.
	$: months = (() => {
		const counts = new Map(artist.months.map((m) => [m.month, m.plays]));
		const list: { month: string; plays: number }[] = [];
		const end = new Date().toISOString().slice(0, 7);
		let [y, m] = (artist.months[0]?.month ?? end).split('-').map(Number);
		for (let key = ''; key !== end && list.length < 240; m === 12 ? ((m = 1), y++) : m++) {
			key = `${y}-${String(m).padStart(2, '0')}`;
			list.push({ month: key, plays: counts.get(key) ?? 0 });
		}
		return list;
	})();
	$: monthMax = Math.max(1, ...months.map((m) => m.plays));
	$: peak = months.reduce((best, m) => (m.plays > best.plays ? m : best), months[0]);
	let hover: number | null = null;

	const num = (n: number) => n.toLocaleString('en-US');
	const date = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
	const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
	const monthName = (key: string) => new Date(key + '-01T12:00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }).toLowerCase();
	function ago(iso: string) {
		const mins = Math.round((Date.now() - Date.parse(iso)) / 60000);
		if (mins < 60) return `${Math.max(1, mins)} min ago`;
		if (mins < 1440) return `${Math.round(mins / 60)} h ago`;
		const days = Math.round(mins / 1440);
		if (days < 60) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
		return shortDate(iso);
	}

	$: tiles = [
		{ label: 'plays', value: num(artist.plays), sub: artist.rank ? `#${artist.rank} of all my artists` : 'all time' },
		{ label: 'listened', value: artist.minutes >= 120 ? `${num(Math.round(artist.minutes / 60))} h` : `${artist.minutes} min`, sub: 'roughly' },
		{ label: 'songs', value: num(artist.tracks), sub: 'different ones' },
		{ label: 'last played', value: ago(artist.last), sub: shortDate(artist.last) }
	];

	const rise = (i: number) => (app.hydrated ? { y: 12, duration: 500, delay: 60 + i * 70, easing: cubicOut } : { duration: 0 });
	const label = 'text-[11px] uppercase tracking-widest text-ocean-500';
	const muted = 'text-ocean-600 dark:text-ocean-400';
	const strong = 'text-ocean-900 dark:text-ocean-100';
	const card = 'glass rounded-2xl border border-ocean-300/50 dark:border-ocean-700/50';
</script>

<svelte:head>
	<title>{artist.name} · music</title>
	<meta property="og:title" content="{artist.name} · music" />
	<meta name="description" content="{num(artist.plays)} plays of {artist.name} since {shortDate(artist.first.at)}" />
	<meta property="og:description" content="{num(artist.plays)} plays of {artist.name} since {shortDate(artist.first.at)}" />
</svelte:head>

<section class="px-8 sm:px-12 lg:px-24 pt-8 sm:pt-12 pb-4 font-cascadia flex flex-col gap-8 max-w-5xl">
	<a href="/music" class="text-sm {muted} hover:underline w-fit" in:fly={rise(0)}>← music</a>

	<header class="flex flex-col sm:flex-row gap-6 sm:items-center" in:fly={rise(0)}>
		{#if artist.photo || artist.image}
			<img src={artist.photo || artist.image} alt="" class="w-28 h-28 sm:w-36 sm:h-36 object-cover shadow-xl shrink-0 {artist.photo ? 'rounded-full' : 'rounded-2xl'}" />
		{/if}
		<div class="flex flex-col gap-2 min-w-0">
			<span class={label}>artist{artist.rank ? ` · #${artist.rank}` : ''}</span>
			<h1 class="text-3xl sm:text-4xl {strong} break-words">{r(artist.name)}</h1>
			{#if r(artist.name) !== artist.name}<span class="text-sm {muted}">{artist.name}</span>{/if}
			<p class="text-sm {muted}">
				first heard {date(artist.first.at)}{#if artist.first.track}{' '}with {#if artist.first.url}<a href={artist.first.url} target="_blank" rel="noopener noreferrer" class="{strong} hover:underline">{r(artist.first.track)}</a>{:else}<span class={strong}>{r(artist.first.track)}</span>{/if}{/if}
			</p>
			{#if artist.spotify}
				<a href={artist.spotify} target="_blank" rel="noopener noreferrer" class="mt-1 w-fit px-3 py-1 rounded-full text-xs accent-bg transition-transform duration-200 hover:-translate-y-0.5">open on spotify</a>
			{/if}
		</div>
	</header>

	<div class="grid grid-cols-2 sm:grid-cols-4 gap-3" in:fly={rise(1)}>
		{#each tiles as tile}
			<div class="{card} p-4">
				<div class={label}>{tile.label}</div>
				<div class="text-2xl tabular-nums {strong} mt-1">{tile.value}</div>
				<div class="text-xs {muted}">{tile.sub}</div>
			</div>
		{/each}
	</div>

	{#if months.length > 1}
		<div class="{card} p-4" in:fly={rise(2)}>
			<div class="flex items-baseline justify-between gap-4 mb-3">
				<span class={label}>plays per month</span>
				<span class="text-xs {muted} tabular-nums">
					{#if hover !== null}{monthName(months[hover].month)}: <span class={strong}>{num(months[hover].plays)}</span> plays{:else if peak}most in <span class={strong}>{monthName(peak.month)}</span> ({num(peak.plays)}){/if}
				</span>
			</div>
			<div class="flex items-end h-28 border-b border-ocean-300/70 dark:border-ocean-700/70" role="img" aria-label="plays per month" on:mouseleave={() => (hover = null)}>
				{#each months as m, i}
					<div class="flex-1 h-full flex items-end px-px" on:mouseenter={() => (hover = i)} title="{monthName(m.month)}: {m.plays} plays">
						<div class="w-full rounded-t accent-bg transition-opacity {hover !== null && hover !== i ? 'opacity-40' : ''}" style="height: {m.plays ? Math.max(3, (m.plays / monthMax) * 100) : 0}%" />
					</div>
				{/each}
			</div>
			<div class="flex justify-between text-[11px] {muted} mt-1.5 tabular-nums">
				<span>{monthName(months[0].month)}</span><span>now</span>
			</div>
		</div>
	{/if}

	<div class="flex flex-col gap-2" in:fly={rise(3)}>
		<span class={label}>most played songs</span>
		{#each artist.topTracks as t, i}
			<div class="relative rounded-lg overflow-hidden text-sm">
				<span class="absolute inset-y-0 left-0 accent-soft" style="width: {(t.plays / (artist.topTracks[0]?.plays || 1)) * 100}%" />
				<span class="relative flex items-center gap-3 px-3 py-1.5">
					<span class="text-ocean-500 w-5 text-right shrink-0 tabular-nums">{i + 1}</span>
					{#if t.image}<img src={t.image} alt="" loading="lazy" class="w-8 h-8 rounded shrink-0" />{:else}<span class="w-8 h-8 rounded shrink-0 glass" />{/if}
					<span class="min-w-0 flex-1 flex items-center gap-2">
						<a href={t.url || undefined} target="_blank" rel="noopener noreferrer" class="truncate {strong} hover:underline">{r(t.name)}</a>
						<OsuPill artist={artist.name} title={t.name} />
					</span>
					<span class="hidden sm:block text-[11px] {muted} shrink-0 tabular-nums" title="first played {shortDate(t.first)}">since {shortDate(t.first)}</span>
					<span class="text-xs {muted} shrink-0 tabular-nums w-14 text-right">{num(t.plays)}</span>
				</span>
			</div>
		{/each}
		{#if artist.tracks > artist.topTracks.length}
			<a href="/music?q={encodeURIComponent(artist.name)}" class="text-xs text-ocean-500 hover:underline w-fit mt-1">search their other songs →</a>
		{/if}
	</div>
</section>
