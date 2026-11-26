<script lang="ts">
	// Your passport: every stamp there is to find on the site, the ones you have (kept in this
	// browser) and hints for the rest, with how many people found each.
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { app } from '$lib/components/site/app';
	import { COLLECTIBLES } from '$lib/collectibles';
	import { collect, forgetPassport, passport } from '$lib/components/cozy/collect';
	import PassportStamp from '$lib/components/cozy/PassportStamp.svelte';

	let counts: Record<string, number> = {};
	let mounted = false;
	onMount(() => {
		mounted = true;
		collect('passport');
		fetch('/api/found')
			.then((r) => (r.ok ? r.json() : null))
			.then((d) => d && (counts = d.counts))
			.catch(() => {});
	});

	$: have = mounted ? $passport.stamps : {};
	const sections = [
		{ id: 'site', title: 'around the site', items: COLLECTIBLES.filter((c) => c.group !== 'ryo') },
		{ id: 'ryo', title: 'ryo', items: COLLECTIBLES.filter((c) => c.group === 'ryo') }
	];
	$: got = COLLECTIBLES.filter((c) => have[c.id]).length;
	$: everything = got === COLLECTIBLES.length;

	function forget() {
		if (confirm('forget every stamp you found? you can find them all again.')) forgetPassport();
	}

	const rise = (i: number) => (app.hydrated ? { y: 12, duration: 500, delay: 60 + i * 70, easing: cubicOut } : { duration: 0 });
	const muted = 'text-ocean-600 dark:text-ocean-400';
	const strong = 'text-ocean-900 dark:text-ocean-100';
</script>

<svelte:head>
	<title>passport</title>
	<meta property="og:title" content="passport" />
	<meta name="description" content="little things hidden around sundei.ee. how many have you found?" />
	<meta property="og:description" content="little things hidden around sundei.ee. how many have you found?" />
</svelte:head>

<section class="px-8 sm:px-12 lg:px-24 pt-8 sm:pt-12 pb-4 font-cascadia flex flex-col gap-8">
	<header class="flex flex-col gap-3 max-w-2xl" in:fly={rise(0)}>
		<h1 class="text-3xl {strong}">passport</h1>
		<p class="text-sm {muted} leading-relaxed">
			little things are hidden around this site. find one and it gets stamped in here. your stamps stay in this browser, so nobody else sees them.
		</p>
		<div class="flex items-center gap-4">
			<div class="w-48 sm:w-64 h-1.5 rounded-full bg-ocean-300 dark:bg-ocean-700 overflow-hidden">
				<div class="h-full accent-bg rounded-full transition-all duration-700" style="width: {(got / COLLECTIBLES.length) * 100}%" />
			</div>
			<span class="text-sm tabular-nums {strong}">{got} / {COLLECTIBLES.length}</span>
		</div>
		{#if everything}<p class="text-sm {strong}">✦ every stamp. you've seen everything this site has to hide. thank you for looking so closely.</p>{/if}
	</header>

	{#each sections as section, si}
	<div class="flex flex-col gap-3" in:fly={rise(1 + si)}>
	<span class="text-[11px] uppercase tracking-widest text-ocean-500">{section.title} · {section.items.filter((c) => have[c.id]).length} / {section.items.length}</span>
	<div id={section.id} class="booklet rounded-2xl p-5 sm:p-8 grid gap-x-6 gap-y-8 grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] justify-items-center scroll-mt-24">
		{#each section.items as stamp, i (stamp.id)}
			<div class="flex flex-col items-center gap-2 text-center" style="--r: {((i * 37) % 9) - 4}deg">
				<div class="tilt"><PassportStamp {stamp} found={have[stamp.id] ?? null} /></div>
				<p class="text-[11px] leading-snug max-w-[9rem] text-[#2a3248] dark:text-ocean-200 {have[stamp.id] ? 'opacity-90' : 'opacity-60 italic'}">
					{have[stamp.id] ? stamp.note : stamp.hint}
				</p>
				{#if counts[stamp.id]}<p class="text-[10px] text-ocean-500 tabular-nums">found by {counts[stamp.id].toLocaleString('en-US')} {counts[stamp.id] === 1 ? 'person' : 'people'}</p>{/if}
			</div>
		{/each}
	</div>
	</div>
	{/each}

	{#if got > 1}
		<button on:click={forget} class="w-fit text-xs text-ocean-500 hover:text-red-500 transition-colors">forget my stamps</button>
	{/if}
</section>

<style>
	.booklet {
		background: radial-gradient(circle, rgb(42 50 72 / 0.1) 1px, transparent 1.5px) 0 0 / 20px 20px, #f1ece0;
	}
	:global(.dark) .booklet {
		background: radial-gradient(circle, rgb(200 210 230 / 0.08) 1px, transparent 1.5px) 0 0 / 20px 20px, #1b2234;
	}
	.tilt {
		transform: rotate(var(--r));
		transition: transform 0.25s;
	}
	.tilt:hover {
		transform: rotate(0) scale(1.06);
	}
</style>
