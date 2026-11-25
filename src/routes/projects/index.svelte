<script context="module" lang="ts">
	// Project pages (written in /admin → blog as kind "project"), the first one big.
	import type { Load } from '@sveltejs/kit';

	// Project pages, written in /admin → blog as kind "project".
	export const load: Load = async ({ fetch }) => {
		const res = await fetch('/api/blog?kind=project');
		return { props: { projects: res.ok ? await res.json() : [] } };
	};
</script>

<script lang="ts">
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { app } from '$lib/components/site/app';

	export let projects: { slug: string; title: string; excerpt: string; banner: string | null; link: string | null }[];

	const rise = (i: number) => (app.hydrated ? { y: 12, duration: 500, delay: 60 + i * 60, easing: cubicOut } : { duration: 0 });
	const muted = 'text-ocean-600 dark:text-ocean-400';
	const strong = 'text-ocean-900 dark:text-ocean-100';
</script>

<svelte:head>
	<title>projects</title>
	<meta property="og:title" content="projects" />
	<meta name="description" content="things i've made" />
	<meta property="og:description" content="things i've made" />
</svelte:head>

<section class="px-8 sm:px-12 lg:px-24 pt-8 sm:pt-12 pb-4 font-cascadia flex flex-col gap-10">
	<header class="flex flex-wrap items-end justify-between gap-4" in:fly={rise(0)}>
		<div>
			<h1 class="text-3xl {strong}">projects</h1>
			<p class="text-sm {muted} mt-2">questionable little things i've made</p>
		</div>
		<span class="text-sm {muted}">{projects.length} so far</span>
	</header>

	<!-- The first one spans two columns and two rows on wide screens. -->
	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 auto-rows-[15rem]">
		{#each projects as project, i}
			<a
				href="/projects/{project.slug}"
				class="group relative overflow-hidden rounded-2xl border border-ocean-300/50 dark:border-ocean-700/50 flex {i === 0 ? 'sm:col-span-2 sm:row-span-2' : ''}"
				data-vt="banner-{project.slug}"
				in:fly={rise(1 + i)}
			>
				{#if project.banner}
					<div class="absolute inset-0">
						<img src={project.banner} alt="" loading="lazy" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
					</div>
					<div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
				{:else}
					<div class="absolute inset-0 glass grid place-items-center text-5xl text-ocean-400 dark:text-ocean-600">⌨</div>
				{/if}
				<div class="relative mt-auto p-5 flex flex-col gap-1 {project.banner ? 'text-white banner-text' : strong}">
					<h2 class="{i === 0 ? 'text-2xl' : 'text-lg'} group-hover:underline">{project.title}</h2>
					{#if project.excerpt}<p class="text-sm opacity-80 {i === 0 ? '' : 'truncate'}">{project.excerpt}</p>{/if}
				</div>
			</a>
		{:else}
			<p class={muted}>no project pages yet</p>
		{/each}
	</div>
</section>

<style>
	.banner-text {
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9), 0 0 12px rgba(0, 0, 0, 0.6);
	}
</style>
