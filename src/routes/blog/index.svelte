<script context="module" lang="ts">
	import type { Load } from '@sveltejs/kit';

	// Posts come from the admin panel (database) plus the hand-written ones like /blog/welcome.
	export const load: Load = async ({ fetch }) => {
		const res = await fetch('/api/blog');
		return { props: { posts: res.ok ? await res.json() : [] } };
	};
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	
	export let posts: { slug: string; title: string; date: string; excerpt: string; banner: string | null }[];

	let mounted = false;
	
	onMount(() => {
		mounted = true;
	});
	
</script>

<svelte:head>
	<title>blog</title>
	<meta property="og:title" content="blog" />
	<meta name="description" content="thoughts, tutorials, and random writings" />
	<meta property="og:description" content="thoughts, tutorials, and random writings" />
	<meta name="theme-color" media="(prefers-color-scheme: light)" content="#f9f0f5" />
	<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#281c21" />
</svelte:head>

<section class="p-8 sm:p-12 lg:p-24 lg:py-16 font-cascadia">
	{#if mounted}
		<div class="flex flex-col gap-7">
			<div in:fly={{ y: -20, duration: 400, delay: 0 }}>
				<h1 class="text-ocean-900 dark:text-ocean-100">blog</h1>
				<p class="text-ocean-700 dark:text-ocean-400">thoughts, tutorials, and random writings</p>
			</div>

			<div class="flex flex-col gap-6">
				{#each posts as post, i}
					<article 
						class="border border-ocean-300 dark:border-ocean-700 rounded-lg overflow-hidden hover:border-ocean-400 dark:hover:border-ocean-600 transition-colors"
						in:fly={{ y: 20, duration: 400, delay: 100 + (i * 100) }}
					>
					<a href="/blog/{post.slug}">
						{#if post.banner}
							<div class="w-full h-48 overflow-hidden">
								<img 
									src={post.banner}
									alt={post.title}
									class="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
								/>
							</div>
						{/if}
						<div class="p-4">
							<h2 class="text-ocean-900 dark:text-ocean-100 hover:underline text-xl font-medium">
								{post.title}
							</h2>
							<p class="text-ocean-700 dark:text-ocean-400 text-sm mt-1">
								{new Date(post.date + 'T00:00:00').toLocaleDateString('en-US', { 
									month: 'long', 
									day: 'numeric', 
									year: 'numeric' 
								})}
							</p>
							<p class="text-ocean-800 dark:text-ocean-300 mt-2">
								{post.excerpt}
							</p>
						</div>
					</a>
				</article>
			{:else}
				<p class="text-ocean-700 dark:text-ocean-400">No posts yet. Coming soon!</p>
			{/each}
		</div>
	</div>
	{/if}
</section>
