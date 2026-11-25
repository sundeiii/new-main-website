<script context="module" lang="ts">
	// Project pages (written in /admin → blog as kind "project"), the first one big.
	import type { Load } from '@sveltejs/kit';

	// Project pages, written in /admin → blog as kind "project".
	// The server list comes with the page (so the cards are there from the start); whether each
	// one is up is checked in the browser afterwards, since that can take a few seconds.
	export const load: Load = async ({ fetch }) => {
		const [res, status] = await Promise.all([fetch('/api/blog?kind=project'), fetch('/api/site/status').catch(() => null)]);
		return { props: { projects: res.ok ? await res.json() : [], services: status?.ok ? await status.json() : null } };
	};
</script>

<script lang="ts">
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { onMount } from 'svelte';
	import { app } from '$lib/components/site/app';
	import type { StatusSettings } from '$lib/siteSettings';

	export let projects: { slug: string; title: string; excerpt: string; banner: string | null; link: string | null }[];
	export let services: StatusSettings | null;

	type Live = { up: boolean; ms: number | null; players: { online: number; stable?: number; lazer?: number } | null; version: string | null };
	let live: Record<string, Live> = {};
	let checked = false;
	async function check() {
		try {
			const d = await (await fetch('/api/status')).json();
			live = Object.fromEntries((d.items ?? []).map((s: any) => [s.name, s]));
		} catch {}
		checked = true;
	}
	onMount(() => {
		if (!services?.show || !services.items.length) return;
		check();
		const id = setInterval(check, 60_000);
		return () => clearInterval(id);
	});
	const host = (u: string) => {
		try {
			return new URL(u).host;
		} catch {
			return u;
		}
	};

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

	{#if services?.show && services.items.length}
		<div class="flex flex-col gap-3" in:fly={rise(1)}>
			<span class="text-[11px] uppercase tracking-widest text-ocean-500">{services.title}</span>
			<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
				{#each services.items as s}
					{@const l = live[s.name]}
					<svelte:element
						this={s.link ? 'a' : 'div'}
						href={s.link || undefined}
						target={s.link ? '_blank' : undefined}
						rel={s.link ? 'noopener noreferrer' : undefined}
						class="group glass rounded-2xl border border-ocean-300/50 dark:border-ocean-700/50 p-4 flex flex-col gap-2 {s.link ? 'hover:border-ocean-500 transition-colors' : ''}"
					>
						<div class="flex items-center gap-2.5">
							<span class="relative flex w-2.5 h-2.5 shrink-0">
								{#if l?.up}<span class="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-50" />{/if}
								<span class="relative w-2.5 h-2.5 rounded-full transition-colors {!checked ? 'bg-ocean-400 animate-pulse' : l?.up ? 'bg-green-500' : 'bg-red-500'}" />
							</span>
							<span class="{strong} {s.link ? 'group-hover:underline' : ''}">{s.name}</span>
							<span class="ml-auto text-xs {muted} tabular-nums">
								{#if !checked}checking…{:else if l?.up}{l.ms != null ? `${l.ms} ms` : 'up'}{:else}down{/if}
							</span>
						</div>
						{#if s.note}<p class="text-sm {muted}">{s.note}</p>{/if}
						<!-- Always one line tall, so the card doesn't grow once the numbers arrive. -->
						<div class="text-xs {muted} flex flex-wrap gap-x-3 min-h-[1rem]">
							{#if l?.players}
								<span><span class="{strong} tabular-nums">{l.players.online}</span> online</span>
								{#if l.players.stable !== undefined && l.players.lazer !== undefined}<span class="tabular-nums">{l.players.stable} stable · {l.players.lazer} lazer</span>{/if}
							{/if}
							{#if l?.version}<span>v{l.version}</span>{/if}
							{#if s.link && !l?.players && !l?.version}<span>{host(s.link)}</span>{/if}
						</div>
					</svelte:element>
				{/each}
			</div>
		</div>
	{/if}

	<!-- The first one spans two columns and two rows on wide screens. -->
	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 auto-rows-[15rem]">
		{#each projects as project, i}
			<a
				href="/projects/{project.slug}"
				class="group relative overflow-hidden rounded-2xl border border-ocean-300/50 dark:border-ocean-700/50 flex {i === 0 ? 'sm:col-span-2 sm:row-span-2' : ''}"
				data-vt="banner-{project.slug}"
				in:fly={rise(2 + i)}
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
