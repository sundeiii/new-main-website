<script context="module" lang="ts">
	export function load({ error, status }: { error: Error; status: number }) {
		return {
			props: {
				title: status === 404 ? 'page not found' : 'something went wrong',
				status,
				message: error?.message || 'An unexpected error occurred'
			}
		};
	}
</script>

<script lang="ts">
	// The error page. For a 404 it shows the address you tried, guesses the page you meant (typos
	// like /tournamnets) and lists the main pages; other errors show what went wrong.
	import { page } from '$app/stores';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { app } from '$lib/components/site/app';

	export let title: string;
	export let status: number;
	export let message: string;

	const messages404 = [
		'looks like this page went on vacation.',
		'this page is playing hide and seek... and winning.',
		'nothing here but tumbleweeds.',
		"the page you're looking for has left the chat.",
		'404: page is out touching grass.',
		"this page doesn't exist. or does it? no. it doesn't.",
		"you've ventured into the void.",
		'missed the note. combo broken.'
	];
	const messages500 = [
		'the server is having a moment.',
		"something broke. it wasn't me. probably.",
		'internal crisis detected.',
		'the hamsters powering the server need a break.',
		'this is fine. everything is fine.'
	];

	const pages = [
		{ href: '/', label: 'home' },
		{ href: '/about', label: 'about' },
		{ href: '/blog', label: 'blog' },
		{ href: '/projects', label: 'projects' },
		{ href: '/tournaments', label: 'tournaments' },
		{ href: '/osu', label: 'osu!' },
		{ href: '/music', label: 'music' },
		{ href: '/gallery', label: 'gallery' },
		{ href: '/guestbook', label: 'guestbook' },
		{ href: '/events', label: 'events' },
		{ href: '/now', label: 'now' },
		{ href: '/uses', label: 'uses' },
		{ href: '/links', label: 'links' },
		{ href: '/stats', label: 'stats' },
		{ href: '/skins', label: 'skins' },
		{ href: '/changelog', label: 'changelog' }
	];

	// Picked from the address, not at random, so the server and the browser show the same line.
	$: path = $page.url.pathname;
	$: pool = status === 404 ? messages404 : messages500;
	$: line = pool[[...path].reduce((n, c) => n + c.charCodeAt(0), 0) % pool.length];

	// The closest page by edit distance on its first segment, if it's close enough to be a typo.
	function distance(a: string, b: string) {
		const d = Array.from({ length: b.length + 1 }, (_, i) => i);
		for (let i = 1; i <= a.length; i++) {
			let prev = d[0];
			d[0] = i;
			for (let j = 1; j <= b.length; j++) {
				const tmp = d[j];
				d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
				prev = tmp;
			}
		}
		return d[b.length];
	}
	$: first = path.split('/')[1]?.toLowerCase() ?? '';
	$: guess = (() => {
		if (!first) return null;
		const best = pages
			.filter((p) => p.href !== '/')
			.map((p) => ({ ...p, d: distance(first, p.href.slice(1)) }))
			.sort((a, b) => a.d - b.d)[0];
		return best && best.d <= Math.max(1, Math.floor(first.length / 3)) && best.href !== `/${first}` ? best : null;
	})();

	const rise = (i: number) => (app.hydrated ? { y: 12, duration: 500, delay: 60 + i * 70, easing: cubicOut } : { duration: 0 });
	const label = 'text-[11px] uppercase tracking-widest text-ocean-500';
	const muted = 'text-ocean-600 dark:text-ocean-400';
	const strong = 'text-ocean-900 dark:text-ocean-100';
	const pill = 'px-4 py-2 rounded-full glass border border-ocean-300/50 dark:border-ocean-700/50 text-sm transition-transform duration-200 hover:-translate-y-0.5';
</script>

<svelte:head>
	<title>{status} · {title}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="px-8 sm:px-12 lg:px-24 pt-8 sm:pt-16 pb-4 font-cascadia flex flex-col gap-10 max-w-3xl">
	<header class="flex flex-col gap-3" in:fly={rise(0)}>
		<span class="text-[7rem] sm:text-[10rem] leading-none font-bold text-ocean-300 dark:text-ocean-700 select-none tabular-nums" aria-hidden="true">{status}</span>
		<h1 class="text-2xl {strong}">{title}</h1>
		<p class={muted}>{line}</p>
		{#if status === 404}
			<p class="text-sm {muted}">there's nothing at <code class="{strong} break-all">{path}</code>.</p>
		{:else}
			<p class="text-xs text-ocean-500">{message}</p>
		{/if}
	</header>

	{#if guess}
		<a href={guess.href} class="glass rounded-2xl border border-ocean-300/50 dark:border-ocean-700/50 px-4 py-3 flex items-center justify-between gap-4 transition-transform duration-200 hover:-translate-y-0.5" in:fly={rise(1)}>
			<span><span class={label}>did you mean</span><span class="block {strong}">{guess.href}</span></span>
			<span class={muted} aria-hidden="true">→</span>
		</a>
	{/if}

	<div class="flex flex-wrap gap-2" in:fly={rise(2)}>
		<a href="/" class="{pill} accent-bg">go home</a>
		<button on:click={() => history.back()} class="{pill} {strong}">go back</button>
		{#if status !== 404}<button on:click={() => location.reload()} class="{pill} {strong}">try again</button>{/if}
	</div>

	{#if status === 404}
		<div class="flex flex-col gap-3" in:fly={rise(3)}>
			<span class={label}>or try one of these</span>
			<nav class="flex flex-wrap gap-x-4 gap-y-2 text-sm">
				{#each pages as p}<a href={p.href} class="{muted} hover:text-ocean-900 dark:hover:text-ocean-100 hover:underline">{p.label}</a>{/each}
			</nav>
		</div>
	{/if}
</section>
