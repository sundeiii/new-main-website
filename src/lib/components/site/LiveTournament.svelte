<script lang="ts">
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';
	import type { LiveTournamentSettings, LiveMatch } from '$lib/siteSettings';

	// The tournament happening right now (/admin → live tournament): what stage it's at, the
	// next match with a countdown, the schedule in the visitor's own time, and the stream.
	export let live: LiveTournamentSettings;

	let now = Date.now();
	let mounted = false;
	let watching = false;
	onMount(() => {
		mounted = true;
		now = Date.now();
		const id = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(id);
	});

	const played = (m: LiveMatch) => m.redScore !== null && m.blueScore !== null;
	// A match counts as "on now" from its start until it has a score (or 3 hours pass).
	const onNow = (m: LiveMatch, t: number) => !played(m) && new Date(m.time).getTime() <= t && t - new Date(m.time).getTime() < 3 * 3600e3;
	$: current = live.matches.filter((m) => onNow(m, now));
	$: upcoming = live.matches.filter((m) => !played(m) && new Date(m.time).getTime() > now);
	$: results = live.matches.filter(played).reverse();
	$: next = upcoming[0];

	function countdown(iso: string, t: number) {
		const s = Math.max(0, Math.floor((new Date(iso).getTime() - t) / 1000));
		const d = Math.floor(s / 86400);
		const h = Math.floor((s % 86400) / 3600);
		const m = Math.floor((s % 3600) / 60);
		if (d) return `${d}d ${h}h`;
		if (h) return `${h}h ${m}m`;
		return `${m}m ${String(s % 60).padStart(2, '0')}s`;
	}
	// The server renders UTC; the browser switches to the visitor's own time zone.
	// "today 21:00", "tomorrow 18:30", "sat 6 dec 18:00".
	function when(iso: string, local: boolean) {
		const tz = local ? {} : { timeZone: 'UTC' };
		const d = new Date(iso);
		const day = (x: Date) => x.toLocaleDateString('en-CA', tz);
		const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', ...tz });
		const today = new Date();
		const label =
			day(d) === day(today) ? 'today' : day(d) === day(new Date(today.getTime() + 864e5)) ? 'tomorrow' : day(d) === day(new Date(today.getTime() - 864e5)) ? 'yesterday' : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', ...tz }).toLowerCase();
		return `${label} ${time}${local ? '' : ' utc'}`;
	}
	$: zone = mounted ? Intl.DateTimeFormat().resolvedOptions().timeZone.split('/').pop()?.replace(/_/g, ' ') : 'UTC';
	$: embed = mounted && live.twitch ? `https://player.twitch.tv/?channel=${live.twitch}&parent=${location.hostname}&muted=true` : '';
	$: columns = [
		{ title: 'schedule', list: [...current, ...upcoming], empty: 'nothing else scheduled' },
		{ title: 'results', list: results, empty: 'no results yet' }
	];

	const muted = 'text-ocean-600 dark:text-ocean-400';
	const strong = 'text-ocean-900 dark:text-ocean-100';
	const label = 'text-[11px] uppercase tracking-widest text-ocean-500';
</script>

