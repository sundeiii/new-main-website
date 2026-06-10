<svelte:head>
	<title>jashinbot</title>
	<meta name="description" content="jashinbot — twitch bot for sundeiiii_ streams. commands, features, and setup info." />
</svelte:head>

<script lang="ts">
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
</script>

<section class="p-8 sm:p-12 lg:p-24 lg:py-16 font-cascadia">
	<div class="flex flex-col gap-16">

		<!-- Hero -->
		<div class="flex flex-col gap-4">
			<div class="flex items-center gap-3">
				<span class="text-3xl">🤖</span>
				<h1 class="text-ocean-900 dark:text-ocean-100">jashinbot</h1>
			</div>
			<p class="text-ocean-600 dark:text-ocean-400 max-w-xl">
				twitch bot running on <a href="https://twitch.tv/sundeiiii_" target="_blank" rel="noopener" class="text-ocean-800 dark:text-ocean-200 underline underline-offset-2 hover:text-ocean-600 dark:hover:text-ocean-400 transition-colors">sundeiiii_</a>'s stream.
				osu! commands powered by <a href="https://github.com/tosuapp/tosu" target="_blank" rel="noopener" class="text-ocean-800 dark:text-ocean-200 underline underline-offset-2 hover:text-ocean-600 dark:hover:text-ocean-400 transition-colors">tosu</a> and the osu! API v2.
			</p>
			<div class="flex gap-3 flex-wrap">
				
					href="https://twitch.tv/sundeiiii_"
					target="_blank"
					rel="noopener"
					class="inline-flex items-center gap-2 px-4 py-2 bg-ocean-600 hover:bg-ocean-700 dark:bg-ocean-700 dark:hover:bg-ocean-600 text-white rounded transition-colors text-sm font-medium"
				>
					<span>📺</span> watch stream
				</a>
				
					href="https://osu.ppy.sh/users/sodanator"
					target="_blank"
					rel="noopener"
					class="inline-flex items-center gap-2 px-4 py-2 border border-ocean-300 dark:border-ocean-700 hover:border-ocean-500 dark:hover:border-ocean-500 text-ocean-800 dark:text-ocean-200 rounded transition-colors text-sm font-medium"
				>
					<span>🎵</span> osu! profile
				</a>
			</div>
		</div>

		<!-- Features -->
		<div class="flex flex-col gap-5">
			<h2 class="text-ocean-900 dark:text-ocean-100">features</h2>
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				{#each features as f}
					<div class="border border-ocean-200 dark:border-ocean-800 rounded-lg p-5 bg-ocean-50 dark:bg-ocean-900 flex flex-col gap-2">
						<div class="flex items-center gap-2">
							<span class="text-xl">{f.icon}</span>
							<span class="font-medium text-ocean-900 dark:text-ocean-100">{f.title}</span>
						</div>
						<p class="text-sm text-ocean-600 dark:text-ocean-400 leading-relaxed">{f.desc}</p>
					</div>
				{/each}
			</div>
		</div>

		<!-- Commands -->
		<div class="flex flex-col gap-5">
			<h2 class="text-ocean-900 dark:text-ocean-100">commands</h2>

			<!-- Category tabs -->
			<div class="flex gap-1 flex-wrap border-b border-ocean-200 dark:border-ocean-800">
				{#each categories as cat}
					<button
						on:click={() => activeCategory = cat.id}
						class="px-4 py-2 text-sm font-medium transition-colors {activeCategory === cat.id
							? 'text-ocean-900 dark:text-ocean-100 border-b-2 border-ocean-600 dark:border-ocean-400 -mb-px'
							: 'text-ocean-500 dark:text-ocean-500 hover:text-ocean-800 dark:hover:text-ocean-300'}"
					>
						{cat.label}
					</button>
				{/each}
			</div>

			{#if activeCategory === 'mod'}
				<p class="text-xs text-ocean-500 dark:text-ocean-500">mod, broadcaster and VIP only.</p>
			{/if}

			<!-- Command table -->
			<div class="flex flex-col gap-0 border border-ocean-200 dark:border-ocean-800 rounded-lg overflow-hidden">
				{#each commands[activeCategory] as cmd, i}
					<div class="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-6 px-5 py-4 {i % 2 === 0 ? 'bg-white dark:bg-ocean-900' : 'bg-ocean-50 dark:bg-ocean-950'}">
                        <div class="flex-shrink-0 w-full sm:w-64">
                            <code class="text-sm text-ocean-800 dark:text-ocean-200 font-cascadia">
                                {@html cmd.cmd + (cmd.args ? ` <span class="text-ocean-500 dark:text-ocean-500">${cmd.args}</span>` : '')}
                            </code>
                        </div>
						<div class="flex-1 flex flex-col gap-1">
							<p class="text-sm text-ocean-700 dark:text-ocean-400">{cmd.desc}</p>
							{#if cmd.example}
								<code class="text-xs text-ocean-400 dark:text-ocean-600">{cmd.example}</code>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Footer note -->
		<p class="text-xs text-ocean-400 dark:text-ocean-600">
			jashinbot is a custom node.js bot — not a public service. running locally during streams.
		</p>

	</div>
</section>