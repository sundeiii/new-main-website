<script context="module" lang="ts">
	// All my profiles in one place (edited in /admin → pages → links).
	import type { Load } from '@sveltejs/kit';

	export const load: Load = async ({ fetch }) => {
		const res = await fetch('/api/site/links').catch(() => null);
		return { props: { links: res?.ok ? await res.json() : null } };
	};
</script>

<script lang="ts">
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { settingDefaults, type LinksSettings } from '$lib/siteSettings';
	import { app } from '$lib/components/site/app';

	export let links: LinksSettings | null;
	$: page = links ?? settingDefaults.links;
	$: groups = page.groups.filter((g) => g.items.length);

	const external = (href: string) => /^https?:\/\//.test(href);
	const rise = (i: number) => (app.hydrated ? { y: 12, duration: 500, delay: 60 + i * 70, easing: cubicOut } : { duration: 0 });
	const label = 'text-[11px] uppercase tracking-widest text-ocean-500';
	const muted = 'text-ocean-600 dark:text-ocean-400';
	const strong = 'text-ocean-900 dark:text-ocean-100';
</script>

<svelte:head>
	<title>links</title>
	<meta property="og:title" content="links" />
	<meta name="description" content="everywhere you can find sundei" />
	<meta property="og:description" content="everywhere you can find sundei" />
	{#each groups as g}{#each g.items.filter((l) => external(l.href)) as l}<link rel="me" href={l.href} />{/each}{/each}
</svelte:head>

<section class="px-8 sm:px-12 lg:px-24 pt-8 sm:pt-12 pb-4 font-cascadia flex flex-col gap-12 max-w-3xl">
	<header in:fly={rise(0)}>
		<h1 class="text-3xl {strong}">links</h1>
		{#if page.intro}<p class="text-sm {muted} mt-2">{page.intro}</p>{/if}
	</header>

	{#each groups as g, gi}
		<div class="flex flex-col gap-3" in:fly={rise(1 + gi)}>
			{#if g.title}<span class={label}>{g.title}</span>{/if}
			<div class="flex flex-col gap-2">
				{#each g.items as l}
					<a
						href={l.href}
						target={external(l.href) ? '_blank' : undefined}
						rel={external(l.href) ? 'noopener noreferrer me' : undefined}
						class="group glass rounded-2xl border border-ocean-300/50 dark:border-ocean-700/50 px-4 py-3 flex items-center gap-4 transition-transform duration-200 hover:-translate-y-0.5"
					>
						<span class="min-w-0 flex-1">
							<span class="block {strong}">{l.label}{#if l.handle}<span class="{muted} text-sm"> · {l.handle}</span>{/if}</span>
							{#if l.note}<span class="block text-xs {muted} mt-0.5">{l.note}</span>{/if}
						</span>
						<span class="{muted} shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true">{external(l.href) ? '↗' : '→'}</span>
					</a>
				{/each}
			</div>
		</div>
	{/each}
</section>
