<script context="module" lang="ts">
	// Tournaments staffed, as a timeline with a stats column.
	import type { Load } from '@sveltejs/kit';

	// The list lives in the database now (managed at /admin); the API falls back to the old
	// hardcoded list until it's been imported.
	export const load: Load = async ({ fetch }) => {
		const [res, live] = await Promise.all([fetch('/api/tournaments'), fetch('/api/site/live').catch(() => null)]);
		return { props: { tournaments: res.ok ? await res.json() : [], live: live?.ok ? await live.json() : null } };
	};
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import type { TournamentYear } from '$lib/tournamentSeed';
	import Tooltip from '$lib/components/Tooltip.svelte';
	import { countryName, flagUrl } from '$lib/flags';
	import { app } from '$lib/components/site/app';
	import { stickyAside } from '$lib/components/site/sticky';
	import LiveTournament from '$lib/components/site/LiveTournament.svelte';
	import type { LiveTournamentSettings } from '$lib/siteSettings';

	export let tournaments: TournamentYear[];
	export let live: LiveTournamentSettings | null = null;

	const rise = (i: number) => (app.hydrated ? { y: 12, duration: 500, delay: 60 + i * 60, easing: cubicOut } : { duration: 0 });

	// One colour per role, so "referee/streamer" reads as two tags at a glance.
	const roleColors: Record<string, string> = {
		referee: '#8FA1B3',
		streamer: '#B48EAD',
		commentator: '#EBCB8B',
		caster: '#EBCB8B',
		playtester: '#A3BE8C',
		host: '#BF616A',
		developer: '#96B5B4',
		mappooler: '#D08770',
		designer: '#D08770'
	};
	const roleColor = (role: string) => roleColors[role] ?? '#A7ADBA';
	const rolesOf = (role: string) => role.split('/').map((r) => r.trim().toLowerCase()).filter(Boolean);

	// Newest first: years in reverse, and within a year the most recently added first.
	$: years = [...tournaments].reverse().map((y) => ({ ...y, events: [...y.events].reverse() }));
	$: allEvents = tournaments.flatMap((t) => t.events);
	$: roleWords = [...new Set(allEvents.flatMap((e) => rolesOf(e.role)))];
	$: roleCounts = roleWords.map((word) => ({ word, count: allEvents.filter((e) => rolesOf(e.role).includes(word)).length })).sort((a, b) => b.count - a.count);
	let roleFilter = '';
	$: shownYears = years
		.map((y) => ({ ...y, events: roleFilter ? y.events.filter((e) => rolesOf(e.role).includes(roleFilter)) : y.events }))
		.filter((y) => y.events.length);

	// Hosts' osu! profiles (cover + country) load in the browser.
	let hostProfiles: Record<number, { cover_url: string | null; country_code: string | null; country_name: string | null }> = {};
	$: hostIds = [...new Set(allEvents.flatMap((e) => (e.hosts ?? []).map((h) => h.id)))];
	$: hostCountries = new Set(hostIds.map((id) => hostProfiles[id]?.country_code).filter(Boolean));
	$: badges = allEvents.filter((e) => e.badge).length;
	$: firstYear = tournaments[0]?.year;

	onMount(() => {
		for (const id of hostIds) {
			fetch(`/api/osu-profile?id=${id}`)
				.then((r) => (r.ok ? r.json() : null))
				.then((p) => p && (hostProfiles = { ...hostProfiles, [id]: p }))
				.catch(() => {});
		}
	});

	const jump = (year: string) => document.getElementById(`y${year}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

	const label = 'text-[11px] uppercase tracking-widest text-ocean-500';
	const muted = 'text-ocean-600 dark:text-ocean-400';
	const strong = 'text-ocean-900 dark:text-ocean-100';
</script>

<svelte:head>
	<title>tournament staffing</title>
	<meta property="og:title" content="tournament staffing" />
	<meta name="description" content="osu! tournament staffing history" />
	<meta property="og:description" content="osu! tournament staffing history" />
</svelte:head>

<section class="px-8 sm:px-12 lg:px-24 pt-8 sm:pt-12 pb-4 font-cascadia grid gap-14 lg:grid-cols-[17rem_1fr] xl:gap-24">
	<!-- ── stats + filters (sticky on wide screens) ── -->
	<aside use:stickyAside class="flex flex-col gap-8 lg:self-start" in:fly={rise(0)}>
		<div>
			<h1 class="text-3xl {strong}">tournaments</h1>
			<p class="text-sm {muted} mt-2">osu! tournaments i've helped staff{firstYear ? `, since ${firstYear}` : ''}.</p>
		</div>

		<!-- Kept short on purpose: a sticky column taller than the screen gets pushed up under the
		     nav at the bottom of the page. -->
		<div class="grid grid-cols-2 gap-2">
			{#each [{ value: allEvents.length, label: 'tournaments' }, { value: hostIds.length, label: 'hosts' }, { value: hostCountries.size || '…', label: 'host countries' }, { value: badges, label: 'badged' }] as s, i}
				<div class="glass rounded-xl border border-ocean-300/50 dark:border-ocean-700/50 px-3 py-2.5">
					<div class="{i === 0 ? 'text-3xl' : 'text-xl'} tabular-nums {strong}">{s.value}</div>
					<div class="text-[11px] {muted}">{s.label}</div>
				</div>
			{/each}
		</div>

		<!-- roles: click one to show only those -->
		<div class="flex flex-col gap-2">
			<div class="flex items-baseline justify-between">
				<span class={label}>roles</span>
				{#if roleFilter}<button on:click={() => (roleFilter = '')} class="text-xs {muted} hover:underline">show all</button>{/if}
			</div>
			<div class="flex flex-wrap gap-1.5">
				{#each roleCounts as r}
					<button
						on:click={() => (roleFilter = roleFilter === r.word ? '' : r.word)}
						class="inline-flex items-center gap-1.5 text-xs leading-none px-2.5 py-1.5 rounded-full border transition-all {roleFilter && roleFilter !== r.word ? 'opacity-40 hover:opacity-80' : ''}"
						style="border-color: {roleColor(r.word)}; background: {roleColor(r.word)}{roleFilter === r.word ? '55' : '1f'};"
						aria-pressed={roleFilter === r.word}
					>
						<span class={strong}>{r.word}</span><span class="tabular-nums {muted}">{r.count}</span>
					</button>
				{/each}
			</div>
		</div>

		<!-- jump to a year -->
		<div class="hidden lg:flex flex-col gap-2">
			<span class={label}>years</span>
			<div class="flex flex-wrap gap-1.5">
				{#each shownYears as y}
					<button on:click={() => jump(y.year)} class="px-3 py-1 rounded-full text-xs border border-ocean-300/70 dark:border-ocean-700/70 {muted} hover:text-ocean-900 dark:hover:text-ocean-100 hover:border-ocean-500 transition-colors">
						{y.year} <span class="opacity-60">· {y.events.length}</span>
					</button>
				{/each}
			</div>
		</div>
	</aside>

	<!-- ── timeline ── -->
	<div class="flex flex-col gap-14 min-w-0">
		{#if live?.show && live.name}
			<div in:fly={rise(1)}><LiveTournament {live} /></div>
		{/if}
		{#each shownYears as { year, events }, yi (year)}
			<div id="y{year}" class="scroll-mt-24 flex flex-col gap-6" in:fly={rise(1 + yi)}>
				<div class="flex items-baseline gap-3">
					<h2 class="text-4xl tabular-nums {strong}">{year}</h2>
					<span class="text-sm {muted}">{events.length} tournament{events.length === 1 ? '' : 's'}{roleFilter ? ` as ${roleFilter}` : ''}</span>
				</div>
				<ol class="relative border-l border-ocean-300/70 dark:border-ocean-700/70 ml-1.5 flex flex-col gap-5">
					{#each events as event (event.id ?? event.name)}
						{@const roles = rolesOf(event.role)}
						<li id={event.id != null ? `t-${event.id}` : undefined} class="relative pl-7 scroll-mt-28">
							<span class="absolute -left-[6px] top-6 w-[11px] h-[11px] rounded-full ring-4 ring-transparent" style="background: {roleColor(roles[0] ?? '')}" />
							<div class="group relative overflow-hidden rounded-2xl border border-ocean-300/50 dark:border-ocean-700/50 {event.banner ? '' : 'glass'}">
								{#if event.banner}
									<img src={event.banner} alt="" loading="lazy" decoding="async" class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
									<!-- Darkest behind the text (left), so light banners stay readable -->
									<div class="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/30" />
								{/if}
								<!-- Not an <a> around everything: the host chips are links too, so the title's link
									 is stretched over the card instead, with the chips above it. -->
								<div class="relative p-5 {event.badge ? 'pr-28' : ''} {event.banner ? 'banner-text text-white' : ''}">
									{#if event.badge}
										<img
											src={event.badge}
											alt="{event.name} badge"
											loading="lazy"
											class="absolute top-4 right-4 w-20 h-16 object-contain object-right-top pointer-events-none drop-shadow transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105"
											on:error={(e) => (e.currentTarget.style.display = 'none')}
										/>
									{/if}
									<h3 class="text-lg {event.banner ? '' : strong}">
										<a href={event.link} target="_blank" rel="noopener noreferrer" class="hover:underline after:absolute after:inset-0">{event.name}</a>
									</h3>
									<div class="flex flex-wrap items-center gap-1.5 mt-2">
										{#each roles as r}
											<span class="text-xs leading-none px-2 py-1 rounded-full border" style="color: {event.banner ? '#fff' : roleColor(r)}; border-color: {roleColor(r)}; background: {roleColor(r)}{event.banner ? '55' : '1f'};">{r}</span>
										{/each}
										{#each [{ icon: '✦', text: event.tier }, { icon: '📍', text: event.region }].filter((t) => t.text) as tag}
											<span class="inline-flex items-center gap-1 text-xs leading-none px-2 py-1 rounded-full border {event.banner ? 'border-white/30 bg-black/30 text-white/90' : 'border-ocean-300 dark:border-ocean-600 text-ocean-700 dark:text-ocean-300'}">
												<span class="text-[10px] opacity-80">{tag.icon}</span>{tag.text}
											</span>
										{/each}
									</div>
									{#if event.memory}
										<p class="text-sm italic mt-3 {event.banner ? 'text-white/85' : 'text-ocean-700 dark:text-ocean-300'}">“{event.memory}”</p>
									{/if}
									{#if event.hosts?.length}
										<div class="flex items-center gap-2 mt-3 flex-wrap">
											<span class="text-xs {event.banner ? 'text-white/60' : muted}">hosted by</span>
											{#each event.hosts as host}
												{@const p = hostProfiles[host.id]}
												<a
													href="https://osu.ppy.sh/users/{host.id}"
													target="_blank"
													rel="noopener noreferrer"
													class="relative z-10 inline-flex items-center gap-1.5 rounded-full pr-2.5 overflow-hidden hover:brightness-110 transition-all"
													style="background: {p?.cover_url ? `url(${p.cover_url}) center/cover` : 'linear-gradient(135deg, #334155, #1e293b)'};"
												>
													<span class="absolute inset-0 bg-black/50" />
													<img src="https://a.ppy.sh/{host.id}" alt="" class="relative w-7 h-7 rounded-full object-cover" />
													<span class="relative text-white text-xs drop-shadow-sm">{host.name}</span>
													{#if p?.country_code}
														<Tooltip text={p.country_name || countryName(p.country_code)}>
															<img src={flagUrl(p.country_code)} alt={p.country_name || countryName(p.country_code)} class="relative h-3.5 w-auto" />
														</Tooltip>
													{/if}
												</a>
											{/each}
										</div>
									{/if}
								</div>
							</div>
						</li>
					{/each}
				</ol>
			</div>
		{:else}
			<p class={muted}>nothing here yet.</p>
		{/each}
	</div>
</section>

<style>
	/* Opened from the command palette (/tournaments#t-12): outline that card for a moment. */
	li:target > div {
		animation: found 2.4s ease-out;
	}
	@keyframes found {
		0%,
		60% {
			box-shadow: 0 0 0 2px var(--accent), 0 0 24px -4px var(--accent);
		}
		100% {
			box-shadow: 0 0 0 0 transparent;
		}
	}
	/* A soft shadow keeps white text readable on bright parts of a banner. */
	.banner-text {
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9), 0 0 12px rgba(0, 0, 0, 0.6);
	}
</style>
