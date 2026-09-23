<script context="module" lang="ts">
	import type { Load } from '@sveltejs/kit';

	// Design, song of the month and notes are edited in /admin → pages → music.
	export const load: Load = async ({ fetch }) => {
		const res = await fetch('/api/site/music').catch(() => null);
		return { props: { music: res?.ok ? await res.json() : null } };
	};
</script>

<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { marked } from 'marked';
	import PostBody from '$lib/components/PostBody.svelte';
	import { settingDefaults, type MusicSettings } from '$lib/siteSettings';

	export let music: MusicSettings | null;
	$: settings = music ?? settingDefaults.music;
	$: cards = settings.design === 'cards';
	$: notesHtml = settings.notes ? (marked.parse(settings.notes, { async: false, gfm: true, breaks: true }) as string) : '';
	$: sotm = settings.songOfTheMonth;
	import { browser } from '$app/env';
	import type { SpotifyTimeRange, TopTracksResponse } from '$lib/types';
	

	// --- Tab state ---
	let activeTab: 'top' | 'history' = 'top';

	// --- Top Tracks ---
	const options: {
		name: string;
		value: SpotifyTimeRange;
	}[] = [
		{ name: 'past month', value: 'short_term' },
		{ name: 'past 6 months', value: 'medium_term' },
		{ name: 'all time', value: 'long_term' }
	];

	const tracks: Record<SpotifyTimeRange, TopTracksResponse | null> = {
		short_term: null,
		medium_term: null,
		long_term: null
	};

	let selectedRange = options[0].value;
	let topLoading: Partial<Record<SpotifyTimeRange, boolean>> = {};
	let topError: Partial<Record<SpotifyTimeRange, string>> = {};

	$: if (browser) {
		fetchTopTracks(selectedRange);
	}

	function fetchTopTracks(range: SpotifyTimeRange) {
		if (tracks[range] || topLoading[range]) return;

		topLoading[range] = true;
		topError[range] = '';

		fetch('/api/top-tracks?time_range=' + range)
			.then(res => {
				if (!res.ok) throw new Error(`status ${res.status}`);
				return res.json();
			})
			.then(res => {
				tracks[range] = res;
			})
			.catch(e => {
				console.error('Failed to load top tracks:', e);
				topError[range] = "couldn't load top tracks";
			})
			.finally(() => {
				topLoading[range] = false;
			});
	}

	$: currentRange = tracks[selectedRange];
	
	// --- Listening History ---
	let historyTracks: any[] = [];
	let historyLoading = true;
	let historyError = '';
	let historyLoaded = false;

	function loadHistory() {
		if (historyLoaded) return;
		historyLoaded = true;
		fetch('/api/listening-history')
			.then(res => {
				if (res.ok) return res.json();
				throw new Error('Failed to load');
			})
			.then(data => {
				historyTracks = data;
				romanizeTracks(data);
			})
			.catch(e => {
				historyError = 'Failed to load listening history';
				console.error(e);
			})
			.finally(() => {
				historyLoading = false;
			});
	}

	$: if (activeTab === 'history') {
		loadHistory();
	}

	function groupByDate(items: any[]): Record<string, any[]> {
		const groups: Record<string, any[]> = {};
		for (const item of items) {
			const date = new Date(item.played_at);
			const key = date.toLocaleDateString('en-US', {
				weekday: 'long',
				month: 'long',
				day: 'numeric',
				year: 'numeric'
			});
			if (!groups[key]) groups[key] = [];
			groups[key].push(item);
		}
		return groups;
	}

	$: grouped = groupByDate(historyTracks);

	function timeAgo(dateStr: string): string {
		const date = new Date(dateStr);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		
		if (minutes < 1) return 'just now';
		if (minutes < 60) return `${minutes}m ago`;
		if (hours < 24) return `${hours}h ago`;
		return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
	}

	// --- Romanization (shared) ---
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
				romanizedCache = romanizedCache;
				return data.romanized;
			}
		} catch (e) {
			console.error('Romanize failed:', e);
		}
		romanizedCache[text] = text;
		return text;
	}

	// Trigger romanization for top tracks
	$: if (currentRange && currentRange.length > 0) {
		currentRange.forEach(track => {
			romanizeText(track.name);
			track.artists.forEach(a => romanizeText(a.name));
		});
	}

	// Romanize history tracks
	async function romanizeTracks(items: any[]) {
		for (const item of items) {
			if (item.track?.name) {
				romanizeText(item.track.name).then(r => {
					romanizedCache[item.track.name] = r;
					romanizedCache = romanizedCache;
				});
			}
			const artists = item.track?.artists?.map((a: any) => a.name).join(', ');
			if (artists) {
				romanizeText(artists).then(r => {
					romanizedCache[artists] = r;
					romanizedCache = romanizedCache;
				});
			}
		}
	}

