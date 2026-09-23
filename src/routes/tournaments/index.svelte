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
	
	export let tournaments: TournamentYear[];

	let mounted = false;
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
	
	function flagUrl(code: string) {
		const codepoints = [...code.toUpperCase()].map(c => (0x1F1E6 + c.charCodeAt(0) - 65).toString(16)).join('-');
		return `https://osu.ppy.sh/assets/images/flags/${codepoints}.svg`;
	}

	onMount(() => {
		mounted = true;
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
	{#if mounted}
		<div class="flex flex-col gap-7 max-w-3xl">
			<div in:fly={{ y: -20, duration: 400 }}>
				<h1 class="text-ocean-900 dark:text-ocean-100">tournament staffing</h1>
				<p class="text-ocean-700 dark:text-ocean-400">osu! tournaments I've helped staff</p>
			</div>

		{#each tournaments as { year, events }, i}
			<div in:fly={{ y: 20, duration: 400, delay: 100 + (i * 100) }}>
				<h2 class="text-ocean-900 dark:text-ocean-100 text-2xl mb-3">{year}</h2>
				<p class="text-ocean-700 dark:text-ocean-400 text-sm mb-4">
					{events.length} tournament{events.length !== 1 ? 's' : ''} staffed
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
								<div class="absolute inset-0 bg-black/60 dark:bg-black/70 transition-colors duration-300 group-hover:bg-black/40 dark:group-hover:bg-black/50" />
							{/if}
							<a 
								href={event.link}
								target="_blank"
								rel="noopener noreferrer"
								class="block relative p-4"
							>
								<div class="flex items-start gap-4">
									{#if event.badge}
										<div class="flex-shrink-0">
											<img 
												src={event.badge} 
												alt="{event.name} badge" 
												loading="lazy"
												decoding="async"
												class="w-20 h-20 object-contain rounded"
												on:error={e => e.target.style.display = 'none'}
											/>
										</div>
									{/if}
									<div class="flex-1 min-w-0">
										<h3 class="{event.banner ? 'text-white' : 'text-ocean-900 dark:text-ocean-100'} font-medium hover:underline mb-1">
											{event.name}
										</h3>
										<p class="{event.banner ? 'text-white/70' : 'text-ocean-700 dark:text-ocean-400'} text-sm">
											{event.role}
										</p>
										{#if event.hosts?.length}
											<div class="flex items-center gap-2 mt-2 flex-wrap">
												<span class="{event.banner ? 'text-white/60' : 'text-ocean-600 dark:text-ocean-500'} text-xs">hosted by</span>
												{#each event.hosts as host, hi}
													<a 
														href="https://osu.ppy.sh/users/{host.id}" 
														target="_blank" 
														rel="noopener noreferrer"
														class="relative inline-flex items-center gap-1.5 rounded-md pr-2 hover:brightness-110 transition-all"
														style="background: {hostProfiles[host.id]?.cover_url ? `url(${hostProfiles[host.id].cover_url}) center/cover` : 'linear-gradient(135deg, #334155, #1e293b)'};"
														on:click|stopPropagation
													>
														<div class="absolute inset-0 bg-black/50 rounded-md"></div>
														<img 
															src="https://a.ppy.sh/{host.id}" 
															alt={host.name}
															class="relative w-7 h-7 rounded-l-md object-cover"
														/>
														<span class="relative text-white text-xs font-medium drop-shadow-sm">{host.name}</span>
														{#if hostProfiles[host.id]?.country_code}
															<Tooltip text={hostProfiles[host.id].country_name || hostProfiles[host.id].country_code}>
																<img 
																	src={flagUrl(hostProfiles[host.id].country_code)}
																	alt={hostProfiles[host.id].country_name || hostProfiles[host.id].country_code}
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
							</a>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
	{/if}
</section>
