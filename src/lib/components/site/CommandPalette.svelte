<script lang="ts">
	import { createEventDispatcher, tick } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	// Ctrl/⌘+K (or "/") search across the site, plus a few actions. Site content is fetched the
	// first time it opens.

	export let open = false;
	export let pages: { href: string; label: string }[];
	export let themes: { id: string; name: string }[];

	export let extraActions: { label: string; hint?: string; icon: string; run: () => void }[] = [];

	const dispatch = createEventDispatcher<{ navigate: string; toggleDark: void; setDark: boolean; setTheme: string; close: void }>();

	interface Item {
		group: string;
		label: string;
		hint?: string;
		icon: string;
		href?: string; // internal page
		url?: string; // other site, opens in a new tab
		run?: () => void;
	}

	let query = '';
	let active = 0;
	let input: HTMLInputElement;
	let listEl: HTMLDivElement;
	let content: Item[] = [];
	let latest: Item[] = []; // newest guestbook messages, shown before you type anything
	let loaded = false;
	let loading = false;

	const getJson = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null);

	async function loadContent() {
		if (loaded || loading) return;
		loading = true;
		const [posts, events, projects, tournaments, osu, guestbook, live] = await Promise.all([
			getJson('/api/blog'),
			getJson('/api/blog?kind=event'),
			getJson('/api/blog?kind=project'),
			getJson('/api/tournaments'),
			getJson('/api/site/osu'),
			getJson('/api/guestbook'),
			getJson('/api/site/live')
		]);
		const short = (s: string, n = 70) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
		const notes = ((guestbook ?? []) as any[]).map((g) => ({ group: 'guestbook', label: `${g.name}: ${short(g.message.replace(/\s+/g, ' '))}`, hint: new Date(g.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), icon: '✉', href: '/guestbook' }));
		latest = notes.slice(0, 3).map((n) => ({ ...n, group: 'latest in the guestbook' }));
		content = [
			...(posts ?? []).map((p: any) => ({ group: 'posts', label: p.title, hint: p.date, icon: '✎', href: `/blog/${p.slug}` })),
			...(events ?? []).map((e: any) => ({ group: 'events', label: e.title, hint: [e.date, e.location].filter(Boolean).join(' · '), icon: '◷', href: `/events/${e.slug}` })),
			...(projects ?? []).map((p: any) => ({ group: 'projects', label: p.title, hint: p.excerpt, icon: '◇', href: `/projects/${p.slug}` })),
			...(live?.show && live.name ? [{ group: 'tournaments', label: `live: ${live.name}`, hint: live.stage || 'happening now', icon: '●', href: '/tournaments#live' }] : []),
			// Jumps to the card on /tournaments (the forum post is linked from there).
			...(tournaments ?? []).flatMap((y: any) =>
				y.events.map((t: any) => ({ group: 'tournaments', label: t.name, hint: `${t.role} · ${y.year}`, icon: '◎', href: t.id != null ? `/tournaments#t-${t.id}` : undefined, url: t.id != null ? undefined : t.link }))
			),
			...notes,
			...(osu?.maps ?? []).map((m: any) => ({ group: 'maps i love', label: m.title, hint: [m.mapper, m.stars ? `${m.stars}★` : ''].filter(Boolean).join(' · '), icon: '●', url: m.url }))
		];
		loaded = true;
		loading = false;
	}

	$: base = [
		...pages.map((p) => ({ group: 'pages', label: p.label, hint: p.href, icon: '→', href: p.href })),
		{ group: 'actions', label: 'toggle dark mode', icon: '◐', run: () => dispatch('toggleDark') },
		{ group: 'actions', label: 'dark mode', hint: 'dark', icon: '☾', run: () => dispatch('setDark', true) },
		{ group: 'actions', label: 'light mode', hint: 'light', icon: '☀', run: () => dispatch('setDark', false) },
		...themes.map((t) => ({ group: 'actions', label: `theme ${t.name}`, hint: 'theme', icon: '◉', run: () => dispatch('setTheme', t.id) })),
		...extraActions.map((a) => ({ group: 'actions', ...a })),
		{ group: 'actions', label: 'copy email address', hint: 'sundei@sundei.ee', icon: '@', run: () => navigator.clipboard?.writeText('sundei@sundei.ee') }
	] as Item[];

	// Every word has to appear somewhere; matches at the start of the name come first.
	$: words = query.toLowerCase().split(/\s+/).filter(Boolean);
	// Typing just "dark", "light" or a theme's name puts that action first.
	$: exact = words.length === 1 ? base.find((i) => i.hint === words[0] || i.label === `theme ${words[0]}`) : undefined;
	$: results = (words.length ? [...base, ...content] : [...base, ...latest])
		.map((item) => {
			const name = item.label.toLowerCase();
			const hay = `${name} ${item.hint ?? ''} ${item.group}`.toLowerCase();
			if (!words.every((w) => hay.includes(w))) return null;
			const score = item === exact ? -10 : (name.startsWith(words[0] ?? '') ? 0 : name.includes(words[0] ?? '') ? 1 : 2) + (item.group === 'pages' ? -0.5 : 0);
			return { item, score };
		})
		.filter((r): r is { item: Item; score: number } => !!r)
		.sort((a, b) => a.score - b.score)
		.slice(0, 40)
		.map((r) => r.item);
	// Keep each group together, in the order its best match appears.
	$: grouped = [...new Set(results.map((r) => r.group))].map((g) => ({ group: g, items: results.filter((r) => r.group === g) }));
	$: flat = grouped.flatMap((g) => g.items);
	$: query, (active = 0);

	$: if (open) {
		loadContent();
		tick().then(() => input?.focus());
	} else {
		query = '';
	}

	function choose(item: Item | undefined) {
		if (!item) return;
		dispatch('close');
		if (item.run) item.run();
		else if (item.url) window.open(item.url, '_blank', 'noopener');
		else if (item.href) dispatch('navigate', item.href);
	}

	async function onKey(e: KeyboardEvent) {
		if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			e.preventDefault();
			active = (active + (e.key === 'ArrowDown' ? 1 : -1) + flat.length) % Math.max(flat.length, 1);
			await tick();
			listEl?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
		} else if (e.key === 'Enter') {
			e.preventDefault();
			choose(flat[active]);
		} else if (e.key === 'Escape') {
			dispatch('close');
		}
	}
