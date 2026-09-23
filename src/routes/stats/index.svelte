<script lang="ts">
	import { lanyard } from '$lib/lanyard';
	import { onMount, onDestroy } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { BUILD_TIMESTAMP } from '$lib/buildtime';

	let mounted = false;

	const data = lanyard;
	
	// Site uptime - automatically set from build time
	const siteStartDate = BUILD_TIMESTAMP;
	let uptime = { days: 0, hours: 0, minutes: 0 };
	
	// Update uptime every minute
	function updateUptime() {
		const now = Date.now();
		const diff = now - siteStartDate;
		uptime.days = Math.floor(diff / (1000 * 60 * 60 * 24));
		uptime.hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
		uptime.minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
	}
	
	updateUptime();
	let uptimeId: ReturnType<typeof setInterval>;
	onMount(() => { uptimeId = setInterval(updateUptime, 60000); });
	onDestroy(() => clearInterval(uptimeId));



	const TITANIC_USER_ID = 3505;

	let githubStats = {
		repos: 0,
		stars: 0,
		forks: 0,
		followers: 0,
		following: 0
	};

	let topPlays: any[] = [];
	
	let titanicUser: any = null;
	let lastPlayedTrack: any = null;

	// GitHub contributions
	let contributions: { days: { date: string; count: number; level: number }[]; total: number } | null = null;
	let contribLoading = true;

	$: contribWeeks = (() => {
		if (!contributions?.days) return [];
		const w: { date: string; count: number; level: number }[][] = [];
		for (let i = 0; i < contributions.days.length; i += 7) {
			w.push(contributions.days.slice(i, i + 7));
		}
		return w;
	})();

	// Romanization
	let romanizedCache: Record<string, string> = {};
	
	async function romanizeText(text: string): Promise<string> {
		if (!text) return text;
		if (romanizedCache[text]) return romanizedCache[text];
		if (!/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/.test(text)) {
			romanizedCache[text] = text;
			return text;
		}
		try {
			const res = await fetch('/api/romanize', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text })
			});
			if (res.ok) {
				const data = await res.json();
				romanizedCache[text] = data.romanized;
				return data.romanized;
			}
		} catch (e) {
			console.error('Romanize failed:', e);
		}
		romanizedCache[text] = text;
		return text;
	}

	let romanizedPlays: Record<number, { artist: string; title: string }> = {};
	let romanizedLastSong = '';
	let romanizedLastArtist = '';
	let romanizedSpotifySong = '';

	function romanizePlays(plays: any[]) {
		plays.slice(0, 5).forEach((play, i) => {
			const artist = play.beatmap?.beatmapset?.artist || '';
			const title = play.beatmap?.beatmapset?.title || '';
			romanizeText(artist).then(r => {
				romanizedPlays[i] = { ...romanizedPlays[i], artist: r };
				romanizedPlays = romanizedPlays;
			});
			romanizeText(title).then(r => {
				romanizedPlays[i] = { ...romanizedPlays[i], title: r };
				romanizedPlays = romanizedPlays;
			});
		});
	}

	$: if (lastPlayedTrack?.track?.name) {
		romanizeText(lastPlayedTrack.track.name).then(r => romanizedLastSong = r);
	}
	$: if (lastPlayedTrack?.track?.artists) {
		romanizeText(lastPlayedTrack.track.artists.map(a => a.name).join(', ')).then(r => romanizedLastArtist = r);
	}
	$: if (spotify?.song) {
		romanizeText(spotify.song).then(r => romanizedSpotifySong = r);
	}

	let loading = true;
	let osuLoading = true;
	let titanicLoading = true;
	let spotifyLoading = true;

	onMount(async () => {
		mounted = true;

		// Fetch GitHub stats
		try {
			const response = await fetch('/api/github');
			if (response.ok) {
				const data = await response.json();
				githubStats = {
					repos: data.repos || 0,
					stars: data.stars || 0,
					forks: data.forks || 0,
					followers: data.followers || 0,
					following: data.following || 0
				};
			}
		} catch (error) {
			console.error('Failed to fetch GitHub stats:', error);
		} finally {
			loading = false;
		}

		// Fetch osu! top plays from Titanic
		try {
			const response = await fetch('/api/titanic-osu');
			if (response.ok) {
				const data = await response.json();
				topPlays = data.scores || [];
				romanizePlays(topPlays);
			}
		} catch (error) {
			console.error('Failed to fetch osu! stats:', error);
		} finally {
			osuLoading = false;
		}

		// Fetch Titanic user stats
		try {
			const response = await fetch('/api/titanic-user');
			if (response.ok) {
				titanicUser = await response.json();
			}
		} catch (error) {
			console.error('Failed to fetch Titanic user stats:', error);
		} finally {
			titanicLoading = false;
		}

		// Fetch last played Spotify track
		try {
			const response = await fetch('/api/recent-tracks');
			if (response.ok) {
				lastPlayedTrack = await response.json();
			}
		} catch (error) {
			console.error('Failed to fetch last played track:', error);
		} finally {
			spotifyLoading = false;
		}

		// Fetch GitHub contributions
		try {
			const response = await fetch('/api/github-contributions');
			if (response.ok) {
				contributions = await response.json();
			}
		} catch (error) {
			console.error('Failed to fetch GitHub contributions:', error);
		} finally {
			contribLoading = false;
		}
	});

	// Calculate uptime/activity stats from Discord
	$: discordUser = $data?.discord_user;
	$: activities = $data?.activities || [];
	$: spotify = $data?.spotify;
	$: activePlatform = $data
		? [
				$data.active_on_discord_desktop ? 'desktop' : null,
				$data.active_on_discord_web ? 'web' : null,
				$data.active_on_discord_mobile ? 'mobile' : null
			]
				.filter(Boolean)
				.join(', ') || 'offline'
		: 'offline';
