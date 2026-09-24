<script context="module" lang="ts">
	import type { Load } from '@sveltejs/kit';

	// Everything on this page is edited in /admin → pages → about.
	export const load: Load = async ({ fetch }) => {
		const res = await fetch('/api/site/about').catch(() => null);
		return { props: { about: res?.ok ? await res.json() : null } };
	};
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { marked } from 'marked';
	import PostBody from '$lib/components/PostBody.svelte';
	import { settingDefaults, type AboutSettings } from '$lib/siteSettings';

	export let about: AboutSettings | null;
	$: page = about ?? settingDefaults.about;
	// Visitors who unlocked the secret theme can get a different "who?" text. It's only fetched in
	// the browser, so it never appears in the page HTML.
	let altBio = '';
	async function loadAltBio() {
		try {
			if (localStorage.getItem('trans-unlocked') !== '1') return;
			const res = await fetch('/api/site/aboutAlt');
			if (res.ok) altBio = (await res.json()).bio || '';
		} catch {}
	}
	onMount(() => {
		loadAltBio();
		window.addEventListener('trans-theme', loadAltBio);
		return () => window.removeEventListener('trans-theme', loadAltBio);
	});
	$: bioHtml = marked.parse(altBio || page.bio || '', { async: false, gfm: true, breaks: true }) as string;
	$: pcSpecs = page.pcBuild;
	$: peripheralSpecs = page.peripherals;
	$: interests = page.interests;
	$: languages = page.languages;
</script>

<svelte:head>
	<title>about</title>
</svelte:head>

<section 
	class="p-8 sm:p-12 lg:p-24 lg:py-16 font-cascadia"
	in:fade={{ duration: 200 }}
>
	<div class="max-w-2xl">
		<h1 
			class="text-ocean-900 dark:text-ocean-100 text-2xl mb-2"
			in:fly={{ y: -20, duration: 300 }}
		>
			about
		</h1>
		<p 
			class="text-ocean-700 dark:text-ocean-400 mb-10"
			in:fly={{ y: -20, duration: 300, delay: 50 }}
		>
			a bit more about me
		</p>

		<!-- Bio -->
		<div 
			class="mb-10"
			in:fly={{ y: 20, duration: 300, delay: 100 }}
		>
			<h2 class="text-ocean-900 dark:text-ocean-100 text-lg mb-3">who?</h2>
			<div class="text-sm"><PostBody html={bioHtml} /></div>
		</div>

		<!-- PC build -->
		{#if pcSpecs.length}
		<div
			class="mb-10"
			in:fly={{ y: 20, duration: 300, delay: 200 }}
		>
			<h2 class="text-ocean-900 dark:text-ocean-100 text-lg mb-3">pc build</h2>
			<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
				{#each pcSpecs as item, i}
					<div
						class="rounded-2xl border border-ocean-300/70 dark:border-ocean-700/70 bg-ocean-100/40 dark:bg-ocean-900/40 p-4 flex flex-col gap-3 shadow-sm"
						in:fly={{ y: 15, duration: 220, delay: 250 + i * 60 }}
					>
						{#if item.image}
							<div
								class="group w-full aspect-[4/3] rounded-xl overflow-hidden bg-ocean-200/40 dark:bg-ocean-800/40 flex items-center justify-center"
							>
								<img
									src={item.image}
									alt={item.label}
									class="w-full h-full object-contain transition-transform duration-200 ease-out group-hover:scale-105"
									loading="lazy"
								/>
							</div>
						{/if}
						<div>
							<p class="text-[0.7rem] uppercase tracking-wide text-ocean-600 dark:text-ocean-500">
								{item.label}
							</p>
							<p class="text-ocean-900 dark:text-ocean-100 text-sm leading-snug">
								{item.value}
							</p>
							{#if item.sub}
								<p class="text-[0.7rem] text-ocean-600 dark:text-ocean-500 mt-1">
									{item.sub}
								</p>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
		{/if}

		<!-- Peripherals -->
		<div
			class="mb-10"
			in:fly={{ y: 20, duration: 300, delay: 260 }}
		>
			<h2 class="text-ocean-900 dark:text-ocean-100 text-lg mb-3">peripherals</h2>
			<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
				{#each peripheralSpecs as item, i}
					<div
						class="rounded-2xl border border-ocean-300/70 dark:border-ocean-700/70 bg-ocean-100/40 dark:bg-ocean-900/40 p-4 flex flex-col gap-3 shadow-sm"
						in:fly={{ y: 15, duration: 220, delay: 280 + i * 60 }}
					>
						{#if item.image}
							<div
								class="group w-full aspect-[4/3] rounded-xl overflow-hidden bg-ocean-200/40 dark:bg-ocean-800/40 flex items-center justify-center"
							>
								<img
									src={item.image}
									alt={item.label}
									class="w-full h-full object-contain transition-transform duration-200 ease-out group-hover:scale-105"
									loading="lazy"
								/>
							</div>
						{/if}
						<div>
							<p class="text-[0.7rem] uppercase tracking-wide text-ocean-600 dark:text-ocean-500">
								{item.label}
							</p>
							<p class="text-ocean-900 dark:text-ocean-100 text-sm leading-snug">
								{item.value}
							</p>
							{#if item.sub}
								<p class="text-[0.7rem] text-ocean-600 dark:text-ocean-500 mt-1">
									{item.sub}
								</p>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>


		<!-- Languages -->
		<div 
			class="mb-10"
			in:fly={{ y: 20, duration: 300, delay: 300 }}
		>
			<h2 class="text-ocean-900 dark:text-ocean-100 text-lg mb-3">languages & tools</h2>
			<div class="flex flex-wrap gap-2">
				{#each languages as lang, i}
					<span 
						class="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-ocean-300 dark:border-ocean-700 rounded"
						in:fly={{ y: 10, duration: 200, delay: 350 + i * 40 }}
					>
						<span 
							class="w-2.5 h-2.5 rounded-full flex-shrink-0" 
							style="background-color: {lang.color}"
						></span>
						<span class="text-ocean-900 dark:text-ocean-100">{lang.name}</span>
					</span>
				{/each}
			</div>
		</div>

		<!-- Interests -->
		<div 
			class="mb-10"
			in:fly={{ y: 20, duration: 300, delay: 400 }}
		>
			<h2 class="text-ocean-900 dark:text-ocean-100 text-lg mb-3">{page.interestsTitle || 'things i like'}</h2>
			<ul class="flex flex-wrap gap-2 text-sm">
				{#each interests as interest, i}
					<li
						class="px-3 py-1 rounded-full border border-ocean-300 dark:border-ocean-700 text-ocean-800 dark:text-ocean-300"
						in:fly={{ y: 10, duration: 200, delay: 450 + i * 40 }}
					>
						{interest}
					</li>
				{/each}
			</ul>
		</div>

		<!-- Contact -->
		<div in:fly={{ y: 20, duration: 300, delay: 500 }}>
			<h2 class="text-ocean-900 dark:text-ocean-100 text-lg mb-3">reach me</h2>
			<div class="flex flex-wrap gap-3 text-sm">
				{#each page.links as link}
					<a
						href={link.url}
						target={link.url.startsWith('mailto:') ? undefined : '_blank'}
						rel="noopener noreferrer"
						class="text-ocean-700 dark:text-ocean-400 hover:text-ocean-900 dark:hover:text-ocean-100 underline transition-colors"
					>
						{link.label}
					</a>
				{/each}
			</div>
		</div>
	</div>
</section>
