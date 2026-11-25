<script context="module" lang="ts">
	// About (edited in /admin → pages → about): a profile column, the story, and the setup as a
	// compact gear list.
	import type { Load } from '@sveltejs/kit';

	// Everything on this page is edited in /admin → pages → about.
	export const load: Load = async ({ fetch }) => {
		const res = await fetch('/api/site/about').catch(() => null);
		return { props: { about: res?.ok ? await res.json() : null } };
	};
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { marked } from 'marked';
	import PostBody from '$lib/components/PostBody.svelte';
	import { settingDefaults, type AboutSettings } from '$lib/siteSettings';
	import { lanyard } from '$lib/lanyard';
	import { app } from '$lib/components/site/app';
	import { stickyAside } from '$lib/components/site/sticky';

	export let about: AboutSettings | null;
	$: page = about ?? settingDefaults.about;

	const rise = (i: number) => (app.hydrated ? { y: 12, duration: 500, delay: 60 + i * 70, easing: cubicOut } : { duration: 0 });

	// Visitors who unlocked the secret theme can get a different "who?" text. It's only fetched in
	// the browser, so it never appears in the page HTML.
	let altBio = '';
	async function loadAltBio() {
		try {
			const unlocked = localStorage.getItem('trans-unlocked') === '1' || JSON.parse(localStorage.getItem('themes-unlocked') ?? '[]').includes('trans');
			if (!unlocked) return;
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

	// Avatar from Discord, like the home page (the nav keeps the connection open).
	$: user = ($lanyard as any)?.discord_user;
	$: avatar = user?.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${user.avatar.startsWith('a_') ? 'gif' : 'png'}?size=160` : null;

	$: gear = [
		{ title: 'pc build', items: page.pcBuild },
		{ title: 'peripherals', items: page.peripherals }
	].filter((g) => g.items.length);

	const label = 'text-[11px] uppercase tracking-widest text-ocean-500';
	const muted = 'text-ocean-600 dark:text-ocean-400';
	const strong = 'text-ocean-900 dark:text-ocean-100';
	const chip = 'px-3 py-1 rounded-full text-xs border border-ocean-300/70 dark:border-ocean-700/70';
</script>

<svelte:head>
	<title>about</title>
</svelte:head>

<section class="px-8 sm:px-12 lg:px-24 pt-8 sm:pt-12 pb-4 font-cascadia grid gap-14 lg:grid-cols-[17rem_1fr] xl:gap-24">
	<!-- ── profile ── -->
	<aside use:stickyAside class="flex flex-col gap-7 lg:self-start" in:fly={rise(0)}>
		<div class="flex flex-col gap-4">
			{#if avatar}
				<img src={avatar} alt="" class="w-20 h-20 rounded-full ring-[3px] ring-offset-4 ring-offset-transparent ring-ocean-400/60" />
			{:else}
				<div class="w-20 h-20 rounded-full ring-[3px] ring-offset-4 ring-offset-transparent ring-ocean-400/60 bg-ocean-300/30 dark:bg-ocean-700/30" />
			{/if}
			<div>
				<h1 class="text-3xl {strong}">about</h1>
				<p class="text-sm {muted} mt-2">a bit more about me</p>
			</div>
		</div>

		{#if page.languages.length}
			<div class="flex flex-col gap-2">
				<span class={label}>languages & tools</span>
				<div class="flex flex-wrap gap-1.5">
					{#each page.languages as lang}
						<span class="{chip} inline-flex items-center gap-1.5 {strong}"><span class="w-2 h-2 rounded-full" style="background: {lang.color}" />{lang.name}</span>
					{/each}
				</div>
			</div>
		{/if}

		{#if page.interests.length}
			<div class="flex flex-col gap-2">
				<span class={label}>{page.interestsTitle || 'things i like'}</span>
				<div class="flex flex-wrap gap-1.5">
					{#each page.interests as interest}<span class="{chip} {muted}">{interest}</span>{/each}
				</div>
			</div>
		{/if}

		{#if page.links.length}
			<div class="flex flex-col gap-2">
				<span class={label}>reach me</span>
				<div class="flex flex-wrap gap-1.5">
					{#each page.links as link}
						<a
							href={link.url}
							target={link.url.startsWith('mailto:') ? undefined : '_blank'}
							rel="noopener noreferrer"
							class="{chip} {muted} hover:text-ocean-900 dark:hover:text-ocean-100 hover:border-ocean-500 transition-colors">{link.label} ↗</a
						>
					{/each}
				</div>
			</div>
		{/if}
	</aside>

	<!-- ── story, involvement, setup ── -->
	<div class="flex flex-col gap-16 min-w-0 max-w-4xl">
		<div class="flex flex-col gap-3" in:fly={rise(1)}>
			<span class={label}>who?</span>
			<div class="text-base leading-relaxed"><PostBody html={bioHtml} /></div>
		</div>

		{#if page.affiliations.length}
			<div class="flex flex-col gap-3" in:fly={rise(2)}>
				<span class={label}>where i'm involved</span>
				<ul class="grid gap-3 sm:grid-cols-2">
					{#each page.affiliations as a}
						<li class="glass rounded-2xl border border-ocean-300/50 dark:border-ocean-700/50 p-4 flex flex-col gap-1">
							<div class="flex items-baseline justify-between gap-3">
								{#if a.url}
									<a href={a.url} target="_blank" rel="noopener noreferrer" class="{strong} hover:underline">{a.name} ↗</a>
								{:else}
									<span class={strong}>{a.name}</span>
								{/if}
								{#if a.since}<span class="text-xs text-ocean-500 shrink-0">{a.since}</span>{/if}
							</div>
							{#if a.role}<span class="text-sm text-ocean-700 dark:text-ocean-300">{a.role}</span>{/if}
							{#if a.note}<span class="text-xs {muted}">{a.note}</span>{/if}
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		{#each gear as group, gi}
			<div class="flex flex-col gap-3" in:fly={rise(3 + gi)}>
				<div class="flex items-baseline justify-between">
					<span class={label}>{group.title}</span>
					{#if gi === 0}<a href="/uses" class="text-xs {muted} hover:underline">everything i use →</a>{/if}
				</div>
				<ul class="grid gap-x-8 sm:grid-cols-2">
					{#each group.items as item}
						<li class="group flex items-center gap-4 py-3 border-t border-ocean-300/50 dark:border-ocean-700/50">
							<span class="w-14 h-14 shrink-0 rounded-xl overflow-hidden glass grid place-items-center">
								{#if item.image}<img src={item.image} alt="" loading="lazy" class="w-full h-full object-contain p-1 transition-transform duration-300 group-hover:scale-110" />{/if}
							</span>
							<span class="min-w-0">
								<span class="block {label}">{item.label}</span>
								<span class="block text-sm {strong} leading-snug">{item.value}</span>
								{#if item.sub}<span class="block text-xs {muted}">{item.sub}</span>{/if}
							</span>
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	</div>
</section>