</script>

<svelte:head>
	<title>stats</title>
	<meta property="og:title" content="stats" />
	<meta name="description" content="various statistics and metrics" />
	<meta property="og:description" content="various statistics and metrics" />
	<meta name="theme-color" media="(prefers-color-scheme: light)" content="#f9f0f5" />
	<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#281c21" />
</svelte:head>

{#if mounted}
<section 
	class="p-8 sm:p-12 lg:p-24 lg:py-16 font-cascadia"
	in:fade={{ duration: 200 }}
>
	<div class="flex flex-col gap-7">
		<div>
			<h1 
				class="text-ocean-900 dark:text-ocean-100"
				in:fly={{ y: -20, duration: 300 }}
			>stats</h1>
			<p 
				class="text-ocean-700 dark:text-ocean-400"
				in:fly={{ y: -20, duration: 300, delay: 50 }}
			>various statistics and metrics</p>
		</div>

		<!-- Site Uptime -->
		<div in:fly={{ y: 20, duration: 300, delay: 100 }}>
			<h2 class="text-ocean-900 dark:text-ocean-100 text-xl mb-3">site uptime</h2>
			<div class="border border-ocean-300 dark:border-ocean-700 rounded p-4">
				<p class="text-ocean-900 dark:text-ocean-100 text-3xl font-medium">
					{uptime.days}d {uptime.hours}h {uptime.minutes}m
				</p>
				<p class="text-ocean-700 dark:text-ocean-400 text-sm mt-1">since deployment</p>
			</div>
		</div>

		<!-- Discord Stats -->
		<div in:fly={{ y: 20, duration: 300, delay: 200 }}>
			<h2 class="text-ocean-900 dark:text-ocean-100 text-xl mb-3">discord</h2>
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
				<div class="border border-ocean-300 dark:border-ocean-700 rounded p-4">
					<p class="text-ocean-700 dark:text-ocean-400 text-sm">status</p>
					<p class="text-ocean-900 dark:text-ocean-100 text-2xl font-medium lowercase">
						{$data?.discord_status || 'offline'}
					</p>
				</div>
				<div class="border border-ocean-300 dark:border-ocean-700 rounded p-4">
					<p class="text-ocean-700 dark:text-ocean-400 text-sm">activities</p>
					<p class="text-ocean-900 dark:text-ocean-100 text-2xl font-medium">
						{activities.length}
					</p>
				</div>
				<div class="border border-ocean-300 dark:border-ocean-700 rounded p-4">
					<p class="text-ocean-700 dark:text-ocean-400 text-sm">listening to</p>
					<p class="text-ocean-900 dark:text-ocean-100 text-2xl font-medium">
						{spotify ? (romanizedSpotifySong || spotify.song) : 'nothing'}
					</p>
				</div>
				<div class="border border-ocean-300 dark:border-ocean-700 rounded p-4">
					<p class="text-ocean-700 dark:text-ocean-400 text-sm">active on</p>
					<p class="text-ocean-900 dark:text-ocean-100 text-lg font-medium lowercase">
						{activePlatform}
					</p>
				</div>
			</div>
		</div>

		<!-- GitHub Stats -->
		<div in:fly={{ y: 20, duration: 300, delay: 300 }}>
			<h2 class="text-ocean-900 dark:text-ocean-100 text-xl mb-3">github</h2>
			{#if loading}
				<p class="text-ocean-700 dark:text-ocean-400">Loading...</p>
			{:else}
				<div class="grid grid-cols-2 md:grid-cols-3 gap-4">
					<div class="border border-ocean-300 dark:border-ocean-700 rounded p-4">
						<p class="text-ocean-700 dark:text-ocean-400 text-sm">repositories</p>
						<p class="text-ocean-900 dark:text-ocean-100 text-2xl font-medium">
							{githubStats.repos}
						</p>
					</div>
					<div class="border border-ocean-300 dark:border-ocean-700 rounded p-4">
						<p class="text-ocean-700 dark:text-ocean-400 text-sm">stars</p>
						<p class="text-ocean-900 dark:text-ocean-100 text-2xl font-medium">
							{githubStats.stars}
						</p>
					</div>
					<div class="border border-ocean-300 dark:border-ocean-700 rounded p-4">
						<p class="text-ocean-700 dark:text-ocean-400 text-sm">forks</p>
						<p class="text-ocean-900 dark:text-ocean-100 text-2xl font-medium">
							{githubStats.forks}
						</p>
					</div>
					<div class="border border-ocean-300 dark:border-ocean-700 rounded p-4">
						<p class="text-ocean-700 dark:text-ocean-400 text-sm">followers</p>
						<p class="text-ocean-900 dark:text-ocean-100 text-2xl font-medium">
							{githubStats.followers}
						</p>
					</div>
					<div class="border border-ocean-300 dark:border-ocean-700 rounded p-4">
						<p class="text-ocean-700 dark:text-ocean-400 text-sm">following</p>
						<p class="text-ocean-900 dark:text-ocean-100 text-2xl font-medium">
							{githubStats.following}
						</p>
					</div>
				</div>
			{/if}
		</div>

		<!-- GitHub Contributions -->
		<div in:fly={{ y: 20, duration: 300, delay: 350 }}>
			<h2 class="text-ocean-900 dark:text-ocean-100 text-xl mb-3">contributions</h2>
			{#if contribLoading}
				<p class="text-ocean-700 dark:text-ocean-400">Loading...</p>
			{:else if contributions && contributions.days.length > 0}
				<div class="border border-ocean-300 dark:border-ocean-700 rounded p-4">
					<p class="text-ocean-700 dark:text-ocean-400 text-sm mb-3">
						<span class="text-ocean-900 dark:text-ocean-100 font-medium">{contributions.total.toLocaleString()}</span> contributions in the last year
					</p>
					<div class="overflow-x-auto">
						<div class="flex gap-[3px]" style="min-width: 720px">
							{#each contribWeeks as week}
								<div class="flex flex-col gap-[3px]">
									{#each week as day}
										<div 
											class="w-[11px] h-[11px] rounded-sm {day.level === 0 
												? 'bg-ocean-200 dark:bg-ocean-800' 
												: day.level === 1 
												? 'bg-ocean-green/30'
												: day.level === 2 
												? 'bg-ocean-green/50' 
												: day.level === 3 
												? 'bg-ocean-green/70' 
												: 'bg-ocean-green'}"
											title="{day.date}: {day.count} contribution{day.count !== 1 ? 's' : ''}"
										/>
									{/each}
								</div>
							{/each}
						</div>
					</div>
					<div class="flex items-center gap-1.5 mt-3 justify-end text-ocean-600 dark:text-ocean-500 text-xs">
						<span>less</span>
						<div class="w-[11px] h-[11px] rounded-sm bg-ocean-200 dark:bg-ocean-800" />
						<div class="w-[11px] h-[11px] rounded-sm bg-ocean-green/30" />
						<div class="w-[11px] h-[11px] rounded-sm bg-ocean-green/50" />
						<div class="w-[11px] h-[11px] rounded-sm bg-ocean-green/70" />
						<div class="w-[11px] h-[11px] rounded-sm bg-ocean-green" />
						<span>more</span>
					</div>
				</div>
			{:else}
				<p class="text-ocean-700 dark:text-ocean-400">No contribution data available</p>
			{/if}
		</div>

		<div in:fly={{ y: 20, duration: 300, delay: 450 }}>
			<h2 class="text-ocean-900 dark:text-ocean-100 text-xl mb-3">titanic user stats</h2>
			{#if titanicLoading}
				<p class="text-ocean-700 dark:text-ocean-400">Loading...</p>
			{:else if titanicUser}
				<div class="grid grid-cols-2 md:grid-cols-3 gap-4">
					{#if titanicUser.stats && titanicUser.stats[0] && titanicUser.rankings}
						{@const osuStats = titanicUser.stats[0]}
						{@const rankings = titanicUser.rankings['0']}
						<div class="border border-ocean-300 dark:border-ocean-700 rounded p-4 overflow-hidden">
							<p class="text-ocean-700 dark:text-ocean-400 text-sm">global rank (pp)</p>
							<p class="text-ocean-900 dark:text-ocean-100 text-lg sm:text-2xl font-medium truncate">
								#{rankings?.performance?.global?.toLocaleString() || osuStats.rank?.toLocaleString() || 'N/A'}
							</p>
						</div>
						<div class="border border-ocean-300 dark:border-ocean-700 rounded p-4 overflow-hidden">
							<p class="text-ocean-700 dark:text-ocean-400 text-sm">country rank (pp)</p>
							<p class="text-ocean-900 dark:text-ocean-100 text-lg sm:text-2xl font-medium truncate">
								#{rankings?.performance?.country?.toLocaleString() || 'N/A'}
							</p>
						</div>
						<div class="border border-ocean-300 dark:border-ocean-700 rounded p-4 overflow-hidden">
							<p class="text-ocean-700 dark:text-ocean-400 text-sm">performance points</p>
							<p class="text-ocean-900 dark:text-ocean-100 text-lg sm:text-2xl font-medium truncate">
								{osuStats.pp?.toFixed(0).toLocaleString() || 'N/A'}pp
							</p>
						</div>
						<div class="border border-ocean-300 dark:border-ocean-700 rounded p-4 overflow-hidden">
							<p class="text-ocean-700 dark:text-ocean-400 text-sm">ppv1 rank</p>
							<p class="text-ocean-900 dark:text-ocean-100 text-lg sm:text-2xl font-medium truncate">
								#{rankings?.ppv1?.global?.toLocaleString() || 'N/A'}
							</p>
						</div>
						<div class="border border-ocean-300 dark:border-ocean-700 rounded p-4 overflow-hidden">
							<p class="text-ocean-700 dark:text-ocean-400 text-sm">ppv1</p>
							<p class="text-ocean-900 dark:text-ocean-100 text-lg sm:text-2xl font-medium truncate">
								{osuStats.ppv1?.toFixed(0).toLocaleString() || 'N/A'}pp
							</p>
						</div>
						<div class="border border-ocean-300 dark:border-ocean-700 rounded p-4 overflow-hidden">
							<p class="text-ocean-700 dark:text-ocean-400 text-sm">ranked score rank</p>
							<p class="text-ocean-900 dark:text-ocean-100 text-lg sm:text-2xl font-medium truncate">
								#{rankings?.rscore?.global?.toLocaleString() || 'N/A'}
							</p>
						</div>
						<div class="border border-ocean-300 dark:border-ocean-700 rounded p-4 overflow-hidden">
							<p class="text-ocean-700 dark:text-ocean-400 text-sm">ranked score</p>
							<p class="text-ocean-900 dark:text-ocean-100 text-base sm:text-2xl font-medium truncate">
								{osuStats.rscore?.toLocaleString() || 'N/A'}
							</p>
						</div>
						<div class="border border-ocean-300 dark:border-ocean-700 rounded p-4 overflow-hidden">
							<p class="text-ocean-700 dark:text-ocean-400 text-sm">total score rank</p>
							<p class="text-ocean-900 dark:text-ocean-100 text-lg sm:text-2xl font-medium truncate">
								#{rankings?.tscore?.global?.toLocaleString() || 'N/A'}
							</p>
						</div>
						<div class="border border-ocean-300 dark:border-ocean-700 rounded p-4 overflow-hidden">
							<p class="text-ocean-700 dark:text-ocean-400 text-sm">total score</p>
							<p class="text-ocean-900 dark:text-ocean-100 text-base sm:text-2xl font-medium truncate">
								{osuStats.tscore?.toLocaleString() || 'N/A'}
							</p>
						</div>
						<div class="border border-ocean-300 dark:border-ocean-700 rounded p-4 overflow-hidden">
							<p class="text-ocean-700 dark:text-ocean-400 text-sm">accuracy</p>
							<p class="text-ocean-900 dark:text-ocean-100 text-lg sm:text-2xl font-medium truncate">
								{osuStats.acc ? `${(osuStats.acc * 100).toFixed(2)}%` : 'N/A'}
							</p>
						</div>
						<div class="border border-ocean-300 dark:border-ocean-700 rounded p-4">
							<p class="text-ocean-700 dark:text-ocean-400 text-sm">playcount</p>
							<p class="text-ocean-900 dark:text-ocean-100 text-2xl font-medium">
								{osuStats.playcount?.toLocaleString() || 'N/A'}
							</p>
						</div>
						<div class="border border-ocean-300 dark:border-ocean-700 rounded p-4">
							<p class="text-ocean-700 dark:text-ocean-400 text-sm">max combo</p>
							<p class="text-ocean-900 dark:text-ocean-100 text-2xl font-medium">
								{osuStats.max_combo?.toLocaleString() || 'N/A'}x
							</p>
						</div>
					{/if}
					{#if titanicUser.name}
						<div class="border border-ocean-300 dark:border-ocean-700 rounded p-4">
							<p class="text-ocean-700 dark:text-ocean-400 text-sm">titanic username</p>
							<p class="text-ocean-900 dark:text-ocean-100 text-lg font-medium">
								{titanicUser.name}
							</p>
						</div>
					{/if}
					{#if titanicUser.country}
						<div class="border border-ocean-300 dark:border-ocean-700 rounded p-4">
							<p class="text-ocean-700 dark:text-ocean-400 text-sm">country</p>
							<p class="text-ocean-900 dark:text-ocean-100 text-lg font-medium">
								{titanicUser.country}
							</p>
						</div>
					{/if}
				</div>
			{:else}
				<p class="text-ocean-700 dark:text-ocean-400">Failed to load Titanic user stats</p>
			{/if}
		</div>

		<div in:fly={{ y: 20, duration: 300, delay: 550 }}>
			<h2 class="text-ocean-900 dark:text-ocean-100 text-xl mb-3">titanic top plays</h2>
			{#if osuLoading}
				<p class="text-ocean-700 dark:text-ocean-400">Loading...</p>
			{:else if topPlays.length > 0}
				<div class="flex flex-col gap-3">
					{#each topPlays.slice(0, 5) as play, i}
						<div class="border border-ocean-300 dark:border-ocean-700 rounded p-4">
							<div class="flex items-start justify-between gap-4">
								<div class="flex-1">
									<p class="text-ocean-900 dark:text-ocean-100 font-medium">
										#{i + 1} {romanizedPlays[i]?.artist || play.beatmap?.beatmapset?.artist} - {romanizedPlays[i]?.title || play.beatmap?.beatmapset?.title}
									</p>
									<p class="text-ocean-700 dark:text-ocean-400 text-sm">
										[{play.beatmap?.version}]
									</p>
									<div class="flex gap-4 mt-2 text-sm">
										<span class="text-ocean-800 dark:text-ocean-300">{play.pp?.toFixed(0)}pp</span>
										<span class="text-ocean-800 dark:text-ocean-300">{play.acc ? `${(play.acc * 100).toFixed(2)}%` : 'N/A'}</span>
										<span class="text-ocean-800 dark:text-ocean-300">{play.max_combo}x</span>
										<span class="text-ocean-800 dark:text-ocean-300">{play.grade}</span>
									</div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-ocean-700 dark:text-ocean-400">No top plays found</p>
			{/if}
		</div>

		<!-- Spotify Stats -->
		<div in:fly={{ y: 20, duration: 300, delay: 650 }}>
			<h2 class="text-ocean-900 dark:text-ocean-100 text-xl mb-3">spotify</h2>
			{#if spotifyLoading}
				<p class="text-ocean-700 dark:text-ocean-400">Loading...</p>
			{:else if lastPlayedTrack}
				<div class="border border-ocean-300 dark:border-ocean-700 rounded p-4 mb-4">
					<p class="text-ocean-700 dark:text-ocean-400 text-sm mb-2">last played</p>
					<div class="flex items-center gap-3">
						{#if lastPlayedTrack.track?.album?.images?.[0]?.url}
							<img 
								src={lastPlayedTrack.track.album.images[0].url} 
								alt="Album art"
								class="w-16 h-16 rounded shadow-lg"
							/>
						{/if}
						<div class="flex flex-col">
							<a 
								href={lastPlayedTrack.track?.external_urls?.spotify}
								target="_blank"
								rel="noopener noreferrer"
								class="text-ocean-900 dark:text-ocean-100 font-medium hover:underline"
							>
								{romanizedLastSong || lastPlayedTrack.track?.name}
							</a>
							<span class="text-ocean-800 dark:text-ocean-300">
								{romanizedLastArtist || lastPlayedTrack.track?.artists?.map(a => a.name).join(', ')}
							</span>
							<span class="text-ocean-700 dark:text-ocean-400 text-sm">
								{new Date(lastPlayedTrack.played_at).toLocaleString()}
							</span>
						</div>
					</div>
				</div>
			{/if}
			<p class="text-ocean-700 dark:text-ocean-400">
				Check out my <a href="/music" class="underline hover:text-ocean-900 dark:hover:text-ocean-100">top tracks</a>
			</p>
		</div>
	</div>
</section>
{/if}
