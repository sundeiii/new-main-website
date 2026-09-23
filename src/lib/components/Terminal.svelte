<script lang="ts">
	import { goto } from '$app/navigation';
	import { fly, fade } from 'svelte/transition';
	import { eventTiming, today as todayDate } from '$lib/dates';

	let input = '';
	let history: { command: string; output: string; isHtml?: boolean }[] = [];
	let inputEl: HTMLInputElement;
	let terminalEl: HTMLDivElement;

	type Output = string | { text: string; html: boolean };

	// Pages `random`, `ls` and `cd` know about.
	const PAGES = ['about', 'blog', 'tournaments', 'gallery', 'music', 'guestbook', 'events', 'projects', 'osu', 'now', 'changelog', 'skins', 'uses'];

	const getJson = async (url: string) => {
		const res = await fetch(url);
		if (!res.ok) throw new Error(`${res.status}`);
		return res.json();
	};
	const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

	const commands: Record<string, { description: string; hidden?: boolean; action: (args?: string) => Output | Promise<Output> }> = {
		help: {
			description: 'show available commands',
			action: () => {
				const lines = Object.entries(commands)
					.filter(([, cmd]) => !cmd.hidden)
					.map(([name, cmd]) => `  <span class="text-ocean-green">${name.padEnd(12)}</span> <span class="text-ocean-400 dark:text-ocean-400">${cmd.description}</span>`)
					.join('\n');
				return { text: `available commands:\n${lines}`, html: true };
			}
		},
		about: {
			description: 'who am i?',
			action: () => {
				setTimeout(() => goto('/about'), 500);
				return 'navigating to /about...';
			}
		},
		projects: {
			description: 'view my projects',
			action: () => {
				const projects = [
					{ name: 'scripts', desc: 'powershell scripts (school)' },
					{ name: 'titanic wiki', desc: 'contributions in estonian and dutch' },
					{ name: 'linux scripts', desc: 'school forces me to suffer' },
					{ name: 'where is my bus lol', desc: 'tartu bussiajad, but website' },
					{ name: 'fonoteek', desc: 'object-oriented programming stuff' }
				];
				const lines = projects
					.map(p => `  <span class="text-ocean-cyan">${p.name.padEnd(24)}</span> <span class="text-ocean-400">${p.desc}</span>`)
					.join('\n');
				return { text: `projects:\n${lines}`, html: true };
			}
		},
		stats: {
			description: 'go to stats page',
			action: () => {
				setTimeout(() => goto('/stats'), 500);
				return 'navigating to /stats...';
			}
		},
		music: {
			description: 'go to music page',
			action: () => {
				setTimeout(() => goto('/music'), 500);
				return 'navigating to /music...';
			}
		},
		blog: {
			description: 'go to blog',
			action: () => {
				setTimeout(() => goto('/blog'), 500);
				return 'navigating to /blog...';
			}
		},
		tournaments: {
			description: 'go to tournaments',
			action: () => {
				setTimeout(() => goto('/tournaments'), 500);
				return 'navigating to /tournaments...';
			}
		},
		gallery: {
			description: 'go to gallery',
			action: () => {
				setTimeout(() => goto('/gallery'), 500);
				return 'navigating to /gallery...';
			}
		},
		guestbook: {
			description: 'go to guestbook',
			action: () => {
				setTimeout(() => goto('/guestbook'), 500);
				return 'navigating to /guestbook...';
			}
		},
		echo: {
			description: 'echo a message',
			action: (args) => args || ''
		},
		clear: {
			description: 'clear the terminal',
			action: () => {
				history = [];
				return '';
			}
		},
		whoami: {
			description: 'display current user',
			action: () => 'visitor@kwanmindset'
		},
		date: {
			description: 'show current date',
			action: () => new Date().toLocaleString()
		},
		neofetch: {
			description: 'system info',
			action: () => {
				return {
					text: `<span class="text-ocean-cyan">       ___</span>        <span class="text-ocean-green">visitor</span>@<span class="text-ocean-green">kwanmindset</span>
<span class="text-ocean-cyan">      (.. |</span>       ──────────────
<span class="text-ocean-cyan">      (<span class="text-ocean-yellow">__</span> |</span>       <span class="text-ocean-magenta">OS:</span> kwanmindset
<span class="text-ocean-cyan">     / ..  \\</span>      <span class="text-ocean-magenta">Host:</span> Cloudflare
<span class="text-ocean-cyan">    / /  \\  \\</span>     <span class="text-ocean-magenta">Kernel:</span> SvelteKit
<span class="text-ocean-cyan">   (_/    \\_)</span>     <span class="text-ocean-magenta">Shell:</span> terminal.svelte
<span class="text-ocean-cyan">  / /  ||  \\ \\</span>    <span class="text-ocean-magenta">Theme:</span> ocean
<span class="text-ocean-cyan"> | /   ||   \\ |</span>   <span class="text-ocean-magenta">Font:</span> CaskaydiaCove NF`,
					html: true
				};
			}
		},
		quote: {
			description: 'kwan wisdom',
			action: () => {
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
				const q = kwanMindset[Math.floor(Math.random() * kwanMindset.length)];
				return { text: `<span class="text-ocean-yellow">💬 kwan wisdom:</span>\n<span class="text-ocean-100 italic">  "${q}"</span>`, html: true };
			}
		},
		now: {
			description: 'what am i up to?',
			action: () => {
				setTimeout(() => goto('/now'), 500);
				return 'navigating to /now...';
			}
		},
		typing: {
			description: 'typing speed test',
			action: () => {
				setTimeout(() => goto('/typing'), 500);
				return 'navigating to /typing...';
			}
		},
		osu: {
			description: 'my osu! stats',
			action: async () => {
				const { username } = await getJson('/api/site/osu');
				const u = await getJson(`/api/osu-user?u=${encodeURIComponent(username)}`);
				if (!u) return `couldn't find ${username} on osu! right now`;
				const n = (x: number | null) => (x == null ? '–' : Math.round(x).toLocaleString('en-US'));
				return {
					text: `${u.team?.short_name ? `<span class="text-ocean-400">[${esc(u.team.short_name)}]</span> ` : ''}<span class="text-ocean-magenta">${esc(u.username)}</span> · #${n(u.global_rank)} global · #${n(u.country_rank)} ${esc(u.country_code ?? '')} · ${n(u.pp)}pp
<span class="text-ocean-400">more at /osu</span>`,
					html: true
				};
			}
		},
		song: {
			description: "what i'm listening to",
			action: async () => {
				const np = await getJson('/api/now-playing');
				if (!np.track) return 'silence. for now.';
				const artists = np.track.artists.map((a: any) => a.name).join(', ');
				const label = np.isPlayingNow && !np.isPaused ? '▶ now playing' : '⏸ last played';
				return { text: `<span class="text-ocean-green">${label}:</span> ${esc(np.track.name)} – ${esc(artists)}`, html: true };
			}
		},
		lan: {
			description: 'next event',
			action: async () => {
				const events: { slug: string; title: string; date: string; endDate: string | null; location: string | null }[] = await getJson('/api/blog?kind=event');
				const now = events.find((e) => eventTiming(e) === 'now');
				if (now) return { text: `<span class="text-ocean-green">📍 currently at ${esc(now.title)}!</span>${now.location ? ` · ${esc(now.location)}` : ''}`, html: true };
				const today = todayDate();
				const next = events.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
				if (!next) return 'no events planned. touch grass maybe?';
				const days = Math.round((new Date(next.date + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / 864e5);
				const when = days === 0 ? 'today!!' : days === 1 ? 'tomorrow' : `in ${days} days`;
				return {
					text: `<span class="text-ocean-yellow">${esc(next.title)}</span> ${when}${next.location ? ` · ${esc(next.location)}` : ''}
<span class="text-ocean-400">details: /events/${esc(next.slug)}</span>`,
					html: true
				};
			}
		},
		lastfm: {
			description: 'my listening stats',
			action: async () => {
				const s = await getJson('/api/lastfm-stats?period=7day');
				const n = (x: number) => x.toLocaleString('en-US');
				const top = s.topArtists?.[0];
				return {
					text: [
						`<span class="text-ocean-green">${n(s.total)}</span> scrobbles since ${new Date(s.since).getFullYear()}`,
						`${n(s.last7d)} this week · ${n(s.last24h)} today-ish`,
						top ? `top artist this week: <span class="text-ocean-magenta">${esc(top.name)}</span> (${n(top.plays)})` : ''
					]
						.filter(Boolean)
						.join('\n'),
					html: true
				};
			}
		},
		events: {
			description: 'lans & events',
			action: async () => {
				const list: { slug: string; title: string; date: string; endDate: string | null }[] = await getJson('/api/blog?kind=event');
				if (!list.length) return 'no events yet';
				const rows = [...list]
					.sort((a, b) => b.date.localeCompare(a.date))
					.slice(0, 6)
					.map((e) => {
						const t = eventTiming(e);
						const tag = t === 'now' ? '<span class="text-ocean-green">now</span>' : t === 'upcoming' ? '<span class="text-ocean-yellow">soon</span>' : '<span class="text-ocean-400">past</span>';
						return `  ${tag}  ${e.date}  <span class="text-ocean-cyan">${esc(e.title)}</span>`;
					});
				return { text: ['events:', ...rows, '<span class="text-ocean-400">more at /events</span>'].join('\n'), html: true };
			}
		},
		cat: {
			description: 'read a file',
			hidden: true,
			action: async (args) => {
				const file = (args || '').trim().toLowerCase();
				if (file === 'about.txt') {
					const about = await getJson('/api/site/about');
					// Markdown → plain text, good enough for a terminal
					return about.bio.replace(/[#*_`>]/g, '').replace(/\[(.*?)\]\(.*?\)/g, '$1').trim();
				}
				if (file === 'now.txt') {
					const now = await getJson('/api/site/now');
					return now.sections.map((s: any) => `${s.icon} ${s.title}: ${s.items.join(', ')}`).join('\n');
				}
				return file ? `cat: ${file}: no such file (try ls)` : 'cat: what file? (try ls)';
			}
		},
		secret: {
			description: 'shh',
			hidden: true,
			action: () => "not everything shows up in 'help'. the good one is only two letters long 👀"
		},
		random: {
			description: 'take me somewhere',
			action: async () => {
				const posts: { slug: string }[] = await getJson('/api/blog').catch(() => []);
				const targets = [...PAGES.map((p) => `/${p}`), ...posts.map((p) => `/blog/${p.slug}`)];
				const target = targets[Math.floor(Math.random() * targets.length)];
				setTimeout(() => goto(target), 600);
				return `🎲 rolling... ${target}`;
			}
		},
		ls: {
			description: 'list pages',
			hidden: true,
			action: () => [...PAGES.map((p) => `${p}/`), 'about.txt', 'now.txt'].join('  ')
		},
		cd: {
			description: 'go to a page',
			hidden: true,
			action: (args) => {
				const target = (args || '').replace(/^\/|\/$/g, '');
				if (!target || target === '~' || target === '..') return 'you are already home';
				if (!PAGES.includes(target)) return `cd: ${target}: no such directory (try ls)`;
				setTimeout(() => goto(`/${target}`), 300);
				return `navigating to /${target}...`;
			}
		},
		sudo: {
			description: 'nice try',
			hidden: true,
			action: () => 'visitor is not in the sudoers file. this incident will be reported to kwan.'
		},
		rm: {
			description: 'no',
			hidden: true,
			action: () => 'rm: cannot remove: this website is load-bearing'
		},
		coffee: {
			description: 'brew',
			hidden: true,
			action: () => "☕ brewing... error 418: i'm a teapot"
		},
		kwan: {
			description: 'kwan',
			hidden: true,
			action: () => commands.quote.action()
		},
		exit: {
			description: 'leave',
			hidden: true,
			action: () => 'there is no escape. you live here now.'
		},
		hello: {
			description: 'hi',
			hidden: true,
			action: () => 'hiii :3'
		},
		tf: {
			description: 'secret :3',
			hidden: true,
			action: () => {
				// The layout owns the theme; it listens for this and toggles the trans theme.
				const on = !document.documentElement.classList.contains('trans');
				window.dispatchEvent(new CustomEvent('trans-theme', { detail: on }));
				const flag = ['#5BCEFA', '#F5A9B8', '#FFFFFF', '#F5A9B8', '#5BCEFA']
					.map((c) => `<span style="color: ${c}">██████</span>`)
					.join('');
				return on
					? {
							text: [
								flag,
								'<span style="color: #F5A9B8">trans rights are human rights 🏳️‍⚧️</span>',
								'<span class="text-ocean-400">theme unlocked :3 (type tf again to switch back)</span>'
							].join('\n'),
							html: true
						}
					: 'back to the regular theme. the trans theme stays in the theme picker :3';
			}
		},
		reaction: {
			description: 'reaction time test',
			action: () => {
				setTimeout(() => goto('/reaction'), 500);
				return 'navigating to /reaction...';
			}
		}
	};

	function handleSubmit() {
		const trimmed = input.trim();
		if (!trimmed) return;

		const parts = trimmed.split(' ');
		const cmd = parts[0].toLowerCase();
		const args = parts.slice(1).join(' ');

		const command = commands[cmd === 'hi' ? 'hello' : cmd];
		if (command) {
			const toEntry = (result: Output) =>
				typeof result === 'object' ? { command: trimmed, output: result.text, isHtml: result.html && !!result.text } : { command: trimmed, output: result || '' };
			let result: Output | Promise<Output>;
			try {
				result = command.action(args);
			} catch {
				result = 'something broke. oops';
			}
			if (result instanceof Promise) {
				// Show a placeholder, then fill in the answer when it arrives.
				const index = history.length;
				history = [...history, { command: trimmed, output: '…' }];
				result
					.catch(() => "couldn't reach the server. try again later")
					.then((r) => {
						history[index] = toEntry(r);
						history = history;
						setTimeout(() => terminalEl && (terminalEl.scrollTop = terminalEl.scrollHeight), 10);
					});
			} else {
				history = [...history, toEntry(result)];
			}
		} else {
			history = [...history, { command: trimmed, output: `command not found: ${cmd}. type 'help' for available commands.` }];
		}

		input = '';

		// Scroll to bottom
		setTimeout(() => {
			if (terminalEl) {
				terminalEl.scrollTop = terminalEl.scrollHeight;
			}
		}, 10);
	}

	function focusInput() {
		inputEl?.focus();
	}
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
	class="border border-ocean-300 dark:border-ocean-700 rounded-lg overflow-hidden w-full sm:w-96"
	on:click={focusInput}
>
	<!-- Title bar -->
	<div class="flex items-center gap-2 px-3 py-2 bg-ocean-200/50 dark:bg-ocean-800/50 border-b border-ocean-300 dark:border-ocean-700">
		<div class="flex gap-1.5">
			<span class="w-2.5 h-2.5 rounded-full bg-ocean-red/70"></span>
			<span class="w-2.5 h-2.5 rounded-full bg-ocean-yellow/70"></span>
			<span class="w-2.5 h-2.5 rounded-full bg-ocean-green/70"></span>
		</div>
		<span class="text-ocean-600 dark:text-ocean-500 text-[10px] flex-1 text-center">visitor@kwanmindset</span>
	</div>

	<!-- Terminal body -->
	<div
		bind:this={terminalEl}
		class="p-3 max-h-64 overflow-y-auto bg-ocean-100/30 dark:bg-ocean-900/30 font-cascadia text-xs leading-relaxed"
	>
		<!-- Welcome message -->
		<div class="text-ocean-600 dark:text-ocean-500 mb-2">
			welcome to my site — type <span class="text-ocean-green">'help'</span> for commands
		</div>

		<!-- History -->
		{#each history as entry}
			<div class="mb-1">
				<div>
					<span class="text-ocean-green">visitor</span><span class="text-ocean-600 dark:text-ocean-500">@</span><span class="text-ocean-cyan">kwanmindset</span>
					<span class="text-ocean-600 dark:text-ocean-500">$</span>
					<span class="text-ocean-900 dark:text-ocean-100 ml-1">{entry.command}</span>
				</div>
				{#if entry.output}
					<div class="text-ocean-800 dark:text-ocean-300 whitespace-pre-wrap {entry.isHtml ? '' : ''}">
						{#if entry.isHtml}
							{@html entry.output}
						{:else}
							{entry.output}
						{/if}
					</div>
				{/if}
			</div>
		{/each}

		<!-- Current input line -->
		<div class="flex items-center">
			<span class="text-ocean-green">visitor</span><span class="text-ocean-600 dark:text-ocean-500">@</span><span class="text-ocean-cyan">kwanmindset</span>
			<span class="text-ocean-600 dark:text-ocean-500 ml-0">$</span>
			<form on:submit|preventDefault={handleSubmit} class="flex-1 ml-1">
				<input
					bind:this={inputEl}
					bind:value={input}
					type="text"
					class="w-full bg-transparent text-ocean-900 dark:text-ocean-100 outline-none caret-ocean-green placeholder-ocean-600 dark:placeholder-ocean-600"
					placeholder=""
					spellcheck="false"
					autocomplete="off"
				/>
			</form>
		</div>
	</div>
</div>
