<script context="module" lang="ts">
	import type { Load } from '@sveltejs/kit';
	import { browser } from '$app/env';
	import { DISCORD_ID } from '$lib/lanyard';

	// Rendered per request (not prerendered) so the intro and project list edited in /admin
	// show up without a redeploy.
	// Coming back to the home page within a minute reuses what it loaded last time (the live
	// parts come from the nav's connection anyway), so it opens instantly.
	let recent: { at: number; props: Record<string, unknown> } | null = null;

	export const load: Load = async ({ fetch }) => {
		if (browser && recent && Date.now() - recent.at < 60000) return { props: { ...recent.props, discord: null, spotify: null } };
		const [home, projects, events, buttons, posts, nowPage] = await Promise.all([
			fetch('/api/site/home').then((r) => (r.ok ? r.json() : null)).catch(() => null),
			fetch('/api/blog?kind=project').then((r) => (r.ok ? r.json() : [])).catch(() => []),
			fetch('/api/blog?kind=event').then((r) => (r.ok ? r.json() : [])).catch(() => []),
			fetch('/api/site/buttons').then((r) => (r.ok ? r.json() : null)).catch(() => null),
			fetch('/api/blog').then((r) => (r.ok ? r.json() : [])).catch(() => []),
			fetch('/api/site/now').then((r) => (r.ok ? r.json() : null)).catch(() => null)
		]);
		// Server only: Discord status and Spotify in the first HTML, so "right now" isn't empty
		// and nothing jumps when it fills in. (Moving between pages, the nav already has both.)
		const live = browser ? { discord: null, spotify: null } : await liveStatus(fetch);
		return { props: { home, projectPages: projects, events, buttons, posts, nowPage, ...live } };
	};

	// Gives up after a second and a half rather than holding the page back.
	const within = <T,>(p: Promise<T>, ms = 1500) => Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]);
	// Discord status, reused for 15 s so quick refreshes don't wait for it again.
	let discordCache: { at: number; data: any } | null = null;
	async function discordStatus(fetch: (url: string) => Promise<Response>) {
		if (discordCache && Date.now() - discordCache.at < 15000) return discordCache.data;
		const data = await fetch(`https://api.lanyard.rest/v1/users/${DISCORD_ID}`).then((r) => (r.ok ? r.json() : null)).then((j) => j?.data ?? null).catch(() => null);
		if (data) discordCache = { at: Date.now(), data };
		return data;
	}
	async function liveStatus(fetch: (url: string) => Promise<Response>) {
		const [discord, spotify] = await Promise.all([
			within(discordStatus(fetch), 2500),
			within(fetch('/api/now-playing').then((r) => (r.ok ? r.json() : null)).catch(() => null))
		]);
		return { discord, spotify };
	}
</script>