<div id="live" class="scroll-mt-24 flex flex-col gap-4">
	<!-- header card -->
	<div class="relative overflow-hidden rounded-2xl border border-ocean-300/50 dark:border-ocean-700/50 {live.banner ? '' : 'glass'}">
		{#if live.banner}
			<img src={live.banner} alt="" class="absolute inset-0 w-full h-full object-cover" />
			<div class="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/30" />
		{/if}
		<div class="relative p-5 sm:p-6 flex flex-col gap-3 {live.banner ? 'text-white banner-text' : ''}">
			<div class="flex items-center gap-2 text-[11px] uppercase tracking-widest">
				<span class="relative flex w-2 h-2"><span class="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-60" /><span class="relative w-2 h-2 rounded-full bg-red-500" /></span>
				<span class={live.banner ? 'text-white/80' : 'text-ocean-500'}>happening now{live.role ? ` · i'm ${live.role}` : ''}</span>
			</div>
			<h2 class="text-2xl sm:text-3xl {live.banner ? '' : strong}">
				{#if live.link}<a href={live.link} target="_blank" rel="noopener noreferrer" class="hover:underline">{live.name} ↗</a>{:else}{live.name}{/if}
			</h2>
			{#if live.stage}<p class="text-sm {live.banner ? 'text-white/85' : 'text-ocean-700 dark:text-ocean-300'}">{live.stage}</p>{/if}
			{#if live.note}<p class="text-sm {live.banner ? 'text-white/75' : muted} max-w-2xl">{live.note}</p>{/if}

			{#if next || current.length}
				<div class="flex flex-wrap items-baseline gap-x-3 gap-y-1 mt-1 text-sm">
					{#if current.length}
						<span><span class="text-red-400">● on now:</span> {current.map((m) => `${m.red} vs ${m.blue}`).join(', ')}</span>
					{:else if next}
						<span class={live.banner ? 'text-white/70' : muted}>next up</span>
						<span>{next.red} vs {next.blue}</span>
						<span class="tabular-nums {live.banner ? 'text-white/70' : muted}">{mounted ? `in ${countdown(next.time, now)}` : when(next.time, false)}</span>
					{/if}
				</div>
			{/if}

			{#if live.twitch}
				<div class="flex flex-wrap gap-2 mt-1">
					<button on:click={() => (watching = !watching)} class="px-4 py-1.5 rounded-full text-sm accent-bg">{watching ? 'hide stream' : '▶ watch here'}</button>
					<a
						href="https://twitch.tv/{live.twitch}"
						target="_blank"
						rel="noopener noreferrer"
						class="px-4 py-1.5 rounded-full text-sm border {live.banner ? 'border-white/40 hover:bg-white/10' : 'border-ocean-300/70 dark:border-ocean-700/70 hover:border-ocean-500'} transition-colors"
						>twitch.tv/{live.twitch} ↗</a
					>
				</div>
			{/if}
		</div>
	</div>

	{#if watching && embed}
		<div class="rounded-2xl overflow-hidden border border-ocean-300/50 dark:border-ocean-700/50 aspect-video bg-black" transition:slide={{ duration: 300 }}>
			<iframe src={embed} title="{live.name} stream" class="w-full h-full" allowfullscreen />
		</div>
	{/if}

	<!-- schedule and results -->
	{#if live.matches.length}
		<div class="grid gap-4 md:grid-cols-2">
			{#each columns as col}
				<div class="glass rounded-2xl border border-ocean-300/50 dark:border-ocean-700/50 p-4 flex flex-col gap-1">
					<div class="flex items-baseline justify-between mb-1">
						<span class={label}>{col.title}</span>
						{#if col.title === 'schedule'}<span class="text-[10px] {muted}">times in {zone}</span>{/if}
					</div>
					{#each col.list as m}
						{@const done = played(m)}
						<div class="flex items-center gap-3 py-2 border-t border-ocean-300/40 dark:border-ocean-700/40 first:border-t-0 text-sm">
							<span class="w-32 shrink-0 text-xs tabular-nums {muted}">{when(m.time, mounted)}</span>
							<span class="min-w-0 flex-1 truncate {strong}">
								<span class={done && (m.redScore ?? 0) > (m.blueScore ?? 0) ? 'font-bold' : ''}>{m.red}</span>
								{#if done}<span class="tabular-nums mx-1.5 {muted}">{m.redScore} – {m.blueScore}</span>{:else}<span class="mx-1.5 {muted}">vs</span>{/if}
								<span class={done && (m.blueScore ?? 0) > (m.redScore ?? 0) ? 'font-bold' : ''}>{m.blue}</span>
							</span>
							{#if onNow(m, now)}<span class="text-[10px] text-red-500 shrink-0">● live</span>{/if}
							{#if m.stage}<span class="hidden sm:block text-[10px] {muted} shrink-0">{m.stage}</span>{/if}
							{#if m.mp}<a href={m.mp} target="_blank" rel="noopener noreferrer" class="text-xs {muted} hover:underline shrink-0" title="multiplayer lobby">mp ↗</a>{/if}
						</div>
					{:else}
						<p class="text-sm {muted} py-2">{col.empty}</p>
					{/each}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.banner-text {
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9), 0 0 12px rgba(0, 0, 0, 0.6);
	}
</style>
