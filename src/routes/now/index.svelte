<script lang="ts">
	import { fade, fly } from 'svelte/transition';



	const lastUpdated = 'February 2026';

	const currently = {
		working: [
			'this portfolio site',
			'school projects (powershell, linux)',
		],
		learning: [
			'SvelteKit + TypeScript',
			'UI/UX design',
			'linux administration',
		],
		playing: [
			'osu! (as always)',
		],
		listening: [
			'check /music for live updates',
		],
		reading: [
			'nothing at the moment',
		],
		using: [
			'VS Code',
			'Figma',
			'Cloudflare',
		]
	};

	const sectionIcons: Record<string, string> = {
		working: '🔨',
		learning: '📚',
		playing: '🎮',
		listening: '🎵',
		reading: '📖',
		using: '🛠️'
	};
</script>

<svelte:head>
	<title>now</title>
</svelte:head>

<section
	class="p-8 sm:p-12 lg:p-24 lg:py-16 font-cascadia"
	in:fade={{ duration: 200 }}
>
	<div class="max-w-2xl mx-auto">
		<div in:fly={{ y: 20, duration: 300 }}>
			<h1 class="text-2xl sm:text-3xl text-ocean-900 dark:text-ocean-100 mb-2">now</h1>
			<p class="text-ocean-500 dark:text-ocean-400 text-sm mb-8">
				what i'm up to right now · last updated {lastUpdated}
			</p>
			<p class="text-ocean-600 dark:text-ocean-300 text-sm mb-8">
				this is a <a href="https://nownownow.com/about" target="_blank" rel="noopener noreferrer" class="text-ocean-cyan hover:underline">/now page</a>. if you have your own site, you should make one too.
			</p>
		</div>

		<div class="space-y-6">
			{#each Object.entries(currently) as [section, items], i}
				<div
					class="bg-ocean-100/50 dark:bg-ocean-800/30 rounded-lg p-5 border border-ocean-200/50 dark:border-ocean-700/30"
					in:fly={{ y: 20, duration: 300, delay: 100 + i * 80 }}
				>
					<h2 class="text-ocean-900 dark:text-ocean-100 text-base mb-3 flex items-center gap-2">
						<span>{sectionIcons[section] || '·'}</span>
						<span>{section}</span>
					</h2>
					<ul class="space-y-1.5">
						{#each items as item}
							<li class="text-ocean-700 dark:text-ocean-300 text-sm flex items-start gap-2">
								<span class="text-ocean-400 dark:text-ocean-500 mt-0.5">›</span>
								<span>{item}</span>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>

		<div
			class="mt-8 text-ocean-400 dark:text-ocean-500 text-xs text-center"
			in:fly={{ y: 20, duration: 300, delay: 700 }}
		>
			inspired by <a href="https://sive.rs/nowff" target="_blank" rel="noopener noreferrer" class="text-ocean-cyan hover:underline">Derek Sivers</a>
		</div>
	</div>
</section>
