<script context="module" lang="ts">
	import type { Load } from '@sveltejs/kit';

	// Posts written in the admin panel. Hand-written posts (like /blog/welcome) have their own
	// folder, which SvelteKit matches before this route.
	export const load: Load = async ({ params, fetch }) => {
		const res = await fetch(`/api/blog/${params.slug}`);
		if (!res.ok) return { status: 404, error: new Error('post not found') };
		return { props: { post: await res.json() } };
	};
</script>

<script lang="ts">
	import { fade } from 'svelte/transition';
	import PostBody from '$lib/components/PostBody.svelte';

	export let post: { title: string; date: string; excerpt: string; banner: string | null; html: string; published: boolean };

	const formatDate = (d: string) =>
		new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
</script>

<svelte:head>
	<title>{post.title} - blog</title>
	<meta property="og:title" content={post.title} />
	<meta name="description" content={post.excerpt} />
	<meta property="og:description" content={post.excerpt} />
	{#if post.banner}<meta property="og:image" content={post.banner} />{/if}
	{#if !post.published}<meta name="robots" content="noindex" />{/if}
</svelte:head>

{#if post.banner}
	<div class="w-full h-64 sm:h-80 lg:h-96 overflow-hidden" in:fade={{ duration: 300 }}>
		<img src={post.banner} alt="" class="w-full h-full object-cover" />
	</div>
{/if}

<section class="p-8 sm:p-12 lg:p-24 lg:py-16 font-cascadia flex justify-center">
	<article class="max-w-2xl w-full">
		{#if !post.published}
			<p class="mb-6 text-center text-sm rounded border border-ocean-yellow text-ocean-700 dark:text-ocean-yellow px-3 py-2">
				draft: only you can see this while logged in to /admin
			</p>
		{/if}

		<header class="mb-8 text-center">
			<h1 class="text-ocean-900 dark:text-ocean-100 text-4xl font-bold mb-2">{post.title}</h1>
			<time class="text-ocean-700 dark:text-ocean-400">{formatDate(post.date)}</time>
		</header>

		<PostBody html={post.html} />

		<div class="mt-12 pt-8 border-t border-ocean-300 dark:border-ocean-700 text-center">
			<a href="/blog" class="text-ocean-700 dark:text-ocean-400 hover:text-ocean-900 dark:hover:text-ocean-100">← back to blog</a>
		</div>
	</article>
</section>
