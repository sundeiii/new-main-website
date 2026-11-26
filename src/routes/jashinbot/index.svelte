<svelte:head>
	<title>jashinbot</title>
	<meta property="og:title" content="jashinbot" />
	<meta name="description" content="jashinbot: the twitch bot on my streams. commands, features and how it works." />
	<meta property="og:description" content="jashinbot: the twitch bot on my streams. commands, features and how it works." />
</svelte:head>

<script lang="ts">
	// jashinbot, the twitch bot on my streams: what it does and every command.
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { app } from '$lib/components/site/app';

	let activeCategory = 'osu';

	const categories = [
		{ id: 'osu', label: 'osu!' },
		{ id: 'queue', label: 'queue' },
		{ id: 'spotify', label: 'spotify' },
		{ id: 'chat', label: 'chat' },
		{ id: 'mod', label: 'mod only' },
	];

	type Command = {
		cmd: string;
		args?: string;
		desc: string;
		example?: string;
	};

	const commands: Record<string, Command[]> = {
		osu: [
			{ cmd: '!np',        desc: 'shows the current map with SR, AR, OD and a link', example: '!np' },
			{ cmd: '!pp',        desc: 'current, FC and SS pp values for the map in play', example: '!pp' },
			{ cmd: '!rs',        desc: 'most recent score including fails', example: '!rs' },
			{ cmd: '!recent',    args: '[username]', desc: "another player's most recent score", example: '!recent vaxei' },
			{ cmd: '!top',       args: '[n]',        desc: 'top n scores (max 5, default 3)', example: '!top 5' },
			{ cmd: '!rank',      args: '[username]', desc: 'rank, pp, accuracy and playcount', example: '!rank sodanator' },
			{ cmd: '!score',     desc: 'personal best on the current map', example: '!score' },
			{ cmd: '!pb',        desc: 'alias for !score', example: '!pb' },
			{ cmd: '!compare',   args: '[username]', desc: 'compare a viewer\'s score on the current map', example: '!compare cookiezi' },
			{ cmd: '!when',      desc: 'estimates FC chance based on recent pass rate', example: '!when' },
			{ cmd: '!mods',      desc: 'current active mods', example: '!mods' },
			{ cmd: '!mapper',    desc: 'mapper of the current map with their profile link', example: '!mapper' },
			{ cmd: '!misscount', desc: 'current miss count mid-play', example: '!misscount' },
			{ cmd: '!ur',        desc: 'current unstable rate', example: '!ur' },
			{ cmd: '!attempts',  args: '[add|reset]', desc: 'attempt counter for the current map, resets on map change', example: '!attempts' },
			{ cmd: '!fc',        args: '[add|reset]', desc: 'FC counter for the current map, resets on map change', example: '!fc' },
			{ cmd: '!recommend', desc: 'suggests a map at similar SR — checks queue first, then osu! search', example: '!recommend' },
		],
		queue: [
			{ cmd: '!req',       args: '<url>',      desc: 'request a beatmap by osu! URL (max 2 per person)', example: '!req https://osu.ppy.sh/beatmapsets/123' },
			{ cmd: '!queue',     desc: 'shows the first 5 maps in the request queue', example: '!queue' },
			{ cmd: '!remove',    desc: 'remove your last request from the queue', example: '!remove' },
		],
		spotify: [
			{ cmd: '!song',      desc: 'currently playing track on Spotify', example: '!song' },
			{ cmd: '!lastsong',  desc: 'last played track', example: '!lastsong' },
			{ cmd: '!sr',        args: '<song or url>', desc: 'request a song by name or Spotify URL (30s cooldown)', example: '!sr blue zenith' },
			{ cmd: '!sq',        desc: 'shows the song request queue', example: '!sq' },
			{ cmd: '!removesong',desc: 'remove your last song request', example: '!removesong' },
		],
		chat: [
			{ cmd: '!commands',  args: '[page]',     desc: 'paginated command list, 5 per page', example: '!commands 2' },
			{ cmd: '!np',        desc: 'also usable as a quick map link in chat', example: '!np' },
			{ cmd: '!uptime',    desc: 'how long the stream has been live', example: '!uptime' },
			{ cmd: '!followage', args: '[username]', desc: 'how long a user has been following', example: '!followage' },
			{ cmd: '!lurk',      desc: 'go into lurk mode', example: '!lurk' },
			{ cmd: '!unlurk',    desc: 'come back from lurk', example: '!unlurk' },
			{ cmd: '!clip',      desc: 'create a clip of the current stream moment', example: '!clip' },
			{ cmd: '!quote',     args: '[n|add|del|search]', desc: 'random quote, or look one up by number or keyword', example: '!quote search funny' },
			{ cmd: '!translate', args: '<text>',     desc: 'translate any text to english', example: '!translate arigatou' },
			{ cmd: '!ping',      desc: 'check if the bot is alive', example: '!ping' },
			{ cmd: '!botinfo',   desc: 'bot uptime and number of registered commands', example: '!botinfo' },
		],
		mod: [
			{ cmd: '!open / !close',   desc: 'open or close the map request queue' },
			{ cmd: '!skip',            desc: 'skip to the next map in queue' },
			{ cmd: '!clearqueue',      desc: 'clear all maps from the queue' },
			{ cmd: '!skipsong',        desc: 'skip the current Spotify track' },
			{ cmd: '!clearsr',         desc: 'clear the song request queue' },
			{ cmd: '!title <text>',    desc: 'update stream title' },
			{ cmd: '!game <name>',     desc: 'update stream category' },
			{ cmd: '!marker [label]',  desc: 'drop a stream marker in the VOD' },
			{ cmd: '!raid <channel>',  desc: 'raid another channel' },
			{ cmd: '!prediction <title> <opt1> <opt2>', desc: 'create a channel points prediction' },
			{ cmd: '!endprediction <win|loss|cancel>',  desc: 'resolve the active prediction' },
			{ cmd: '!poll <title> | <opt1> | <opt2>',   desc: 'create a Twitch poll' },
			{ cmd: '!endpoll',         desc: 'end the active poll early' },
			{ cmd: '!vip / !unvip',    desc: 'add or remove a VIP' },
			{ cmd: '!pin <username>',  desc: "pin that user's most recent message" },
			{ cmd: '!unpin',           desc: 'unpin the current pinned message' },
			{ cmd: '!warn <user>',     desc: 'warn a user (auto-bans at 3 warnings)' },
			{ cmd: '!to <user> [s]',   desc: 'timeout a user for n seconds' },
			{ cmd: '!ban / !unban',    desc: 'ban or unban a user' },
			{ cmd: '!permit <user>',   desc: 'allow a user to post one link' },
			{ cmd: '!remind <t> <msg>',desc: 'post a timed reminder to chat (e.g. !remind 10m back soon!)' },
			{ cmd: '!so / !shoutout',  desc: 'shoutout another streamer' },
			{ cmd: '!addcmd / !delcmd / !editcmd', desc: 'manage custom text commands' },
			{ cmd: '!quote add / del', desc: 'add or delete quotes' },
			{ cmd: '!slowmode <s>',    desc: 'enable slow mode for n seconds' },
			{ cmd: '!emoteonly [off]', desc: 'toggle emote-only mode' },
			{ cmd: '!subonly [off]',   desc: 'toggle sub-only mode' },
		],
	};

	const features = [
		{
			icon: '🎵',
			title: 'osu! integration',
			desc: 'live map info via tosu — SR, AR, OD, mods, pp values, and attempt tracking all update in real time as you play.'
		},
		{
			icon: '📋',
			title: 'map request queue',
			desc: 'viewers request maps by osu! URL. max 2 per person, 20 in queue total. mods can reorder, skip, and clear from the dashboard.'
		},
		{
			icon: '🎧',
			title: 'spotify requests',
			desc: 'viewers request songs by name or Spotify URL. adds directly to the playback queue. optional sub-only mode.'
		},
		{
			icon: '🛡️',
			title: 'automod',
			desc: 'link filter with permit system, caps filter, phrase banlist, and escalating warn → timeout → ban system.'
		},
		{
			icon: '📊',
			title: 'twitch tools',
			desc: 'polls, predictions, raids, VIP management, stream markers, followage, clips — all from chat or the dashboard.'
		},
		{
			icon: '🖥️',
			title: 'stream dashboard',
			desc: 'local web dashboard with live chat, mod log, queue management, Spotify controls, and stream stats.'
		},
	];

	const rise = (i: number) => (app.hydrated ? { y: 12, duration: 500, delay: 60 + i * 70, easing: cubicOut } : { duration: 0 });
	const label = 'text-[11px] uppercase tracking-widest text-ocean-500';
	const muted = 'text-ocean-600 dark:text-ocean-400';
	const strong = 'text-ocean-900 dark:text-ocean-100';
	const card = 'glass rounded-2xl border border-ocean-300/50 dark:border-ocean-700/50';
	const segment = 'flex flex-wrap gap-1 p-1 rounded-full glass border border-ocean-300/50 dark:border-ocean-700/50 text-xs w-fit';
	const segBtn = (on: boolean) => `px-3 py-1 rounded-full transition-colors ${on ? 'accent-soft ' + strong : muted + ' hover:text-ocean-900 dark:hover:text-ocean-100'}`;
