<script context="module" lang="ts">
	import type { Load } from '@sveltejs/kit';

	// The guestbook: the entries come with the page (no loading spinner), the sign form sits
	// in the side column, and messages are notes on a wall.
	export const load: Load = async ({ fetch }) => {
		const res = await fetch('/api/guestbook').catch(() => null);
		return { props: { initial: res?.ok ? await res.json() : null } };
	};
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { REACTIONS, STAMPS, stampById } from '$lib/stamps';
	import { app } from '$lib/components/site/app';
	import { stickyAside } from '$lib/components/site/sticky';

	export let initial: any[] | null;

	const rise = (i: number) => (app.hydrated ? { y: 12, duration: 500, delay: 60 + i * 70, easing: cubicOut } : { duration: 0 });

	let entries: any[] = initial ?? [];
	const failed = initial === null;

	// Form
	let nameInput = '';
	let messageInput = '';
	let stamp = '';
	let website = ''; // honeypot: hidden from people, bots fill it in
	let submitting = false;
	let submitError = '';
	let submitSuccess = false;

	// Reactions this browser has given, as "entryId:reaction" (the server keeps the real record).
	let mine = new Set<string>();
	let picker = ''; // entry whose reaction picker is open
	onMount(() => {
		nameInput = localStorage.getItem('guestbook-name') ?? '';
		try {
			mine = new Set(JSON.parse(localStorage.getItem('guestbook-reacted') ?? '[]'));
		} catch {}
	});
	const reactionsOf = (entry: any) =>
		REACTIONS.filter((r) => entry.reactions?.[r.id] > 0).map((r) => ({ ...r, count: entry.reactions[r.id] as number }));

	async function react(entry: any, reaction: string) {
		picker = '';
		const key = `${entry.id}:${reaction}`;
		const had = mine.has(key);
		// Show it straight away; the server's counts replace this when they arrive.
		const set = (reactions: Record<string, number>, on: boolean) => {
			entries = entries.map((e) => (e.id === entry.id ? { ...e, reactions } : e));
			on ? mine.add(key) : mine.delete(key);
			mine = mine;
			try {
				localStorage.setItem('guestbook-reacted', JSON.stringify([...mine]));
			} catch {}
		};
		const before = entry.reactions ?? {};
		set({ ...before, [reaction]: Math.max(0, (before[reaction] ?? 0) + (had ? -1 : 1)) }, !had);
		try {
			const res = await fetch('/api/guestbook/react', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: entry.id, reaction })
			});
			if (!res.ok) throw new Error();
			const data = await res.json();
			set(data.reactions, data.on);
		} catch {
			set(before, had);
		}
	}
	$: if (typeof window !== 'undefined' && nameInput) localStorage.setItem('guestbook-name', nameInput);

	async function submitEntry() {
		if (!nameInput.trim() || !messageInput.trim()) return;
		submitting = true;
		submitError = '';
		submitSuccess = false;
		try {
			const res = await fetch('/api/guestbook', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ website, stamp: stamp || null, name: nameInput.trim(), message: messageInput.trim() })
			});
			const data = await res.json().catch(() => ({}));
			if (res.ok) {
				entries = [data, ...entries];
				messageInput = '';
				stamp = '';
				submitSuccess = true;
				setTimeout(() => (submitSuccess = false), 3000);
			} else {
				submitError = data.error || 'failed to post';
			}
		} catch {
			submitError = 'failed to post';
		} finally {
			submitting = false;
		}
	}

	function timeAgo(dateStr: string): string {
		const diff = Date.now() - new Date(dateStr).getTime();
		const minutes = Math.floor(diff / 60000), hours = Math.floor(diff / 3600000), days = Math.floor(diff / 86400000);
		if (minutes < 1) return 'just now';
		if (minutes < 60) return `${minutes}m ago`;
		if (hours < 24) return `${hours}h ago`;
		if (days < 7) return `${days}d ago`;
		return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
	}
	// Entry 1 → column 1, entry 2 → column 2, … so the newest ones run along the top row.
	const deal = <T,>(list: T[], n: number) => Array.from({ length: n }, (_, c) => list.filter((_, i) => i % n === c));
	$: layouts = [
		{ show: 'flex md:hidden', columns: deal(entries, 1) },
		{ show: 'hidden md:flex 2xl:hidden', columns: deal(entries, 2) },
		{ show: 'hidden 2xl:flex', columns: deal(entries, 3) }
	];

	// A small, stable tilt per entry for the stamp.
	const tilt = (id: string) => ((id?.charCodeAt(0) ?? 0) % 21) - 10;

	const label = 'text-[11px] uppercase tracking-widest text-ocean-500';
	const muted = 'text-ocean-600 dark:text-ocean-400';
	const strong = 'text-ocean-900 dark:text-ocean-100';
	const input = 'w-full rounded-xl glass border border-ocean-300/60 dark:border-ocean-700/60 px-3 py-2 text-sm text-ocean-900 dark:text-ocean-100 placeholder:text-ocean-500 outline-none focus:border-[color:var(--accent)] transition-colors';
