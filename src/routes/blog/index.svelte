<script context="module" lang="ts">
	// The blog: the newest post as a big banner and the rest as a numbered list.
	import type { Load } from '@sveltejs/kit';

	// Posts come from the admin panel (database).
	export const load: Load = async ({ fetch }) => {
		const res = await fetch('/api/blog');
		return { props: { posts: res.ok ? await res.json() : [] } };
	};
</script>

<script lang="ts">
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { app } from '$lib/components/site/app';

	export let posts: { slug: string; title: string; date: string; excerpt: string; banner: string | null; minutes?: number }[];

	const rise = (i: number) => (app.hydrated ? { y: 12, duration: 500, delay: 60 + i * 70, easing: cubicOut } : { duration: 0 });
	const date = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
	const meta = (p: { date: string; minutes?: number }) => [date(p.date), p.minutes ? `${p.minutes} min read` : ''].filter(Boolean).join(' · ');

	$: [newest, ...rest] = posts;

	const label = 'text-[11px] uppercase tracking-widest text-ocean-500';
	const muted = 'text-ocean-600 dark:text-ocean-400';
	const strong = 'text-ocean-900 dark:text-ocean-100';
</script>

<svelte:head>
	<title>blog</title>
	<meta property="og:title" content="blog" />
	<meta name="description" content="thoughts, tutorials, and random writings" />
	<meta property="og:description" content="thoughts, tutorials, and random writings" />
</svelte:head>

<section class="px-8 sm:px-12 lg:px-24 pt-8 sm:pt-12 pb-4 font-cascadia flex flex-col gap-12 max-w-6xl">
	<header class="flex flex-wrap items-end justify-between gap-4" in:fly={rise(0)}>
		<div>
			<h1 class="text-3xl {strong}">blog</h1>
			<p class="text-sm {muted} mt-2">thoughts, tutorials, and random writings</p>
		</div>
		<span class="text-sm {muted}">{posts.length} post{posts.length === 1 ? '' : 's'}</span>
	</header>

	{#if newest}
		<!-- newest post, as a banner -->
		<a href="/blog/{newest.slug}" class="group relative block overflow-hidden rounded-2xl border border-ocean-300/50 dark:border-ocean-700/50 min-h-[18rem] sm:min-h-[22rem]" data-vt="banner-{newest.slug}" in:fly={rise(1)}>
			{#if newest.banner}
				<div class="absolute inset-0">
					<img src={newest.banner} alt="" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
				</div>
				<div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
			{:else}
				<div class="absolute inset-0 glass" />
			{/if}
			<div class="relative h-full min-h-[18rem] sm:min-h-[22rem] flex flex-col justify-end gap-2 p-6 sm:p-8 {newest.banner ? 'text-white banner-text' : strong}">
				<span class="text-[11px] uppercase tracking-widest opacity-70">latest · {meta(newest)}</span>
				<h2 class="text-2xl sm:text-3xl max-w-3xl group-hover:underline">{newest.title}</h2>
				{#if newest.excerpt}<p class="text-sm opacity-85 max-w-2xl">{newest.excerpt}</p>{/if}
			</div>
		</a>
	{/if}

	{#if rest.length}
		<!-- everything else, newest first -->
		<div class="flex flex-col gap-3" in:fly={rise(2)}>
			<span class={label}>older</span>
			<ol class="flex flex-col">
				{#each rest as post, i}
					<li>
						<a href="/blog/{post.slug}" class="group grid grid-cols-[2.5rem_1fr_auto] sm:grid-cols-[2.5rem_7rem_1fr_auto] items-center gap-x-4 py-4 border-t border-ocean-300/50 dark:border-ocean-700/50">
							<span class="text-xs tabular-nums text-ocean-400 dark:text-ocean-600">{String(i + 2).padStart(2, '0')}</span>
							{#if post.banner}
								<span class="hidden sm:block h-16 rounded-lg overflow-hidden" data-vt="banner-{post.slug}">
									<img src={post.banner} alt="" loading="lazy" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
								</span>
							{:else}
								<span class="hidden sm:block h-16 rounded-lg glass" />
							{/if}
							<span class="min-w-0">
								<span class="block text-lg {strong} transition-transform duration-300 group-hover:translate-x-1">{post.title}</span>
								<span class="block text-xs {muted} mt-0.5">{meta(post)}</span>
								{#if post.excerpt}<span class="block text-sm {muted} truncate mt-1">{post.excerpt}</span>{/if}
							</span>
							<span class="text-ocean-400 dark:text-ocean-600 group-hover:text-ocean-900 dark:group-hover:text-ocean-100 transition-colors">→</span>
						</a>
					</li>
				{/each}
			</ol>
		</div>
	{/if}

	{#if !posts.length}
		<p class={muted}>no posts yet. coming soon!</p>
	{/if}
</section>

<style>
	.banner-text {
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9), 0 0 12px rgba(0, 0, 0, 0.6);
	}
</style>