</script>

<svelte:head>
	<title>music</title>
	<meta property="og:title" content="music" />
	<meta name="description" content="tracks i've listened to the most" />
	<meta property="og:description" content="tracks i've listened to the most" />
	<meta name="theme-color" media="(prefers-color-scheme: light)" content="#f9f0f5" />
	<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#281c21" />
</svelte:head>

<section class="p-8 sm:p-12 lg:p-24 lg:py-16 font-cascadia">
	<div class="flex flex-col gap-7">
		<div in:fly={{ y: -20, duration: 400 }}>
			<h1 class="text-ocean-900 dark:text-ocean-100">music</h1>
			<p class="text-ocean-700 dark:text-ocean-400">what i've been listening to</p>
		</div>

		{#if sotm || notesHtml}
			<div class="flex flex-col sm:flex-row gap-5 items-start" in:fly={{ y: 20, duration: 400, delay: 50 }}>
				{#if sotm}
					<a
						href={sotm.url || undefined}
						target="_blank"
						rel="noopener noreferrer"
						class="group flex gap-3 items-center border border-ocean-300 dark:border-ocean-700 rounded-lg p-3 pr-5 hover:border-ocean-500 transition-colors shrink-0 max-w-sm"
					>
						{#if sotm.image}
							<img src={sotm.image} alt="" class="w-16 h-16 rounded shadow-lg group-hover:rotate-3 transition-transform" />
						{/if}
						<div class="min-w-0">
							<div class="text-[10px] uppercase tracking-widest text-ocean-500">song of the month</div>
							<div class="text-ocean-900 dark:text-ocean-100 truncate">{sotm.title}</div>
							{#if sotm.artist}<div class="text-ocean-600 dark:text-ocean-400 text-sm truncate">{sotm.artist}</div>{/if}
							{#if sotm.note}<div class="text-ocean-600 dark:text-ocean-400 text-xs italic mt-1">“{sotm.note}”</div>{/if}
						</div>
					</a>
				{/if}
				{#if notesHtml}
					<div class="flex-1 text-sm"><PostBody html={notesHtml} /></div>
				{/if}
			</div>
		{/if}

		<!-- Tabs -->
		<div class="flex gap-6 text-sm border-b border-ocean-300 dark:border-ocean-700">
			<button
				on:click={() => activeTab = 'top'}
				class="pb-2 transition-colors border-b-2 {activeTab === 'top'
					? 'text-ocean-900 dark:text-ocean-100 border-ocean-900 dark:border-ocean-100'
					: 'text-ocean-600 dark:text-ocean-500 border-transparent hover:text-ocean-900 dark:hover:text-ocean-100'}"
			>
				top tracks
			</button>
			<button
				on:click={() => activeTab = 'history'}
				class="pb-2 transition-colors border-b-2 {activeTab === 'history'
					? 'text-ocean-900 dark:text-ocean-100 border-ocean-900 dark:border-ocean-100'
					: 'text-ocean-600 dark:text-ocean-500 border-transparent hover:text-ocean-900 dark:hover:text-ocean-100'}"
			>
				listening history
			</button>
		</div>

		<!-- Top Tracks Tab -->
		{#if activeTab === 'top'}
			<div in:fade={{ duration: 200 }}>
				<div class="flex gap-4 text-ocean-700 dark:text-ocean-400 mb-4">
					{#each options as { name, value }}
						<button
							on:click={() => selectedRange = value}
							class="hover:text-ocean-900 dark:hover:text-ocean-100 transition-colors
								{selectedRange === value ? 'text-ocean-900 dark:text-ocean-100' : ''}"
						>
							{name}
						</button>
					{/each}
				</div>

				{#if topLoading[selectedRange]}
					<p class="text-ocean-700 dark:text-ocean-400">loading...</p>
				{:else if topError[selectedRange]}
					<p class="text-red-500">
						{topError[selectedRange]}.
						<button class="underline" on:click={() => fetchTopTracks(selectedRange)}>try again</button>
					</p>
				{/if}

				{#key selectedRange}
					{#if cards}
						<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" in:fade={{ duration: 300 }}>
							{#each currentRange ?? [] as track, i}
								<a
									href={track.external_urls.spotify}
									target="_blank"
									rel="noopener noreferrer"
									class="group flex flex-col gap-1.5"
								>
									<div class="relative aspect-square rounded-md overflow-hidden shadow bg-ocean-200 dark:bg-ocean-800">
										{#if track.album?.images?.[1]?.url || track.album?.images?.[0]?.url}
											<img
												src={track.album.images[1]?.url || track.album.images[0]?.url}
												alt=""
												loading="lazy"
												class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
											/>
										{/if}
										<span class="absolute top-1.5 left-1.5 text-xs px-1.5 py-0.5 rounded bg-black/60 text-white">#{i + 1}</span>
									</div>
									<span class="text-ocean-900 dark:text-ocean-100 text-xs truncate group-hover:underline">{romanizedCache[track.name] || track.name}</span>
									<span class="text-ocean-600 dark:text-ocean-400 text-[11px] truncate -mt-1">{track.artists.map(a => romanizedCache[a.name] || a.name).join(', ')}</span>
								</a>
							{/each}
						</div>
					{:else}
					<div class="flex flex-col gap-2" in:fade={{ duration: 300 }}>
						{#each currentRange ?? [] as track, i}
							<a
								href={track.external_urls.spotify}
								target="_blank"
								rel="noopener noreferrer"
								class="text-ocean-700 dark:text-ocean-400 hover:text-ocean-900 dark:hover:text-ocean-100 transition-colors"
							>
								{i + 1}. {romanizedCache[track.name] || track.name} - {track.artists.map(a => romanizedCache[a.name] || a.name).join(', ')}
							</a>
						{/each}
					</div>
					{/if}
				{/key}
			</div>

		<!-- Listening History Tab -->
		{:else}
			<div in:fade={{ duration: 200 }}>
				{#if historyLoading}
					<div class="flex items-center gap-2 text-ocean-700 dark:text-ocean-400">
						<svg class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
						</svg>
						loading...
					</div>
				{:else if historyError}
					<p class="text-red-500">{historyError}</p>
				{:else if cards}
					<p class="text-ocean-600 dark:text-ocean-500 text-xs mb-6">recent 50 spotify listens</p>
					<div class="space-y-8">
						{#each Object.entries(grouped) as [date, items], groupIndex}
							<div in:fly={{ y: 20, duration: 300, delay: groupIndex * 100 }}>
								<h2 class="text-ocean-800 dark:text-ocean-200 text-sm font-medium mb-3 sticky top-14 py-2 backdrop-blur-md z-10">
									{date} <span class="text-ocean-500 text-xs">· {items.length}</span>
								</h2>
								<div class="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-2">
									{#each items as item, i}
										{@const trackName = item.track?.name || ''}
										{@const artists = item.track?.artists?.map(a => a.name).join(', ') || ''}
										<a
											href={item.track?.external_urls?.spotify || '#'}
											target="_blank"
											rel="noopener noreferrer"
											title="{romanizedCache[trackName] || trackName} – {romanizedCache[artists] || artists} · {timeAgo(item.played_at)}"
											class="group relative aspect-square rounded overflow-hidden bg-ocean-200 dark:bg-ocean-800"
											in:fade={{ duration: 200, delay: groupIndex * 100 + i * 15 }}
										>
											{#if item.track?.album?.images?.[1]?.url || item.track?.album?.images?.[0]?.url}
												<img src={item.track.album.images[1]?.url || item.track.album.images[0]?.url} alt="" loading="lazy" class="w-full h-full object-cover" />
											{/if}
											<div class="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 flex flex-col justify-end">
												<span class="text-white text-[10px] leading-tight truncate">{romanizedCache[trackName] || trackName}</span>
												<span class="text-white/70 text-[9px] truncate">{romanizedCache[artists] || artists}</span>
												<span class="text-white/50 text-[9px]">{new Date(item.played_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}{item.source === 'lastfm' ? ' · last.fm' : ''}</span>
											</div>
										</a>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-ocean-600 dark:text-ocean-500 text-xs mb-6">recent 50 spotify listens</p>
					<div class="space-y-8">
						{#each Object.entries(grouped) as [date, items], groupIndex}
							<div in:fly={{ y: 20, duration: 300, delay: groupIndex * 100 }}>
								<h2 class="text-ocean-800 dark:text-ocean-200 text-sm font-medium mb-3 sticky top-14 py-2 backdrop-blur-md z-10">
									{date}
								</h2>
								<div class="relative ml-4 border-l border-ocean-300 dark:border-ocean-700 pl-6 space-y-1">
									{#each items as item, i}
										{@const trackName = item.track?.name || ''}
										{@const artists = item.track?.artists?.map(a => a.name).join(', ') || ''}
										<div 
											class="relative group"
											in:fly={{ x: -10, duration: 200, delay: groupIndex * 100 + i * 30 }}
										>
											<div class="absolute -left-[31px] top-3 w-2.5 h-2.5 rounded-full bg-ocean-400 dark:bg-ocean-600 group-hover:bg-ocean-600 dark:group-hover:bg-ocean-400 transition-colors"></div>
											
											<div class="flex items-center gap-3 py-2 px-3 -mx-3 rounded hover:bg-ocean-200/30 dark:hover:bg-ocean-800/30 transition-colors">
												{#if item.track?.album?.images?.[2]?.url || item.track?.album?.images?.[0]?.url}
													<img 
														src={item.track.album.images[2]?.url || item.track.album.images[0]?.url} 
														alt="Album art"
														class="w-10 h-10 rounded shadow flex-shrink-0"
													/>
												{/if}
												<div class="flex-1 min-w-0">
													<a 
														href={item.track?.external_urls?.spotify || '#'}
														target="_blank"
														rel="noopener noreferrer"
														class="text-ocean-900 dark:text-ocean-100 text-sm hover:underline truncate block"
													>
														{romanizedCache[trackName] || trackName}
													</a>
													<span class="text-ocean-700 dark:text-ocean-400 text-xs truncate block">
														{romanizedCache[artists] || artists}
													</span>
												</div>
												{#if item.source === 'lastfm'}
													<span class="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-600 dark:text-red-400 flex-shrink-0" title="from last.fm">last.fm</span>
												{/if}
												<span class="text-ocean-600 dark:text-ocean-500 text-xs flex-shrink-0 hidden sm:block">
													{new Date(item.played_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
												</span>
												<span class="text-ocean-600 dark:text-ocean-500 text-xs flex-shrink-0 sm:hidden">
													{timeAgo(item.played_at)}
												</span>
											</div>
										</div>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</div>
</section>