</script>

<section class="px-8 sm:px-12 lg:px-24 pt-8 sm:pt-12 pb-4 font-cascadia flex flex-col gap-14 max-w-6xl">
	<header class="flex flex-col gap-4" in:fly={rise(0)}>
		<div>
			<h1 class="text-3xl {strong}">jashinbot <span class="text-2xl">🤖</span></h1>
			<p class="text-sm {muted} mt-2 max-w-xl">
				the twitch bot on <a href="https://twitch.tv/sundeiiii_" target="_blank" rel="noopener noreferrer" class="underline underline-offset-2 {strong}">sundeiiii_</a>'s streams.
				osu! commands are powered by <a href="https://github.com/tosuapp/tosu" target="_blank" rel="noopener noreferrer" class="underline underline-offset-2 {strong}">tosu</a> and the osu! api v2.
			</p>
		</div>
		<div class="flex gap-2 flex-wrap text-sm">
			<a href="https://twitch.tv/sundeiiii_" target="_blank" rel="noopener noreferrer" class="px-4 py-2 rounded-full accent-bg transition-opacity hover:opacity-90">📺 watch the stream</a>
			<a href="https://osu.ppy.sh/users/sodanator" target="_blank" rel="noopener noreferrer" class="px-4 py-2 rounded-full {card} {strong} hover:opacity-90">osu! profile</a>
		</div>
	</header>

	<div class="flex flex-col gap-3" in:fly={rise(1)}>
		<span class={label}>features</span>
		<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each features as f}
				<div class="{card} p-4 flex flex-col gap-2">
					<span class="text-sm {strong}"><span class="mr-1.5">{f.icon}</span>{f.title}</span>
					<p class="text-sm {muted} leading-relaxed">{f.desc}</p>
				</div>
			{/each}
		</div>
	</div>

	<div class="flex flex-col gap-4" in:fly={rise(2)}>
		<span class={label}>commands</span>
		<div class={segment}>
			{#each categories as cat}<button on:click={() => (activeCategory = cat.id)} class={segBtn(activeCategory === cat.id)}>{cat.label}</button>{/each}
		</div>
		{#if activeCategory === 'mod'}<p class="text-xs {muted}">mods, the broadcaster and VIPs only.</p>{/if}
		<dl class="{card} px-4">
			{#each commands[activeCategory] as cmd, i}
				<div class="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-6 py-3 {i ? 'border-t border-ocean-300/50 dark:border-ocean-700/50' : ''}">
					<dt class="sm:w-64 shrink-0 text-sm"><code class={strong}>{cmd.cmd}</code>{#if cmd.args}<code class="text-ocean-500"> {cmd.args}</code>{/if}</dt>
					<dd class="flex-1 min-w-0 flex flex-col gap-0.5">
						<span class="text-sm {muted}">{cmd.desc}</span>
						{#if cmd.example}<code class="text-xs text-ocean-500">{cmd.example}</code>{/if}
					</dd>
				</div>
			{/each}
		</dl>
	</div>

	<p class="text-xs text-ocean-500">jashinbot is a custom node.js bot, not a public service. it runs on my pc during streams.</p>
</section>