<script lang="ts">
	export let home: import('$lib/siteSettings').HomeSettings | null;
	$: homeSettings = home ?? settingDefaults.home;
	$: intro = homeSettings.intro;
	// Projects: your own list if you've made one, otherwise your /projects pages.
	$: projectList = homeSettings.projects.length
		? homeSettings.projects
		: projectPages.map((p) => ({ name: p.title, href: `/projects/${p.slug}`, description: p.excerpt }));
	export let projectPages: { slug: string; title: string; excerpt: string }[];
	export let events: { slug: string; title: string; date: string; endDate: string | null; location: string | null }[];
	export let buttons: import('$lib/siteSettings').ButtonsSettings | null;
	export let posts: { slug: string; title: string; date: string; excerpt: string; banner: string | null }[];
	export let nowPage: import('$lib/siteSettings').NowSettings | null;
	// From the server, used until the live data arrives.
	export let discord: any = null;
	export let spotify: any = null;
	$: if (typeof window !== 'undefined') recent = { at: recent?.props.home === home ? recent.at : Date.now(), props: { home, projectPages, events, buttons, posts, nowPage } };

	// "latest": newest blog post or event that has already started.
	$: latest = [
		...posts.map((p) => ({ ...p, href: `/blog/${p.slug}`, kind: 'post' })),
		...events.filter((e) => eventTiming(e) !== 'upcoming').map((e: any) => ({ ...e, href: `/events/${e.slug}`, kind: 'event' }))
	].sort((a, b) => b.date.localeCompare(a.date))[0];

	// "working on" comes from the first matching section of the /now page.
	$: nowStatus = (nowPage ?? settingDefaults.now).status;
	$: workingOn = (nowPage ?? settingDefaults.now).sections.find((sec) => /work|build|mak|doing/i.test(sec.title))?.items[0];
	import { daysBetween, eventTiming, today } from '$lib/dates';
	import { settingDefaults } from '$lib/siteSettings';

	// "currently at" during an event, "next up" in the two weeks before one.
	$: happening = events.find((e) => eventTiming(e) === 'now');
	$: nextUp = happening
		? null
		: events
				.filter((e) => eventTiming(e) === 'upcoming' && daysBetween(today(), e.date) <= 14)
				.sort((a, b) => a.date.localeCompare(b.date))[0];
	$: buttonWall = buttons ?? settingDefaults.buttons;
	import Branch from '$lib/components/Branch.svelte';
	import Language from '$lib/components/Language.svelte';
	import Workspace from '$lib/components/Workspace.svelte';
	import Terminal from '$lib/components/Terminal.svelte';
	import OsuTooltip from '$lib/components/OsuTooltip.svelte';
	import { getCodeData } from '$lib/rpcUtils';
	import { lanyard } from '$lib/lanyard';
	import { nowPlaying as nowPlayingStore, activityImage } from '$lib/components/site/presence';
	import { onMount, onDestroy } from 'svelte';
	import { fade, fly, slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { app } from '$lib/components/site/app';
	import { stickyAside } from '$lib/components/site/sticky';
	// Sections rise in one after another, but not on a refresh (see $lib/components/site/app).
	// "right now" items that turn up (or end) while you're on the page slide open (or shut), so
	// what's below glides instead of jumping. Not on first load, where they're already in the page.
	const grow = { duration: 380, easing: cubicOut };
	const rise = (i: number) => (app.hydrated ? { y: 12, duration: 500, delay: 60 + i * 70, easing: cubicOut } : { duration: 0 });

	// ── types ──────────────────────────────────────────────────────────────
	interface PrimaryGuild { tag: string; badge: string; identity_guild_id: string; identity_enabled: boolean; }
	interface DiscordUser { id: string; username: string; avatar: string | null; discriminator: string; public_flags: number; global_name?: string; primary_guild?: PrimaryGuild; }
	interface ActivityEmoji { name: string; id?: string; animated?: boolean; }
	interface ActivityAssets { large_image?: string; large_text?: string; small_image?: string; small_text?: string; }
	interface ActivityTimestamps { start?: number; end?: number; }
	interface Activity { id: string; name: string; type: number; state?: string; details?: string; application_id?: string; emoji?: ActivityEmoji; assets?: ActivityAssets; timestamps?: ActivityTimestamps; }
	interface SpotifyTimestamps { start: number; end: number; }
	interface SpotifyData { song: string; artist: string; album: string; album_art_url: string; track_id: string; timestamps?: SpotifyTimestamps; }
	interface LanyardData { discord_user: DiscordUser; discord_status: 'online' | 'idle' | 'dnd' | 'offline'; activities: Activity[]; spotify: SpotifyData | null; }

	// ── lanyard ────────────────────────────────────────────────────────────
	const store = lanyard;
	$: d = ($store ?? discord) as unknown as LanyardData | null;
	$: codeData = getCodeData($store);

	// ── discord display ────────────────────────────────────────────────────
	$: discordAvatar = d?.discord_user?.avatar
		? `https://cdn.discordapp.com/avatars/${d.discord_user.id}/${d.discord_user.avatar}.${d.discord_user.avatar.startsWith('a_') ? 'gif' : 'png'}?size=128`
		: null;
	$: clanBadge = d?.discord_user?.primary_guild?.badge && d?.discord_user?.primary_guild?.identity_guild_id
		? `https://cdn.discordapp.com/clan-badges/${d.discord_user.primary_guild.identity_guild_id}/${d.discord_user.primary_guild.badge}.png?size=16`
		: null;
	const statusMap: Record<string, string> = { online: 'bg-green-500', idle: 'bg-yellow-500', dnd: 'bg-red-500', offline: 'bg-gray-500' };
	$: statusColor = statusMap[d?.discord_status ?? 'offline'] ?? 'bg-gray-500';

	// customStatus moved to script so no inline type casts needed in template
	$: customStatus = (d?.activities ?? []).find((a: Activity) => a.type === 4) ?? null;

	// ── filtered activities ────────────────────────────────────────────────
	$: visibleActivities = (d?.activities ?? []).filter((a: Activity) =>
		(a.type === 0 || a.type === 3) &&
		a.application_id !== '782685898163617802' &&
		!a.name.toLowerCase().includes('spotify')
	);

	let copied = false;

	function copyButtonCode() {
		const { image, alt } = buttonWall.mine;
		// Relative images need the full address to work on other people's sites.
		const src = image.startsWith('/') ? `https://sundei.ee${image}` : image;
		navigator.clipboard.writeText(
			`<a href="https://sundei.ee/" target="_blank" rel="noopener noreferrer">\n  <img src="${src}" alt="${alt.replace(/"/g, '&quot;')}" style="image-rendering: pixelated; width: 88px; height: 31px;" />\n</a>`
		);
		copied = true;
		setTimeout(() => copied = false, 2000);
	}
	// ── clock ──────────────────────────────────────────────────────────────
	const timeZone = 'America/Vancouver';
	const isTimeZoneSame = Intl.DateTimeFormat().resolvedOptions().timeZone === timeZone;
	let timeZoneToggle = false;
	let userLocation = '';
	let targetLocation = '';

	async function getLocationFromTimezone(tz: string): Promise<string> {
		try {
			const q = tz.split('/').pop()?.replace(/_/g, ' ') || tz;
			const res = await fetch(`/api/timezone?location=${encodeURIComponent(q)}`);
			const data = await res.json();
			return [data.location?.city, data.location?.state_prov, data.location?.country_name].filter(Boolean).join(', ');
		} catch {
			return tz.split('/').pop()?.replace(/_/g, ' ') || tz;
		}
	}

	if (typeof window !== 'undefined') {
		getLocationFromTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone).then(l => userLocation = l);
		getLocationFromTimezone(timeZone).then(l => targetLocation = l);
	}

	$: timeFormatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', timeZone: timeZoneToggle ? timeZone : undefined });
	$: dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: timeZoneToggle ? timeZone : undefined });
	let now = new Date();
	$: date = dateFormatter.format(now);
	$: time = timeFormatter.format(now);
	$: displayCity = timeZoneToggle
		? (targetLocation || timeZone.split('/').pop()?.replace(/_/g, ' '))
		: (userLocation || Intl.DateTimeFormat().resolvedOptions().timeZone.split('/').pop()?.replace(/_/g, ' '));

	// ── kwan wisdom ────────────────────────────────────────────────────────
	const kwanMindset = [
		"I could keep retrying all day",
		"There are no last moments, just moments that last forever.",
		"I'm going to go to mars and I will inhale dirt.",
		"Speed Ryan never left, he was just right next door.",
		"The key to being a Kwan male is to have less bitches than Mathi, so you don't get distracted from the grind.",
		"i have so much speed and so no speed",
		"Holy shit, MUSHROOMS",
		"You know who were born bald? The people who are naturally bald. Think about it. You're naturally bald, and you can never grow hair, you're like.. you're born bald. I mean think about it. Have you ever seen bald people with hair? Think about it. Think about it. Think about it. Think about it. Like you think of a bald people, have you ever seen them with hair?",
		"if your parents annoy the shit out of you just mute them.",
		"the kwan grindset never ends we'll keep going we'll keep kwaning",
		"Sometimes you shouldn't grab what can't handle cuz obviously you can't handle my balls",
		"I FEEL LIKE ARICIN RIGHT NOW. INFINITE STAMINA",
		"I  position my pinkie 45 degrees and if you take the sin of that and find the hypotenuse you can figure out that your hand slows down 10 percent in the negative direction if we define our positive in the right and our negative to the left we can decide that by angling it 10 degrees we can slow down by 10 percent",
		"what oh my god 😱 it's a stop sign 🛑 finding Nemo 🐠 gold fish 🐡 dory 🐟 NATIONAL GEOGRAPHIC 🟨 GODDAMMIT",
		"im gonna try.. singletapping. wait, did i just say ill try using hidden? im stupid i meant to say, im gonna try singletapping.",
		"WHAT? OM NOM NOM NOM NOM",
		"You have autism. Thank you"
	];
	let currentQuote = kwanMindset[Math.floor(Math.random() * kwanMindset.length)];
	function newQuote() { currentQuote = kwanMindset[Math.floor(Math.random() * kwanMindset.length)]; }

	// ── spotify ────────────────────────────────────────────────────────────
	let lastPlayedTrack: any = null;

	// NEW: now playing state (from /api/now-playing)
	interface NowPlayingResponse {
		isPlayingNow: boolean;
		isPaused: boolean;
		progressMs: number;
		track: import('@spotify/web-api-ts-sdk').Track | null;
		fetchedAt?: number;
	}

	// For the "currently" box (listening is already shown in the now playing card).
	$: playing = visibleActivities.find((a: Activity) => a.type === 0)?.name ?? '';
	let nowPlayingTime = 0;
	let nowPlayingStarted = 0;
	let nowPlayingTickId: ReturnType<typeof setInterval>;

	function formatDuration(ms: number) {
		const seconds = Math.floor((ms / 1000) % 60).toString().padStart(2, '0');
		const minutes = Math.floor(ms / 1000 / 60);
		return `${minutes}:${seconds}`;
	}

	// Shared with the nav (see presence.ts), so it's already there when you open the page.
	$: nowPlaying = ($nowPlayingStore ?? spotify) as NowPlayingResponse | null;
	// The response may have sat in Vercel's cache for a few seconds; count from when Spotify was
	// actually asked (never later than now, in case clocks disagree).
	$: if (nowPlaying?.track) {
		nowPlayingStarted = Math.min(nowPlaying.fetchedAt ?? Date.now(), Date.now());
		nowPlayingTime = nowPlaying.progressMs ?? 0;
	}
	// Nothing playing: /api/now-playing already includes the last track, so use that until the
	// exact "last played" time arrives.
	$: lastTrack = lastPlayedTrack ?? (nowPlaying && !nowPlaying.isPlayingNow && nowPlaying.track ? { track: nowPlaying.track, played_at: null } : null);



	// helper used in template to avoid inline (a: any) callbacks
	function artistNames(artists: any[]): string {
		return (artists ?? []).map((a: any) => a.name).join(', ');
	}

	let romanizedCache: Record<string, string> = {};
	async function romanizeText(text: string): Promise<string> {
		if (!text) return text;
		if (romanizedCache[text]) return romanizedCache[text];
		if (!/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/.test(text)) {
			romanizedCache[text] = text;
			return text;
		}
		try {
			const res = await fetch('/api/romanize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
			if (res.ok) { const data = await res.json(); romanizedCache[text] = data.romanized; return data.romanized; }
		} catch (e) { console.error('Romanize failed:', e); }
		romanizedCache[text] = text;
		return text;
	}

	let romanizedSong = '', romanizedArtist = '', romanizedAlbum = '', romanizedLastSong = '', romanizedLastArtist = '';
	$: if (nowPlaying?.track?.name) romanizeText(nowPlaying.track.name).then(r => (romanizedSong = r));
	$: if (nowPlaying?.track?.artists) romanizeText(artistNames(nowPlaying.track.artists)).then(r => (romanizedArtist = r));
	$: if (nowPlaying?.track?.album?.name) romanizeText(nowPlaying.track.album.name).then(r => (romanizedAlbum = r));

	$: if (lastTrack?.track?.name) romanizeText(lastTrack.track.name).then(r => (romanizedLastSong = r));
	$: if (lastTrack?.track?.artists) romanizeText(artistNames(lastTrack.track.artists)).then(r => (romanizedLastArtist = r));
	// ── osu! ───────────────────────────────────────────────────────────────
	const OSU_APP_IDS = new Set(['1216669957799018608', '367827983903490050']);
	const OSU_SELF_USERNAME = 'sodanator';

	function isOsuActivity(a: Activity): boolean {
		return OSU_APP_IDS.has(a.application_id ?? '') || a.name === 'osu!';
	}
	function parseWatchingUsername(state: string): string | null {
		return state?.match(/^Watching (.+?)'s replay$/i)?.[1] ?? null;
	}
	function isSelfOsuState(state: string): boolean {
		return state === 'Clicking circles' || state === 'Choosing a beatmap';
	}

	let osuBeatmapUrls: Record<string, string | null> = {};
	async function resolveOsuBeatmap(details: string) {
		if (osuBeatmapUrls[details] !== undefined) return;
		osuBeatmapUrls[details] = null;
		const query = details.replace(/\[.*?\]\s*$/, '').trim();
		const difficulty = details.match(/\[(.+?)\]$/)?.[1] ?? '';
		try {
			const res = await fetch(`/api/osu-beatmap?q=${encodeURIComponent(query)}&difficulty=${encodeURIComponent(difficulty)}`);
			const data = await res.json();
			osuBeatmapUrls = { ...osuBeatmapUrls, [details]: data.url ?? null };
		} catch {
			osuBeatmapUrls = { ...osuBeatmapUrls, [details]: null };
		}
	}

	let osuUserCache: Record<string, any> = {};
	async function fetchOsuUser(username: string) {
		if (osuUserCache[username] !== undefined) return;
		osuUserCache[username] = null;
		try {
			const res = await fetch(`/api/osu-user?u=${encodeURIComponent(username)}`);
			osuUserCache = { ...osuUserCache, [username]: await res.json() };
		} catch {
			osuUserCache = { ...osuUserCache, [username]: null };
		}
	}

	$: {
		const oa = (d?.activities ?? []).find((a: Activity) => isOsuActivity(a) && !!a.details);
		if (oa?.details) resolveOsuBeatmap(oa.details);
	}
	$: {
		const oa = (d?.activities ?? []).find((a: Activity) => isOsuActivity(a));
		if (oa?.state) {
			const w = parseWatchingUsername(oa.state);
			if (w) fetchOsuUser(w);
			if (isSelfOsuState(oa.state)) fetchOsuUser(OSU_SELF_USERNAME);
		}
	}

	let clockId: ReturnType<typeof setInterval>;

	// Today's most played song from the play log, once it's had 3+ plays.
	let onRepeat: { name: string; artist: string; image: string | null; url: string; plays: number } | null = null;

	onMount(async () => {
		clockId = setInterval(() => { now = new Date(); }, 500);

		// Both at once: what's playing now shouldn't wait for "last played".
		fetch('/api/recent-tracks')
			.then((r) => (r.ok ? r.json() : null))
			.then((t) => t && (lastPlayedTrack = t))
			.catch(() => {});
		fetch('/api/plays/insights')
			.then((r) => (r.ok ? r.json() : null))
			.then((d) => (onRepeat = d?.repeat ?? null))
			.catch(() => {});

		// start now-playing polling and timer

		nowPlayingTickId = setInterval(() => {
			if (!nowPlaying?.track) return;

			// when not actively playing, just keep the raw progressMs (usually 0)
			if (!nowPlaying.isPlayingNow) {
				nowPlayingTime = nowPlaying.progressMs ?? 0;
				return;
			}

			if (nowPlaying.isPaused) {
				nowPlayingTime = nowPlaying.progressMs ?? 0;
			} else {
				const elapsed = Date.now() - nowPlayingStarted;
				nowPlayingTime = Math.min(
					(nowPlaying.progressMs ?? 0) + elapsed,
					nowPlaying.track.duration_ms
				);
			}
		}, 100);
	});

	onDestroy(() => {
		clearInterval(clockId);
		clearInterval(nowPlayingTickId);
	});
</script>

<svelte:head>
	<title>sundei ^_^</title>
	<meta property="og:title" content="my website :3" />
	<meta name="description" content="a collection of various things" />
	<meta property="og:description" content="a collection of various things" />
	<meta name="theme-color" media="(prefers-color-scheme: light)" content="#f9f0f5" />
	<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#281c21" />
</svelte:head>

<!-- Layout: a sticky profile column on the left, a live feed on the right. -->
{#if true}
	{@const label = 'text-[11px] uppercase tracking-widest text-ocean-500'}
	{@const muted = 'text-ocean-600 dark:text-ocean-400'}
	{@const strong = 'text-ocean-900 dark:text-ocean-100'}
	{@const ringMap = { online: 'ring-green-500', idle: 'ring-yellow-500', dnd: 'ring-red-500', offline: 'ring-ocean-400 dark:ring-ocean-600' }}
	{@const groups = [{ key: 'wip', title: homeSettings.titles.wip, items: homeSettings.wip }, { key: 'projects', title: homeSettings.titles.projects, items: projectList }].filter((g) => g.items.length)}

	<section class="px-8 sm:px-12 lg:px-24 pt-8 sm:pt-12 pb-4 font-cascadia grid gap-14 lg:grid-cols-[17rem_1fr] xl:gap-24">
		<!-- ── profile (sticky on wide screens) ── -->
		<aside use:stickyAside class="flex flex-col gap-7 lg:self-start" in:fly={rise(0)}>
			<div class="flex flex-col gap-4">
				<!-- The spot is always there (empty until Discord answers), so nothing below moves. -->
				{#if d?.discord_user && discordAvatar}
					<img
						src={discordAvatar}
						alt=""
						class="w-20 h-20 rounded-full ring-[3px] ring-offset-4 ring-offset-transparent {ringMap[d.discord_status] ?? ringMap.offline}"
						title={d.discord_status}
						in:fade={{ duration: app.hydrated ? 300 : 0 }}
					/>
				{:else}
					<div class="w-20 h-20 rounded-full ring-[3px] ring-offset-4 ring-offset-transparent {ringMap.offline} bg-ocean-300/30 dark:bg-ocean-700/30" />
				{/if}
				<div>
					<h1 class="text-3xl {strong} flex items-center gap-2 flex-wrap">
						sundei
						{#if clanBadge && d?.discord_user?.primary_guild?.tag}
							<span class="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-ocean-200/70 dark:bg-ocean-800/70 {strong}">
								<img src={clanBadge} alt="" class="w-3 h-3" />{d.discord_user.primary_guild.tag}
							</span>
						{/if}
					</h1>
					{#if intro}<p class="mt-3 text-sm leading-relaxed text-ocean-700 dark:text-ocean-300">{intro}</p>{/if}
				</div>
				{#if customStatus && (customStatus.state || customStatus.emoji)}
					<p class="relative w-fit max-w-full rounded-2xl rounded-tl-sm glass border border-ocean-300/50 dark:border-ocean-700/50 px-3 py-2 text-sm flex items-center gap-2 text-ocean-800 dark:text-ocean-200">
						{#if customStatus.emoji?.id}
							<img src="https://cdn.discordapp.com/emojis/{customStatus.emoji.id}.{customStatus.emoji.animated ? 'gif' : 'png'}?size=48" alt={customStatus.emoji.name} class="h-5 w-auto max-w-[4rem] object-contain" />
						{:else if customStatus.emoji}
							<span>{customStatus.emoji.name}</span>
						{/if}
						{#if customStatus.state}<span class="min-w-0">{customStatus.state}</span>{/if}
					</p>
				{/if}
			</div>

			<!-- clock: click to switch between your time zone and mine -->
			<button
				class="text-left {isTimeZoneSame ? 'cursor-default' : 'group'}"
				on:click={() => !isTimeZoneSame && (timeZoneToggle = !timeZoneToggle)}
				title={isTimeZoneSame ? undefined : 'switch time zone'}
			>
				<div class="text-2xl tabular-nums {strong}">{time}</div>
				<div class="text-xs {muted} mt-0.5 group-hover:underline">{date}{#if !isTimeZoneSame}<br />{displayCity || '…'}{/if}</div>
			</button>

			{#if homeSettings.links.length}
				<div class="flex flex-col gap-2">
					<span class={label}>{homeSettings.titles.links}</span>
					<div class="flex flex-wrap gap-1.5">
						{#each homeSettings.links as link}
							{@const internal = link.href.startsWith('/')}
							<a
								href={link.href}
								target={internal ? undefined : '_blank'}
								rel={internal ? undefined : 'noopener noreferrer'}
								title={link.description || undefined}
								class="px-3 py-1 rounded-full text-xs border border-ocean-300/70 dark:border-ocean-700/70 {muted} hover:text-ocean-900 dark:hover:text-ocean-100 hover:border-ocean-500 transition-colors"
								>{link.name}</a
							>
						{/each}
					</div>
				</div>
			{/if}

			<!-- 88×31 buttons, edited in /admin → pages → buttons -->
			<div class="flex flex-col gap-2">
				<span class={label}>{homeSettings.titles.friends}</span>
				<div class="flex flex-wrap gap-1">
					{#each buttonWall.items as b}
						{#if b.href}
							<a href={b.href} target="_blank" rel="noopener noreferrer" title={b.alt} class="transition-transform duration-200 hover:-translate-y-0.5">
								<img src={b.image} alt={b.alt} width="88" height="31" class="h-[31px] w-[88px] {b.pixelated ? 'image-pixelated' : ''}" />
							</a>
						{:else}
							<img src={b.image} alt={b.alt} title={b.alt} width="88" height="31" class="h-[31px] w-[88px] {b.pixelated ? 'image-pixelated' : ''}" />
						{/if}
					{/each}
					{#if buttonWall.mine.image}
						<button on:click={copyButtonCode} title={copied ? 'copied!' : 'my button: click to copy the embed code'} class="transition-transform duration-200 hover:-translate-y-0.5">
							<img src={buttonWall.mine.image} alt={buttonWall.mine.alt} width="88" height="31" class="h-[31px] w-[88px] image-pixelated" />
						</button>
					{/if}
				</div>
				{#if copied}<span class="text-xs {muted}">embed code copied :)</span>{/if}
				{#if buttonWall.webring?.prev && buttonWall.webring?.next}
					{@const ring = buttonWall.webring}
					<nav aria-label="webring" class="flex items-center gap-2 text-xs {muted}">
						<a href={ring.prev} rel="noopener noreferrer" class="hover:underline">← prev</a>
						<span>·</span>
						{#if ring.home}<a href={ring.home} target="_blank" rel="noopener noreferrer" class="hover:underline">{ring.name || 'webring'}</a>{:else}<span>{ring.name || 'webring'}</span>{/if}
						<span>·</span>
						<a href={ring.next} rel="noopener noreferrer" class="hover:underline">next →</a>
					</nav>
				{/if}
			</div>
		</aside>

		<!-- ── feed ── -->
		<div class="flex flex-col gap-16 min-w-0">
			<!-- right now, as a timeline: a pulsing dot means it's happening at this moment -->
			<div class="flex flex-col gap-5" in:fly={rise(1)}>
				<span class={label}>right now</span>
				<ol class="relative border-l border-ocean-300/70 dark:border-ocean-700/70 ml-1.5 flex flex-col gap-9">
					{#if nowPlaying?.track && nowPlaying.isPlayingNow}
						<li class="relative pl-7" transition:slide|local={grow}>
							{#if nowPlaying.isPaused}
								<span class="absolute -left-[6px] top-1 w-[11px] h-[11px] rounded-full bg-ocean-yellow" />
							{:else}
								<span class="absolute -left-[6px] top-1 flex w-[11px] h-[11px]"><span class="absolute inset-0 rounded-full accent-bg animate-ping opacity-60" /><span class="relative w-[11px] h-[11px] rounded-full accent-bg" /></span>
							{/if}
							<div class="{label} mb-2">{nowPlaying.isPaused ? 'paused' : 'listening'} · {formatDuration(nowPlayingTime)} / {formatDuration(nowPlaying.track.duration_ms)}</div>
							<div class="flex items-center gap-4 min-w-0">
								{#if nowPlaying.track.album?.images?.[0]?.url}
									<img src={nowPlaying.track.album.images[0].url} alt="" class="w-20 h-20 rounded-lg shadow-lg shrink-0" />
								{/if}
								<div class="min-w-0 flex-1">
									<a href={nowPlaying.track.external_urls.spotify} target="_blank" rel="noopener noreferrer" class="block text-lg truncate {strong} hover:underline">{romanizedSong || nowPlaying.track.name}</a>
									<div class="truncate text-sm text-ocean-700 dark:text-ocean-300">{romanizedArtist || artistNames(nowPlaying.track.artists)} · <span class={muted}>{romanizedAlbum || nowPlaying.track.album.name}</span></div>
									<div class="mt-3 h-[3px] max-w-sm rounded-full bg-ocean-300/60 dark:bg-ocean-700/60 overflow-hidden">
										<div class="h-full rounded-full accent-bg transition-all duration-100" style="width: {(nowPlayingTime / nowPlaying.track.duration_ms) * 100}%" />
									</div>
								</div>
							</div>
						</li>
					{:else if lastTrack}
						<li class="relative pl-7" transition:slide|local={grow}>
							<span class="absolute -left-[6px] top-1 w-[11px] h-[11px] rounded-full bg-ocean-400 dark:bg-ocean-600" />
							<div class="{label} mb-2">last played{lastTrack.played_at ? ` · ${new Date(lastTrack.played_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</div>
							<div class="flex items-center gap-4 min-w-0">
								{#if lastTrack.track?.album?.images?.[0]?.url}
									<img src={lastTrack.track.album.images[0].url} alt="" class="w-14 h-14 rounded-lg shrink-0" />
								{/if}
								<div class="min-w-0">
									<a href={lastTrack.track?.external_urls?.spotify} target="_blank" rel="noopener noreferrer" class="block truncate {strong} hover:underline">{romanizedLastSong || lastTrack.track?.name}</a>
									<div class="truncate text-sm text-ocean-700 dark:text-ocean-300">{romanizedLastArtist || artistNames(lastTrack.track?.artists)}</div>
								</div>
							</div>
						</li>
					{/if}

					{#if onRepeat}
						<li class="relative pl-7" transition:slide|local={grow}>
							<span class="absolute -left-[6px] top-1 w-[11px] h-[11px] rounded-full bg-ocean-400 dark:bg-ocean-600" />
							<div class="{label} mb-2">on repeat · {onRepeat.plays} plays today</div>
							<div class="flex items-center gap-4 min-w-0">
								{#if onRepeat.image}<img src={onRepeat.image} alt="" class="w-14 h-14 rounded-lg shrink-0" />{/if}
								<div class="min-w-0">
									<a href={onRepeat.url || undefined} target="_blank" rel="noopener noreferrer" class="block truncate {strong} hover:underline">{onRepeat.name}</a>
									<div class="truncate text-sm text-ocean-700 dark:text-ocean-300">{onRepeat.artist}</div>
								</div>
							</div>
						</li>
					{/if}

					{#each visibleActivities as activity}
						{@const isTwitch = activity.name?.toLowerCase().includes('twitch') || activity.application_id === '802958789555781663'}
						{@const isOsu = isOsuActivity(activity)}
						{@const activityImg = activityImage(activity.assets?.large_image, activity.application_id)}
						{@const paused = activity.assets?.small_image?.includes('pause') || activity.assets?.small_text?.toLowerCase() === 'paused'}
						{@const twitchUrl = isTwitch ? `https://twitch.tv/${activity.state || activity.name}` : null}
						{@const osuSongName = isOsu && activity.details ? activity.details.replace(/\[.*?\]\s*$/, '').trim() : null}
						{@const osuDifficulty = isOsu && activity.details ? (activity.details.match(/\[(.+?)\]$/)?.[1] ?? null) : null}
						{@const resolvedOsuUrl = isOsu && activity.details ? osuBeatmapUrls[activity.details] : null}
						{@const osuFallbackUrl = osuSongName ? `https://osu.ppy.sh/beatmapsets?q=${encodeURIComponent(osuSongName)}` : null}
						{@const elapsed = activity.timestamps?.start ? now.getTime() - activity.timestamps.start : 0}
						{@const hours = Math.floor(elapsed / 3600000)}
						{@const minutes = Math.floor((elapsed % 3600000) / 60000)}
						{@const seconds = Math.floor((elapsed % 60000) / 1000)}
						<li class="relative pl-7" transition:slide|local={grow}>
							{#if paused}
								<span class="absolute -left-[6px] top-1 w-[11px] h-[11px] rounded-full bg-ocean-yellow" />
							{:else}
								<span class="absolute -left-[6px] top-1 flex w-[11px] h-[11px]"><span class="absolute inset-0 rounded-full accent-bg animate-ping opacity-60" /><span class="relative w-[11px] h-[11px] rounded-full accent-bg" /></span>
							{/if}
							<div class="{label} mb-2">
								{activity.type === 3 ? 'watching' : 'playing'}
								{#if paused} · paused{:else if activity.timestamps?.start} · {hours > 0 ? `${hours}:${minutes.toString().padStart(2, '0')}` : minutes}:{seconds.toString().padStart(2, '0')}{/if}
							</div>
							<div class="flex items-center gap-4 min-w-0">
								{#if activityImg}
									<img src={activityImg} alt="" class="w-16 h-16 rounded-lg shadow-lg shrink-0 object-cover" on:error={(e) => (e.currentTarget.style.display = 'none')} />
								{/if}
								<div class="min-w-0 flex-1">
									{#if twitchUrl}
										<a href={twitchUrl} target="_blank" rel="noopener noreferrer" class="text-lg {strong} hover:underline">{activity.name}</a>
									{:else}
										<div class="text-lg {strong}">{activity.name}</div>
									{/if}
									{#if activity.details}
										<div class="text-sm text-ocean-700 dark:text-ocean-300">
											{#if isOsu}{osuSongName}{#if osuDifficulty}{' '}<span class={muted}>[{osuDifficulty}]</span>{/if}{:else}{activity.details}{/if}
										</div>
									{/if}
									<div class="flex flex-wrap items-center gap-3 mt-1">
										{#if activity.state && !isTwitch}
											{#if isOsu}
												{@const watchingUser = parseWatchingUsername(activity.state)}
												{@const osuUser = watchingUser ? osuUserCache[watchingUser] : isSelfOsuState(activity.state) ? osuUserCache[OSU_SELF_USERNAME] : null}
												<div class="relative group w-fit text-sm">
													{#if watchingUser}
														<a href="https://osu.ppy.sh/users/{watchingUser}" target="_blank" rel="noopener noreferrer" class="{muted} hover:underline">{activity.state}</a>
													{:else}
														<span class="{muted} cursor-default">{activity.state}</span>
													{/if}
													{#if osuUser}
														<div class="absolute bottom-full left-0 pb-2 z-50 w-64 pointer-events-none group-hover:pointer-events-auto opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 ease-out">
															<a href="https://osu.ppy.sh/users/{osuUser.id ?? OSU_SELF_USERNAME}" target="_blank" rel="noopener noreferrer" class="block"><OsuTooltip {osuUser} /></a>
														</div>
													{/if}
												</div>
											{:else}
												<span class="text-sm {muted}">{activity.state}</span>
											{/if}
										{/if}
										{#if isOsu && (resolvedOsuUrl ?? osuFallbackUrl)}
											<a href={resolvedOsuUrl ?? osuFallbackUrl} target="_blank" rel="noopener noreferrer" class="text-xs px-2.5 py-0.5 rounded-full border border-ocean-300/70 dark:border-ocean-700/70 {muted} hover:text-ocean-900 dark:hover:text-ocean-100 hover:border-ocean-500 transition-colors">beatmap ↗</a>
										{/if}
									</div>
								</div>
							</div>
						</li>
					{/each}

					{#if codeData}
						<li class="relative pl-7" transition:slide|local={grow}>
							{#if codeData.idling}
								<span class="absolute -left-[6px] top-1 w-[11px] h-[11px] rounded-full bg-ocean-yellow" />
							{:else}
								<span class="absolute -left-[6px] top-1 flex w-[11px] h-[11px]"><span class="absolute inset-0 rounded-full accent-bg animate-ping opacity-60" /><span class="relative w-[11px] h-[11px] rounded-full accent-bg" /></span>
							{/if}
							<div class="{label} mb-2">coding{codeData.idling ? ' · idle' : ''}</div>
							{#if codeData.idling}
								<div class="text-sm {muted}">vs code is open, nothing happening</div>
							{:else}
								<div class="text-lg {strong}">{codeData.workspace}{#if codeData.branch}<span class={muted}>/{codeData.branch}</span>{/if}</div>
								<div class="text-sm {muted}">writing {codeData.lang}</div>
							{/if}
						</li>
					{/if}

					{#if homeSettings.showCurrently && (nowStatus || workingOn || happening || nextUp)}
						<li class="relative pl-7" transition:slide|local={grow}>
							<span class="absolute -left-[6px] top-1 w-[11px] h-[11px] rounded-full bg-ocean-400 dark:bg-ocean-600" />
							<div class="{label} mb-2">up to</div>
							<div class="flex flex-col gap-1 text-sm">
								{#if nowStatus}<a href="/now" class="text-lg {strong} hover:underline">{nowStatus}</a>{/if}
								{#if happening}
									<a href="/events/{happening.slug}" class="text-ocean-800 dark:text-ocean-200 hover:underline">📍 at {happening.title}{happening.location ? ` · ${happening.location}` : ''}</a>
								{/if}
								{#if workingOn}<a href="/now" class="text-ocean-700 dark:text-ocean-300 hover:underline">🔨 {workingOn}</a>{/if}
								{#if !happening && nextUp}
									<a href="/events/{nextUp.slug}" class="text-ocean-700 dark:text-ocean-300 hover:underline">
										📅 {nextUp.title} · {daysBetween(today(), nextUp.date) === 1 ? 'tomorrow' : `in ${daysBetween(today(), nextUp.date)} days`}
									</a>
								{/if}
							</div>
						</li>
					{/if}
				</ol>
			</div>

			<!-- latest post or event, as a banner -->
			{#if homeSettings.showLatest && latest}
				<!-- The whole card (title too) grows into the post's banner when it's opened. -->
				<a href={latest.href} class="group relative block overflow-hidden rounded-2xl min-h-[11rem]" data-vt="banner-{latest.slug}" in:fly={rise(2)}>
					{#if latest.banner}
						<img src={latest.banner} alt="" loading="lazy" class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
						<div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/10" />
					{:else}
						<div class="absolute inset-0 bg-ocean-200/60 dark:bg-ocean-800/60" />
					{/if}
					<div class="relative h-full min-h-[11rem] flex flex-col justify-end gap-1 p-6 {latest.banner ? 'text-white' : strong}">
						<span class="text-[11px] uppercase tracking-widest opacity-70">latest {latest.kind === 'event' ? 'event' : 'post'} · {latest.date}</span>
						<span class="text-xl sm:text-2xl group-hover:underline">{latest.title}</span>
						{#if latest.excerpt}<span class="text-sm opacity-80 truncate">{latest.excerpt}</span>{/if}
					</div>
				</a>
			{/if}

			<!-- wip / projects as a numbered index, edited in /admin → pages → home -->
			{#each groups as group, gi}
				<div class="flex flex-col gap-3" in:fly={rise(3 + gi)}>
					<div class="flex items-baseline justify-between">
						<span class={label}>{group.title}</span>
						{#if group.key === 'projects' && projectPages.length}<a href="/projects" class="text-xs {muted} hover:underline">all →</a>{/if}
					</div>
					<ol class="flex flex-col">
						{#each group.items as item, i}
							{@const internal = item.href.startsWith('/')}
							<li>
								<a
									href={item.href}
									target={internal ? undefined : '_blank'}
									rel={internal ? undefined : 'noopener noreferrer'}
									class="group grid grid-cols-[2.5rem_1fr_auto] items-baseline gap-x-2 py-4 border-t border-ocean-300/50 dark:border-ocean-700/50 transition-colors"
								>
									<span class="text-xs tabular-nums text-ocean-400 dark:text-ocean-600">{String(i + 1).padStart(2, '0')}</span>
									<span class="min-w-0">
										<span class="block text-lg {strong} transition-transform duration-300 group-hover:translate-x-1">{item.name}</span>
										{#if item.description}<span class="block text-sm {muted} transition-transform duration-300 group-hover:translate-x-1">{item.description}</span>{/if}
									</span>
									<span class="text-ocean-400 dark:text-ocean-600 group-hover:text-ocean-900 dark:group-hover:text-ocean-100 transition-colors">{internal ? '→' : '↗'}</span>
								</a>
							</li>
						{/each}
					</ol>
				</div>
			{/each}

			<!-- kwan wisdom as a pull quote, then the terminal -->
			<div class="flex flex-col gap-6" in:fly={rise(5)}>
				<figure class="flex flex-col gap-3 border-l-2 border-ocean-500/60 pl-6">
					<span class={label}>kwan wisdom</span>
					<blockquote class="text-xl sm:text-2xl leading-snug italic text-ocean-800 dark:text-ocean-200">"{currentQuote}"</blockquote>
					<figcaption class="flex items-center gap-4 text-xs {muted}">
						<span>— ryan kwan</span>
						<button on:click={newQuote} class="underline hover:text-ocean-900 dark:hover:text-ocean-100">another one</button>
					</figcaption>
				</figure>
				<Terminal />
			</div>
		</div>
	</section>
{/if}