</script>

<svelte:window on:click={() => (picker = '')} on:keydown={(e) => e.key === 'Escape' && (picker = '')} />

<svelte:head>
	<title>guestbook</title>
	<meta property="og:title" content="guestbook" />
	<meta name="description" content="leave a message!" />
	<meta property="og:description" content="leave a message!" />
</svelte:head>

<section class="px-8 sm:px-12 lg:px-24 pt-8 sm:pt-12 pb-4 font-cascadia grid gap-14 lg:grid-cols-[19rem_1fr] xl:gap-20">
	<!-- ── sign it ── -->
	<aside use:stickyAside class="flex flex-col gap-6 lg:self-start" in:fly={rise(0)}>
		<div>
			<h1 class="text-3xl {strong}">guestbook</h1>
			<p class="text-sm {muted} mt-2">leave a message! · {entries.length} so far</p>
		</div>

		<form on:submit|preventDefault={submitEntry} class="flex flex-col gap-3">
			<input bind:value={nameInput} type="text" placeholder="your name" maxlength="50" aria-label="your name" class={input} />
			<div class="relative">
				<textarea bind:value={messageInput} rows="4" placeholder="write a message…" maxlength="500" aria-label="message" class="{input} resize-none" />
				<span class="absolute bottom-2 right-3 text-[10px] text-ocean-500 tabular-nums">{messageInput.length}/500</span>
			</div>

			<div class="flex flex-col gap-1.5">
				<span class={label}>stamp (optional)</span>
				<div class="grid grid-cols-6 gap-1" role="radiogroup" aria-label="pick a stamp">
					{#each STAMPS as s}
						<button
							type="button"
							role="radio"
							aria-checked={stamp === s.id}
							title={s.label}
							on:click={() => (stamp = stamp === s.id ? '' : s.id)}
							class="aspect-square rounded-lg text-base transition-all duration-200 {stamp === s.id ? 'accent-soft scale-110 -rotate-6' : 'opacity-60 hover:opacity-100 hover:bg-ocean-200/50 dark:hover:bg-ocean-800/50'}"
						>
							{s.emoji}
						</button>
					{/each}
				</div>
			</div>

			<!-- Honeypot: hidden from people and screen readers; bots that fill every field get rejected -->
			<div class="absolute -left-[9999px] w-px h-px overflow-hidden" aria-hidden="true">
				<label>website <input bind:value={website} type="text" name="website" tabindex="-1" autocomplete="off" /></label>
			</div>

			<div class="flex items-center gap-3">
				<button
					type="submit"
					disabled={submitting || !nameInput.trim() || !messageInput.trim()}
					class="px-5 py-2 rounded-full text-sm accent-bg transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
					style="color: var(--accent-fg)"
				>
					{submitting ? 'signing…' : 'sign'}
				</button>
				{#if submitSuccess}<span class="text-xs text-green-600 dark:text-green-400" in:fade={{ duration: 200 }}>posted, thank you!</span>{/if}
				{#if submitError}<span class="text-xs text-red-500" in:fade={{ duration: 200 }}>{submitError}</span>{/if}
			</div>
		</form>
	</aside>

	<!-- ── the wall ── -->
	<div class="min-w-0" in:fly={rise(1)}>
		{#if failed}
			<p class="text-red-500 text-sm">couldn't load the guestbook right now.</p>
		{:else if !entries.length}
			<div class="glass rounded-2xl border border-ocean-300/50 dark:border-ocean-700/50 p-8 text-center {muted}">no entries yet. be the first to sign!</div>
		{:else}
			<!-- Newest first, reading left to right: entries are dealt out over the columns in turn.
			     There's a 1-, 2- and 3-column version and CSS shows the one that fits, so the
			     server can send the final layout and nothing reshuffles while the page loads. -->
			{#each layouts as layout}
				<div class="{layout.show} gap-3 items-start">
					{#each layout.columns as column}
						<div class="flex-1 min-w-0 flex flex-col gap-3">
							{#each column as entry (entry.id)}
								{@const s = stampById(entry.stamp)}
								<article class="relative glass rounded-2xl border border-ocean-300/50 dark:border-ocean-700/50 p-4 {s ? 'pr-14' : ''}" in:scale|local={{ start: 0.95, duration: 300, easing: cubicOut }}>
									{#if s}
										<span
											class="absolute top-3 right-3 w-9 h-9 grid place-items-center text-lg rounded-lg border-2 border-dashed border-ocean-400/60 dark:border-ocean-600/60"
											style="transform: rotate({tilt(entry.id)}deg)"
											title={s.label}
											aria-label="stamp: {s.label}">{s.emoji}</span
										>
									{/if}
									<div class="flex items-baseline gap-2 mb-1.5">
										<span class="text-sm {strong}">{entry.name}</span>
										<span class="text-xs text-ocean-500">{timeAgo(entry.created_at)}</span>
									</div>
									<p class="text-sm text-ocean-800 dark:text-ocean-200 whitespace-pre-wrap break-words leading-relaxed">{entry.message}</p>
									<div class="flex flex-wrap items-center gap-1 mt-3">
										{#each reactionsOf(entry) as r (r.id)}
											<button
												on:click={() => react(entry, r.id)}
												class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all active:scale-90 {mine.has(`${entry.id}:${r.id}`)
													? 'accent-soft border-[color:var(--accent)] text-ocean-900 dark:text-ocean-100'
													: 'border-ocean-300/60 dark:border-ocean-700/60 text-ocean-600 dark:text-ocean-400 hover:border-ocean-500'}"
												title={r.label}
												aria-pressed={mine.has(`${entry.id}:${r.id}`)}
												in:scale|local={{ start: 0.6, duration: 200 }}
											>
												<span>{r.emoji}</span><span class="tabular-nums">{r.count}</span>
											</button>
										{/each}
										<div class="relative">
											<button
												on:click|stopPropagation={() => (picker = picker === entry.id ? '' : entry.id)}
												class="w-7 h-6 grid place-items-center rounded-full text-xs text-ocean-500 border border-transparent hover:border-ocean-300/60 dark:hover:border-ocean-700/60 transition-colors {reactionsOf(entry).length ? '' : 'opacity-50 hover:opacity-100'}"
												aria-label="react"
												aria-expanded={picker === entry.id}
												title="react">☺+</button
											>
											{#if picker === entry.id}
												<div class="absolute left-full ml-1 top-1/2 -translate-y-1/2 z-20 flex gap-0.5 p-1 rounded-full glass-strong border border-ocean-300/60 dark:border-ocean-700/60 shadow-lg" transition:fly|local={{ x: -4, duration: 150 }}>
													{#each REACTIONS as r}
														<button on:click|stopPropagation={() => react(entry, r.id)} class="w-8 h-8 grid place-items-center rounded-full text-base hover:bg-ocean-200/60 dark:hover:bg-ocean-800/60 hover:scale-125 transition-transform {mine.has(`${entry.id}:${r.id}`) ? 'accent-soft' : ''}" title={r.label} aria-label={r.label}>{r.emoji}</button>
													{/each}
												</div>
											{/if}
										</div>
									</div>
								</article>
							{/each}
						</div>
					{/each}
				</div>
			{/each}
		{/if}
	</div>
</section>
