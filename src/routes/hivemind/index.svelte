<script lang="ts">
	// A thank-you page: two screenshots from the hivemind.
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { app } from '$lib/components/site/app';

	const images = [
		{ src: 'https://sundei.ee/hivemind1.png', alt: 'hivemind 1' },
		{ src: 'https://sundei.ee/hivemind2.png', alt: 'hivemind 2' }
	];

	const rise = (i: number) => (app.hydrated ? { y: 12, duration: 500, delay: 60 + i * 70, easing: cubicOut } : { duration: 0 });
	const muted = 'text-ocean-600 dark:text-ocean-400';
	const strong = 'text-ocean-900 dark:text-ocean-100';
</script>

<svelte:head>
	<title>hivemind</title>
	<meta property="og:title" content="hivemind" />
	<meta name="description" content="thanks for boosting my mood <3" />
	<meta property="og:description" content="thanks for boosting my mood <3" />
</svelte:head>

<section class="px-8 sm:px-12 lg:px-24 pt-8 sm:pt-12 pb-4 font-cascadia flex flex-col gap-10 max-w-6xl">
	<header in:fly={rise(0)}>
		<h1 class="text-3xl {strong}">hivemind</h1>
		<p class="text-sm {muted} mt-2">thanks for boosting my mood &lt;3</p>
	</header>

	<div class="grid gap-4 md:grid-cols-2" in:fly={rise(1)}>
		{#each images as img}
			<a href={img.src} target="_blank" rel="noopener noreferrer" class="group glass rounded-2xl border border-ocean-300/50 dark:border-ocean-700/50 p-2 overflow-hidden">
				<img src={img.src} alt={img.alt} class="w-full max-h-[600px] object-contain rounded-xl transition-transform duration-300 group-hover:scale-[1.02]" />
			</a>
		{/each}
	</div>
</section>
