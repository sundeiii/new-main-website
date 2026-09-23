<script context="module" lang="ts">
	import type { Load } from '@sveltejs/kit';

	// Same data as /about (edited in /admin → pages → about), shown as a /uses page.
	export const load: Load = async ({ fetch }) => {
		const res = await fetch('/api/site/about').catch(() => null);
		return { props: { about: res?.ok ? await res.json() : null } };
	};
</script>

<script lang="ts">
	import { fly } from 'svelte/transition';
	import { settingDefaults, type AboutSettings } from '$lib/siteSettings';

	export let about: AboutSettings | null;
	$: page = about ?? settingDefaults.about;
	$: groups = [
		{ title: 'pc build', items: page.pcBuild },
		{ title: 'peripherals', items: page.peripherals }
	].filter((g) => g.items.length);
</script>

<svelte:head>
	<title>uses</title>
	<meta property="og:title" content="uses" />
	<meta name="description" content="the hardware and software i use" />
	<meta property="og:description" content="the hardware and software i use" />
</svelte:head>

<section class="p-8 sm:p-12 lg:p-24 lg:py-16 font-cascadia">
	<div class="flex flex-col gap-10 max-w-4xl">
		<div in:fly={{ y: -20, duration: 400 }}>
			<h1 class="text-ocean-900 dark:text-ocean-100">uses</h1>
			<p class="text-ocean-700 dark:text-ocean-400">
				the stuff i use every day. a <a href="https://uses.tech" target="_blank" rel="noopener noreferrer" class="underline">/uses page</a>.
			</p>
		</div>

		{#if page.software.length}
			<div in:fly={{ y: 20, duration: 400, delay: 80 }}>
				<h2 class="text-ocean-900 dark:text-ocean-100 text-lg mb-3">software & setup</h2>
				<dl class="grid sm:grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
					{#each page.software as sw}
						<dt class="text-ocean-500 uppercase text-[0.7rem] tracking-wide sm:pt-0.5">{sw.label}</dt>
						<dd class="text-ocean-900 dark:text-ocean-100 -mt-1 sm:mt-0 mb-2 sm:mb-0">
							{sw.value}{#if sw.sub}<span class="text-ocean-600 dark:text-ocean-400"> · {sw.sub}</span>{/if}
						</dd>
					{/each}
				</dl>
			</div>
		{/if}

		{#each groups as group, gi}
			<div in:fly={{ y: 20, duration: 400, delay: 140 + gi * 80 }}>
				<h2 class="text-ocean-900 dark:text-ocean-100 text-lg mb-3">{group.title}</h2>
				<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{#each group.items as item}
						<div class="flex items-center gap-3 rounded-xl border border-ocean-300/70 dark:border-ocean-700/70 bg-ocean-100/40 dark:bg-ocean-900/40 p-3">
							{#if item.image}
								<img src={item.image} alt="" loading="lazy" class="w-14 h-14 object-contain rounded-lg bg-ocean-200/40 dark:bg-ocean-800/40 shrink-0" />
							{/if}
							<div class="min-w-0">
								<p class="text-[0.7rem] uppercase tracking-wide text-ocean-600 dark:text-ocean-500">{item.label}</p>
								<p class="text-ocean-900 dark:text-ocean-100 text-sm leading-snug">{item.value}</p>
								{#if item.sub}<p class="text-[0.7rem] text-ocean-600 dark:text-ocean-500">{item.sub}</p>{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</section>
