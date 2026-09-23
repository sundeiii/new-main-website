<script context="module" lang="ts">
	import type { Load } from '@sveltejs/kit';

	// Project pages, written in /admin → blog as kind "project".
	export const load: Load = async ({ fetch }) => {
		const res = await fetch('/api/blog?kind=project');
		return { props: { projects: res.ok ? await res.json() : [] } };
	};
</script>

<script lang="ts">
	import { fly } from 'svelte/transition';

	export let projects: { slug: string; title: string; excerpt: string; banner: string | null; link: string | null }[];
</script>

<svelte:head>
	<title>projects</title>
	<meta property="og:title" content="projects" />
	<meta name="description" content="things i've made" />
	<meta property="og:description" content="things i've made" />
</svelte:head>

<section class="p-8 sm:p-12 lg:p-24 lg:py-16 font-cascadia">
	<div class="flex flex-col gap-7">
		<div in:fly={{ y: -20, duration: 400 }}>
			<h1 class="text-ocean-900 dark:text-ocean-100">projects</h1>
			<p class="text-ocean-700 dark:text-ocean-400">questionable little things i've made</p>
		</div>

		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each projects as project, i}
				<a
					href="/projects/{project.slug}"
					class="group border border-ocean-300 dark:border-ocean-700 rounded-lg overflow-hidden hover:border-ocean-400 dark:hover:border-ocean-600 transition-colors flex flex-col"
					in:fly={{ y: 20, duration: 400, delay: 100 + i * 60 }}
				>
					<div class="aspect-video bg-ocean-200/50 dark:bg-ocean-800/50 overflow-hidden">
						{#if project.banner}
							<img src={project.banner} alt="" loading="lazy" decoding="async" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
						{:else}
							<div class="w-full h-full flex items-center justify-center text-3xl text-ocean-500">⌨</div>
						{/if}
					</div>
					<div class="p-4">
						<h2 class="text-ocean-900 dark:text-ocean-100 group-hover:underline">{project.title}</h2>
						{#if project.excerpt}<p class="text-ocean-700 dark:text-ocean-400 text-sm mt-1">{project.excerpt}</p>{/if}
					</div>
				</a>
			{:else}
				<p class="text-ocean-700 dark:text-ocean-400">no project pages yet</p>
			{/each}
		</div>
	</div>
</section>
