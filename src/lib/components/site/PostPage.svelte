<script lang="ts">
	// A blog post, event or project page: a big banner with the title, a reading
	// progress bar, and a table of contents beside longer posts.
	import { onMount, tick } from 'svelte';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { page } from '$app/stores';
	import PostBody from '$lib/components/PostBody.svelte';
	import { formatRange } from '$lib/dates';
	import { app } from './app';

	export let post: {
		kind: 'post' | 'event' | 'project';
		title: string;
		date: string;
		endDate?: string | null;
		excerpt: string;
		banner: string | null;
		html: string;
		published: boolean;
		location: string | null;
		link: string | null;
	};
	export let back: { href: string; label: string };
	/** Matches the post's card on list pages; taken from the address unless given. */
	export let slug: string = $page.params.slug;

	const rise = (i: number) => (app.hydrated ? { y: 12, duration: 500, delay: 60 + i * 70, easing: cubicOut } : { duration: 0 });
	$: minutes = Math.max(1, Math.round(post.html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length / 200));
	$: chips = [
		formatRange(post.date, post.endDate),
		post.location ? `📍 ${post.location}` : '',
		post.kind === 'post' ? `${minutes} min read` : ''
	].filter(Boolean);

	// Table of contents from the post's headings (they get ids here so they can be linked to).
	let article: HTMLElement;
	let toc: { id: string; text: string; level: number }[] = [];
	let activeId = '';
	const headingId = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
	async function buildToc() {
		await tick();
		const used = new Set<string>();
		toc = [...(article?.querySelectorAll<HTMLElement>('h2, h3') ?? [])].map((h) => {
			let id = h.id || headingId(h.textContent ?? '');
			while (used.has(id)) id += '-2';
			used.add(id);
			h.id = id;
			h.style.scrollMarginTop = '6rem';
			return { id, text: h.textContent ?? '', level: h.tagName === 'H3' ? 3 : 2 };
		});
	}
	$: post, buildToc();

	// Reading progress, and which heading you're at.
	let progress = 0;
	function onScroll() {
		if (!article) return;
		const box = article.getBoundingClientRect();
		const total = box.height - window.innerHeight * 0.6;
		progress = Math.min(1, Math.max(0, -box.top / Math.max(total, 1)));
		const passed = toc.filter((t) => (document.getElementById(t.id)?.getBoundingClientRect().top ?? 1e9) < 140);
		activeId = passed[passed.length - 1]?.id ?? '';
	}
	onMount(onScroll);
	const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

	const muted = 'text-ocean-600 dark:text-ocean-400';
	const strong = 'text-ocean-900 dark:text-ocean-100';
</script>

<svelte:window on:scroll|passive={onScroll} on:resize={onScroll} />

<svelte:head>
	<title>{post.title}</title>
	<meta property="og:title" content={post.title} />
	<meta name="description" content={post.excerpt} />
	<meta property="og:description" content={post.excerpt} />
	<!-- Its banner as the link preview, or the made-up card (/og) if it has none. -->
	<meta property="og:image" content={post.banner || `https://sundei.ee/og?path=${encodeURIComponent($page.url.pathname)}`} />
	{#if !post.published}<meta name="robots" content="noindex" />{/if}
</svelte:head>

<!-- reading progress -->
<div class="fixed top-0 left-0 right-0 h-[2px] z-[60] pointer-events-none" aria-hidden="true">
	<div class="h-full accent-bg origin-left" style="transform: scaleX({progress})" />
</div>

<section class="px-8 sm:px-12 lg:px-24 pt-8 sm:pt-10 pb-4 font-cascadia flex flex-col gap-10">
	{#if !post.published}
		<p class="text-center text-sm rounded-xl border border-ocean-yellow text-ocean-700 dark:text-ocean-yellow px-3 py-2">draft: only you can see this while logged in to /admin</p>
	{/if}

	<!-- banner with the title on it -->
	<!-- The whole header (picture and title) is what grows out of the card on the list page. -->
	<header class="relative overflow-hidden rounded-2xl border border-ocean-300/50 dark:border-ocean-700/50 {post.banner ? 'min-h-[18rem] sm:min-h-[26rem]' : 'glass'} flex" data-vt="banner-{slug}" in:fly={rise(0)}>
		{#if post.banner}
			<div class="absolute inset-0">
				<img src={post.banner} alt="" class="w-full h-full object-cover" />
			</div>
			<div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/5" />
		{/if}
		<div class="relative mt-auto w-full p-6 sm:p-10 flex flex-col gap-3 {post.banner ? 'text-white banner-text' : strong}">
			<a href={back.href} class="text-xs opacity-75 hover:opacity-100 w-fit">← {back.label}</a>
			<h1 class="text-3xl sm:text-5xl leading-tight max-w-4xl">{post.title}</h1>
			<div class="flex flex-wrap gap-1.5 text-xs">
				{#each chips as c}
					<span class="px-2.5 py-1 rounded-full {post.banner ? 'bg-black/35 border border-white/20' : 'border border-ocean-300/70 dark:border-ocean-700/70'}">{c}</span>
				{/each}
				{#if post.link}
					<a href={post.link} target="_blank" rel="noopener noreferrer" class="px-2.5 py-1 rounded-full accent-bg" style="color: var(--accent-fg)">visit ↗</a>
				{/if}
			</div>
		</div>
	</header>

	<div class="grid gap-12 {toc.length > 2 ? 'lg:grid-cols-[1fr_15rem]' : ''} max-w-6xl w-full mx-auto">
		<article bind:this={article} class="min-w-0 max-w-2xl w-full {toc.length > 2 ? '' : 'mx-auto'}" in:fly={rise(1)}>
			{#if post.html.trim()}
				<PostBody html={post.html} />
			{:else if post.excerpt}
				<p class="text-ocean-800 dark:text-ocean-300">{post.excerpt}</p>
			{/if}
			<div class="mt-14 pt-6 border-t border-ocean-300/50 dark:border-ocean-700/50">
				<a href={back.href} class="text-sm {muted} hover:text-ocean-900 dark:hover:text-ocean-100">← {back.label}</a>
			</div>
		</article>

		{#if toc.length > 2}
			<!-- contents, for longer posts -->
			<nav class="hidden lg:flex flex-col gap-2 sticky top-24 self-start text-sm" aria-label="contents">
				<span class="text-[11px] uppercase tracking-widest text-ocean-500">contents</span>
				{#each toc as t}
					<button
						on:click={() => jump(t.id)}
						class="text-left border-l-2 py-0.5 transition-colors {t.level === 3 ? 'pl-5' : 'pl-3'} {activeId === t.id ? 'border-[color:var(--accent)] ' + strong : 'border-transparent ' + muted + ' hover:text-ocean-900 dark:hover:text-ocean-100'}"
					>
						{t.text}
					</button>
				{/each}
			</nav>
		{/if}
	</div>
</section>

<style>
	.banner-text {
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9), 0 0 12px rgba(0, 0, 0, 0.6);
	}
</style>
