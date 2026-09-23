<script lang="ts">
	import { goto } from '$app/navigation';
	import { fly, fade } from 'svelte/transition';

	let input = '';
	let history: { command: string; output: string; isHtml?: boolean }[] = [];
	let inputEl: HTMLInputElement;
	let terminalEl: HTMLDivElement;

	const commands: Record<string, { description: string; hidden?: boolean; action: (args?: string) => string | { text: string; html: boolean } }> = {
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

		const command = commands[cmd];
		if (command) {
			const result = command.action(args);
			if (typeof result === 'object' && result.html) {
				if (result.text) {
					history = [...history, { command: trimmed, output: result.text, isHtml: true }];
				} else {
					history = [...history, { command: trimmed, output: '' }];
				}
			} else if (typeof result === 'string' && result) {
				history = [...history, { command: trimmed, output: result }];
			} else {
				history = [...history, { command: trimmed, output: '' }];
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