</script>

{#if open}
	<div class="fixed inset-0 z-[150] flex items-start justify-center px-4 pt-[12vh] font-cascadia" role="dialog" aria-modal="true" aria-label="search and commands">
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<div class="absolute inset-0 bg-black/40 backdrop-blur-sm" on:click={() => dispatch('close')} transition:fade={{ duration: 150 }} />
		<div
			class="relative w-full max-w-xl overflow-hidden rounded-2xl border border-ocean-300/60 dark:border-ocean-700/60 glass-strong shadow-2xl"
			transition:scale={{ start: 0.97, duration: 180, easing: cubicOut }}
		>
			<div class="flex items-center gap-3 px-4 border-b border-ocean-300/50 dark:border-ocean-700/50">
				<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 shrink-0 text-ocean-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" /></svg>
				<input
					bind:this={input}
					bind:value={query}
					on:keydown={onKey}
					placeholder="search everything… or try “dark”"
					class="flex-1 bg-transparent py-4 text-sm text-ocean-900 dark:text-ocean-100 placeholder:text-ocean-500 outline-none"
					aria-label="search"
					aria-activedescendant={flat[active] ? `cmd-${active}` : undefined}
				/>
				<kbd class="text-[10px] text-ocean-500 border border-ocean-300/70 dark:border-ocean-700/70 rounded px-1.5 py-0.5">esc</kbd>
			</div>
			<div bind:this={listEl} class="max-h-[55vh] overflow-y-auto p-2" role="listbox">
				{#each grouped as g}
					<div class="px-3 pt-3 pb-1 text-[10px] uppercase tracking-widest text-ocean-500">{g.group}</div>
					{#each g.items as item}
						{@const i = flat.indexOf(item)}
						<button
							id="cmd-{i}"
							role="option"
							aria-selected={i === active}
							data-active={i === active}
							on:click={() => choose(item)}
							on:mousemove={() => (active = i)}
							class="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors {i === active ? 'accent-soft' : ''}"
						>
							<span class="w-5 text-center text-ocean-500 shrink-0">{item.icon}</span>
							<span class="min-w-0 flex-1">
								<span class="block truncate text-ocean-900 dark:text-ocean-100">{item.label}</span>
								{#if item.hint}<span class="block truncate text-xs text-ocean-600 dark:text-ocean-400">{item.hint}</span>{/if}
							</span>
							{#if item.url}<span class="text-xs text-ocean-500">↗</span>{:else if i === active}<span class="text-xs text-ocean-500">↵</span>{/if}
						</button>
					{/each}
				{:else}
					<p class="px-3 py-6 text-center text-sm text-ocean-500">{loading ? 'loading…' : `nothing found for "${query}"`}</p>
				{/each}
			</div>
			<div class="flex items-center gap-4 px-4 py-2 border-t border-ocean-300/50 dark:border-ocean-700/50 text-[10px] text-ocean-500">
				<span>↑↓ move</span><span>↵ open</span><span>esc close</span>
				{#if !words.length}<span class="ml-auto">type to search everything</span>{/if}
			</div>
		</div>
	</div>
{/if}
