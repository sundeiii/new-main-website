<script context="module" lang="ts">
	// The /uses page: the about page's setup (edited in /admin → pages → about).
	import type { Load } from '@sveltejs/kit';

	// Same data as /about (edited in /admin → pages → about), shown as a /uses page.
	export const load: Load = async ({ fetch }) => {
		const res = await fetch('/api/site/about').catch(() => null);
		return { props: { about: res?.ok ? await res.json() : null } };
	};
</script>

<script lang="ts">
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { settingDefaults, type AboutSettings } from '$lib/siteSettings';
	import { app } from '$lib/components/site/app';

	export let about: AboutSettings | null;
	$: page = about ?? settingDefaults.about;
	$: gear = [
		{ title: 'pc build', items: page.pcBuild },
		{ title: 'peripherals', items: page.peripherals }
	].filter((g) => g.items.length);

	const rise = (i: number) => (app.hydrated ? { y: 12, duration: 500, delay: 60 + i * 70, easing: cubicOut } : { duration: 0 });
	const label = 'text-[11px] uppercase tracking-widest text-ocean-500';
	const muted = 'text-ocean-600 dark:text-ocean-400';
	const strong = 'text-ocean-900 dark:text-ocean-100';
</script>

<svelte:head>
	<title>uses</title>
	<meta property="og:title" content="uses" />
	<meta name="description" content="the hardware and software i use" />
	<meta property="og:description" content="the hardware and software i use" />
</svelte:head>

<section class="px-8 sm:px-12 lg:px-24 pt-8 sm:pt-12 pb-4 font-cascadia flex flex-col gap-14 max-w-6xl">
	<header in:fly={rise(0)}>
		<h1 class="text-3xl {strong}">uses</h1>
		<p class="text-sm {muted} mt-2">the stuff i use every day. a <a href="https://uses.tech" target="_blank" rel="noopener noreferrer" class="underline">/uses page</a>.</p>
	</header>

	{#if page.software.length}
		<div class="flex flex-col gap-3" in:fly={rise(1)}>
			<span class={label}>software & setup</span>
			<dl class="grid sm:grid-cols-2 gap-x-10">
				{#each page.software as sw}
					<div class="flex items-baseline gap-4 py-3 border-t border-ocean-300/50 dark:border-ocean-700/50">
						<dt class="w-28 shrink-0 {label}">{sw.label}</dt>
						<dd class="min-w-0 text-sm {strong}">{sw.value}{#if sw.sub}<span class={muted}> · {sw.sub}</span>{/if}</dd>
					</div>
				{/each}
			</dl>
		</div>
	{/if}

	{#each gear as group, gi}
		<div class="flex flex-col gap-3" in:fly={rise(2 + gi)}>
			<span class={label}>{group.title}</span>
			<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
				{#each group.items as item}
					<div class="group glass rounded-2xl border border-ocean-300/50 dark:border-ocean-700/50 p-4 flex items-center gap-4">
						<span class="w-20 h-20 shrink-0 rounded-xl bg-ocean-200/40 dark:bg-ocean-800/40 grid place-items-center overflow-hidden">
							{#if item.image}<img src={item.image} alt="" loading="lazy" class="w-full h-full object-contain p-1.5 transition-transform duration-300 group-hover:scale-110" />{/if}
						</span>
						<span class="min-w-0">
							<span class="block {label}">{item.label}</span>
							<span class="block text-sm {strong} leading-snug">{item.value}</span>
							{#if item.sub}<span class="block text-xs {muted} mt-0.5">{item.sub}</span>{/if}
						</span>
					</div>
				{/each}
			</div>
		</div>
	{/each}
</section>
