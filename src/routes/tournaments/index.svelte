<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import Tooltip from '$lib/components/Tooltip.svelte';
	
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
	
	const tournaments = [
		{
			year: '2025',
			events: [
				{ name: 'Strongest ASCII Battlegrounds', role: 'referee', link: 'https://osu.ppy.sh/community/forums/topics/2104987', hosts: [{ name: 'Melodieyy-', id: 33526381 }], banner: 'http://swooo.sh/FLUV6w.png' },
				{ name: 'Sandri Showdown', role: 'referee', link: 'https://osu.ppy.sh/community/forums/topics/2136853', hosts: [{ name: 'cedru', id: 10162611 }], banner: 'https://sundei.ee/tournaments/cedru-showdown.webp' }
			]
		},
		{
			year: '2025/2026',
			events: [
				{ name: 'Latvian osu! LAN Tournament', role: 'referee', link: 'https://osu.ppy.sh/community/forums/topics/2137587', hosts: [{ name: 'Joyy', id: 14084526 }], banner: 'https://sundei.ee/tournaments/lolt2026.webp' },
				{ name: 'Nordic & Baltic Duo Tournament', role: 'referee', link: 'https://osu.ppy.sh/community/forums/topics/2151572', hosts: [{ name: 'Laurus', id: 20373027 }, { name: 'nik', id: 10077264 }], banner: 'https://sundei.ee/tournaments/nbd2025.png' },
				{ name: 'osu! 6 digit Tournament', role: 'referee/commentator', link: 'https://osu.ppy.sh/community/forums/topics/2139437', hosts: [{ name: 'FrenchFemboy', id: 15875416 }, { name: 'Scream10', id: 16131822 }, { name: 'Ninbsa', id: 20024996 }], banner: 'https://sundei.ee/tournaments/6digwc.png' }
			]
		},
		{
			year: '2026',
			events: [
				{ name: '5EC Minor League', role: 'referee', link: 'https://osu.ppy.sh/community/forums/topics/2160276', hosts: [{ name: 'jojo_flower', id: 28236847 }, { name: 'Neko4ka', id: 36036411 }], banner: 'https://sundei.ee/tournaments/5ecml.jpg'},
				{ name: 'Battle of The Box 2026', role: 'referee/commentator', link: 'https://osu.ppy.sh/community/forums/topics/2178368?n=1', hosts: [{ name: 'xootynator', id: 3717598 }, { name: 'Fulserish', id: 14252162 }], banner: 'https://sundei.ee/tournaments/Battle_of_the_Box_2026_Waifu_Cup.png', badge: 'https://sundei.ee/badges/botb2026-winner.png' },
				{ name: 'Fun Awesome Relax Tournament', role: 'referee/commentator/playtester', link: 'https://osu.ppy.sh/community/forums/topics/2166712', hosts: [{ name: 'birbisc', id: 30403970 }], banner: 'https://sundei.ee/tournaments/fart2026.png'},
				{ name: 'The Oceanic Cup', role: 'referee', link: 'https://osu.ppy.sh/community/forums/topics/2179025?n=1', hosts: [{ name: 'mrekk', id: 7562902 }, { name: 'Gala', id: 3385634 }], banner: 'https://sundei.ee/tournaments/oceanic-cup.png'},
				{ name: 'XTALotl\'s Skillcap Showdown', role: 'referee', link: 'https://osu.ppy.sh/community/forums/topics/2186485?n=1', hosts: [{ name: '-Axolotl', id: 12995368 }, { name: 'u__u', id: 13139356 }], banner: 'https://sundei.ee/tournaments/skillcap.png'},
				{ name: 'Lebron James Suiji', role: 'referee', link: 'https://osu.ppy.sh/community/forums/topics/2195943?n=1', hosts: [{ name: 'townes', id: 21063408 }, { name: 'MR JEFFERY', id: 16036374 }, { name: 'arekk', id: 16085078 }], banner: 'https://sundei.ee/tournaments/lebron-suiji.png', badge: 'https://sundei.ee/badges/lebron-badge.png' },
				{ name: 'Fin\'s All Mode Event', role: 'referee/commentator', link: 'https://osu.ppy.sh/community/forums/topics/2192013?n=1', hosts: [{ name: 'fhz', id: 13660273 }, { name: 'ZeroKungz', id: 23155757 }], banner: 'https://sundei.ee/tournaments/fame.png'},
				{ name: 'Sweden Cup 2026', role: 'streamer', link: 'https://osu.ppy.sh/community/forums/topics/2198246?n=1', hosts: [{ name: 'Geometryville', id: 18272338 }], banner: 'https://sundei.ee/tournaments/sweden-cup-26.png',  badge: 'https://sundei.ee/badges/sc26-winner.png'},
				{ name: 'Gus Cup 2', role: 'referee', link: 'https://osu.ppy.sh/community/forums/topics/2201090?n=1', hosts: [{ name: 'Woey', id: 3792472 }, { name: 'Nopekjk', id: 4585186 }], banner: 'https://sundei.ee/tournaments/gus2-banner.jpg'},
				{ name: 'Suomen Alueellinen Turnaus', role: 'streamer/referee', link: 'https://osu.ppy.sh/community/forums/topics/2198883?n=1', hosts: [{ name: 'Nikva', id: 21353706 }], banner: 'https://sundei.ee/tournaments/sat2026.png'},
				{ name: 'Shuffle Squad Rumble', role: 'referee', link: 'https://osu.ppy.sh/community/forums/topics/2190446?n=1', hosts: [{ name: 'Molidis', id: 16813846 }, { name: 'Tey', id: 18352115 }, { name: 'Helyana', id: 7921863 }], banner: 'https://sundei.ee/tournaments/ssr-suiji.png'},
				{ name: 'Royal Danish osu! Cup 2026', role: 'referee', link: 'https://osu.ppy.sh/community/forums/topics/2217906?n=1', hosts: [{ name: 'Isita', id: 13973026 }, { name: 'jas_', id: 16681798 }], banner: 'https://sundei.ee/tournaments/danish-osu-2026.png'}, 
				{ name: 'Canadian Draft Cup 2026', role: 'referee/streamer', link: 'https://osu.ppy.sh/community/forums/topics/2217995?n=1', hosts: [{ name: 'LumenLogic', id: 8171404 }], banner: 'https://sundei.ee/tournaments/cdc2026-banner.png'}, 
				{ name: 'Rektygon\'s United States Tournament 2', role: 'referee/streamer', link: 'https://osu.ppy.sh/community/forums/topics/2221491?n=1', hosts: [{ name: 'rektygon', id: 7813296 }], banner: 'https://sundei.ee/tournaments/rust2-banner.png'}, 
				{ name: 'Pringle Purrfect Cup 2', role: 'referee', link: 'https://osu.ppy.sh/community/forums/topics/2211583?n=1', hosts: [{ name: 'pingle enjoyer', id: 32558109 }, { name: 'D I O', id: 3958619 }], banner: 'https://sundei.ee/tournaments/ppc2-banner.png'}, 
			]
		}
	];
</script>

<svelte:head>
	<title>tournament staffing</title>
	<meta name="og:title" content="tournament staffing" />
	<meta name="description" content="osu! tournament staffing history" />
	<meta name="og:description" content="osu! tournament staffing history" />
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
								<div 
									class="absolute inset-0 bg-cover bg-center transition-transform duration-500 ease-out group-hover:scale-105"
									style="background-image: url({event.banner});"
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
