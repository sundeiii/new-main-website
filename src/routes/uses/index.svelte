<script context="module" lang="ts">
	// The /uses page: the about page's setup (edited in /admin → pages → about).
	import type { Load } from '@sveltejs/kit';

	// Same data as /about (edited in /admin → pages → about), shown as a /uses page.
	export const load: Load = async ({ fetch }) => {
		const [res, dates] = await Promise.all([fetch('/api/site/about').catch(() => null), fetch('/api/site/updated?keys=about').catch(() => null)]);
		return { props: { about: res?.ok ? await res.json() : null, updatedAt: dates?.ok ? (await dates.json()).about : null } };
	};
</script>

<script lang="ts">
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { settingDefaults, type AboutSettings } from '$lib/siteSettings';
	import { app } from '$lib/components/site/app';
	import { stickyAside } from '$lib/components/site/sticky';
	import { ago } from '$lib/dates';

	export let about: AboutSettings | null;
	export let updatedAt: string | null = null;
	$: page = about ?? settingDefaults.about;
	$: gear = [
		{ title: 'pc build', items: page.pcBuild },
		{ title: 'peripherals', items: page.peripherals }
	].filter((g) => g.items.length);
	// The side column's counts, in page order.
	$: groups = [...(page.software.length ? [{ title: 'software', count: page.software.length }] : []), ...gear.map((g) => ({ title: g.title, count: g.items.length }))];

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

<section class="px-8 sm:px-12 lg:px-24 pt-8 sm:pt-12 pb-4 font-cascadia grid gap-14 lg:grid-cols-[17rem_1fr] xl:gap-24">
	<!-- ── side: title, counts, jump links ── -->
	<aside use:stickyAside class="flex flex-col gap-7 lg:self-start" in:fly={rise(0)}>
		<div>
			<h1 class="text-3xl {strong}">uses</h1>
			<p class="text-sm {muted} mt-2">the stuff i use every day</p>
			{#if updatedAt}
				<p class="text-xs text-ocean-500 mt-1">
					<time datetime={updatedAt} title={new Date(updatedAt).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' })}>updated {ago(updatedAt)}</time>
				</p>
			{/if}
		</div>

		<div class="grid grid-cols-2 gap-2">
			{#each groups as g, i}
				<button
					on:click={() => document.getElementById(`uses-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
					class="glass rounded-xl border border-ocean-300/50 dark:border-ocean-700/50 px-3 py-2.5 text-left hover:border-ocean-500 transition-colors"
				>
					<div class="text-xl tabular-nums {strong}">{g.count}</div>
					<div class="text-[11px] {muted}">{g.title}</div>
				</button>
			{/each}
		</div>

		<p class="text-xs {muted}">
			a <a href="https://uses.tech" target="_blank" rel="noopener noreferrer" class="underline">/uses page</a>. more about me on
			<a href="/about" class="underline">/about</a>.
		</p>
	</aside>

	<!-- ── software, then the hardware ── -->
	<div class="flex flex-col gap-14 min-w-0">
		{#if page.software.length}
			<div id="uses-0" class="flex flex-col gap-3 scroll-mt-28" in:fly={rise(1)}>
				<span class={label}>software & setup</span>
				<div class="glass rounded-2xl border border-ocean-300/50 dark:border-ocean-700/50 px-5 py-1">
					<dl class="grid sm:grid-cols-2 gap-x-10">
						{#each page.software as sw}
							<div class="flex items-baseline gap-4 py-3 border-t border-ocean-300/40 dark:border-ocean-700/40 [&:nth-child(-n+1)]:border-t-0 sm:[&:nth-child(-n+2)]:border-t-0">
								<dt class="w-24 shrink-0 {label}">{sw.label}</dt>
								<dd class="min-w-0 text-sm {strong}">{sw.value}{#if sw.sub}<span class={muted}> · {sw.sub}</span>{/if}</dd>
							</div>
						{/each}
					</dl>
				</div>
			</div>
		{/if}

		{#each gear as group, gi}
			<div id="uses-{page.software.length ? gi + 1 : gi}" class="flex flex-col gap-3 scroll-mt-28" in:fly={rise(2 + gi)}>
				<span class={label}>{group.title}</span>
				<div class="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
					{#each group.items as item}
						<div class="group glass rounded-2xl border border-ocean-300/50 dark:border-ocean-700/50 p-4 flex items-center gap-4 hover:border-ocean-500 transition-colors">
							<span class="w-16 h-16 shrink-0 rounded-xl bg-ocean-200/40 dark:bg-ocean-800/40 grid place-items-center overflow-hidden">
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
	</div>
</section>
