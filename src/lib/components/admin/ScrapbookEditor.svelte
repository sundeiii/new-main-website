<script lang="ts">
	// /admin → scrapbook: pages, and the polaroids, notes, tickets and stickers on each.
	import { createEventDispatcher } from 'svelte';
	import { danger, field, fieldLabel, subtle } from './styles';
	import UploadButton from './UploadButton.svelte';
	import type { ScrapbookSettings, ScrapItem } from '$lib/siteSettings';
	import { PAPER, STICKERS } from '$lib/scrapbook';

	export let scrapbook: ScrapbookSettings;
	const dispatch = createEventDispatcher<{ error: string }>();

	let open = 0;
	$: page = scrapbook.pages[open];

	const blank = (kind: ScrapItem['kind']): ScrapItem => ({
		kind,
		image: '',
		text: kind === 'sticker' ? 'star' : '',
		sub: '',
		date: kind === 'photo' ? new Date().toISOString().slice(0, 10) : '',
		color: kind === 'ticket' ? 'gold' : 'cream',
		tilt: null,
		tape: 'auto',
		size: kind === 'sticker' ? 's' : 'm'
	});

	function addPage() {
		scrapbook.pages = [{ title: 'new page', date: new Date().toISOString().slice(0, 10), note: '', items: [] }, ...scrapbook.pages];
		open = 0;
	}
	function removePage() {
		if (!page || !confirm(`Remove the page "${page.title}" and everything on it? (uploaded photos stay on the CDN)`)) return;
		scrapbook.pages = scrapbook.pages.filter((_, i) => i !== open);
		open = Math.max(0, open - 1);
	}
	function movePage(d: number) {
		const j = open + d;
		if (j < 0 || j >= scrapbook.pages.length) return;
		const pages = [...scrapbook.pages];
		[pages[open], pages[j]] = [pages[j], pages[open]];
		scrapbook.pages = pages;
		open = j;
	}
	function addItem(kind: ScrapItem['kind']) {
		if (!page) return;
		page.items = [...page.items, blank(kind)];
		scrapbook = scrapbook;
	}
	function moveItem(i: number, d: number) {
		const j = i + d;
		if (!page || j < 0 || j >= page.items.length) return;
		const items = [...page.items];
		[items[i], items[j]] = [items[j], items[i]];
		page.items = items;
		scrapbook = scrapbook;
	}
	function removeItem(i: number) {
		if (!page) return;
		page.items = page.items.filter((_, k) => k !== i);
		scrapbook = scrapbook;
	}
	const tiltText = (t: number | null) => (t === null ? '' : String(t));
	const parseTilt = (v: string) => (v.trim() === '' || isNaN(Number(v)) ? null : Number(v));
	const kinds: ScrapItem['kind'][] = ['photo', 'note', 'ticket', 'sticker'];
	const kindLabel = { photo: '◫ polaroid', note: '✎ note', ticket: '▭ ticket', sticker: '✦ sticker' };
</script>

<div class="flex flex-col gap-6">
	<div>
		<label for="sb-intro" class={fieldLabel}>intro</label>
		<textarea id="sb-intro" bind:value={scrapbook.intro} rows="2" maxlength="400" class={field} />
	</div>

	<div class="flex flex-wrap items-center gap-2">
		{#each scrapbook.pages as p, i}
			<button on:click={() => (open = i)} class="px-3 py-1 rounded-full text-sm {open === i ? 'accent-bg' : 'border border-ocean-300/70 dark:border-ocean-700/70 text-ocean-700 dark:text-ocean-300'}">{p.title || `page ${i + 1}`}</button>
		{/each}
		<button on:click={addPage} class={subtle}>+ page</button>
	</div>
	<p class="text-xs text-ocean-500 -mt-3">pages show in this order, the first one at the top.</p>

	{#if page}
		<div class="flex flex-col gap-4 border border-ocean-300 dark:border-ocean-700 rounded-2xl p-4">
			<div class="grid gap-3 sm:grid-cols-[1fr_10rem]">
				<div><label for="sb-title" class={fieldLabel}>page title</label><input id="sb-title" bind:value={page.title} maxlength="80" class={field} /></div>
				<div><label for="sb-date" class={fieldLabel}>date</label><input id="sb-date" bind:value={page.date} maxlength="30" placeholder="2026-11 or summer" class={field} /></div>
			</div>
			<div><label for="sb-note" class={fieldLabel}>a line under the title</label><input id="sb-note" bind:value={page.note} maxlength="200" class={field} /></div>
			<div class="flex flex-wrap gap-2">
				<button on:click={() => movePage(-1)} class={subtle} disabled={open === 0}>↑ move page up</button>
				<button on:click={() => movePage(1)} class={subtle} disabled={open === scrapbook.pages.length - 1}>↓ move page down</button>
				<button on:click={removePage} class={danger}>remove page</button>
			</div>

			<div class="flex flex-col gap-3">
				{#each page.items as item, i}
					<div class="rounded-xl border border-ocean-300/70 dark:border-ocean-700/70 p-3 flex flex-col gap-3">
						<div class="flex flex-wrap items-center gap-2">
							<span class="text-sm text-ocean-900 dark:text-ocean-100">{kindLabel[item.kind]}</span>
							<span class="flex-1" />
							<button on:click={() => moveItem(i, -1)} class={subtle} disabled={i === 0} aria-label="move up">▲</button>
							<button on:click={() => moveItem(i, 1)} class={subtle} disabled={i === page.items.length - 1} aria-label="move down">▼</button>
							<button on:click={() => removeItem(i)} class={danger} aria-label="remove">✕</button>
						</div>

						{#if item.kind === 'photo' || item.kind === 'sticker'}
							<div class="flex gap-2 items-center">
								{#if item.image}<img src={item.image} alt="" class="w-12 h-12 object-cover rounded shrink-0" />{/if}
								<input bind:value={item.image} maxlength="500" placeholder={item.kind === 'sticker' ? 'picture (or leave empty for a built-in sticker)' : 'photo address'} class={field} />
								<UploadButton folder="gallery" maxSize={item.kind === 'photo' ? 1600 : 600} on:uploaded={(e) => ((item.image = e.detail), (scrapbook = scrapbook))} on:error={(e) => dispatch('error', e.detail)} />
							</div>
						{/if}

						{#if item.kind === 'sticker' && !item.image}
							<div class="flex flex-wrap gap-2">
								{#each Object.keys(STICKERS) as s}
									<button on:click={() => ((item.text = s), (scrapbook = scrapbook))} class="px-2.5 py-1 rounded-full text-xs {item.text === s ? 'accent-bg' : 'border border-ocean-300/70 dark:border-ocean-700/70 text-ocean-700 dark:text-ocean-300'}">{s}</button>
								{/each}
							</div>
						{:else if item.kind === 'note'}
							<textarea bind:value={item.text} rows="3" maxlength="400" placeholder="what the note says" class={field} />
						{:else if item.kind !== 'sticker'}
							<input bind:value={item.text} maxlength="400" placeholder={item.kind === 'photo' ? 'caption' : 'ticket title'} class={field} />
						{/if}

						<div class="grid gap-2 grid-cols-2 sm:grid-cols-5">
							{#if item.kind === 'note' || item.kind === 'ticket'}
								<input bind:value={item.sub} maxlength="120" placeholder={item.kind === 'note' ? 'signed' : 'line under the title'} class="{field} col-span-2" />
							{/if}
							{#if item.kind !== 'sticker'}<input bind:value={item.date} maxlength="30" placeholder="date" class={field} />{/if}
							{#if item.kind === 'note' || item.kind === 'ticket'}
								<select bind:value={item.color} class={field} aria-label="paper colour">
									{#each Object.keys(PAPER) as c}<option value={c}>{c} paper</option>{/each}
								</select>
							{/if}
							<select bind:value={item.size} class={field} aria-label="size">
								<option value="s">small</option><option value="m">medium</option><option value="l">large</option>
							</select>
							<select bind:value={item.tape} class={field} aria-label="tape">
								<option value="auto">tape: random</option><option value="none">no tape</option><option value="top">tape on top</option><option value="corners">tape on corners</option><option value="side">tape on the side</option>
							</select>
							<input value={tiltText(item.tilt)} on:input={(e) => ((item.tilt = parseTilt(e.currentTarget.value)), (scrapbook = scrapbook))} placeholder="tilt° (random)" class={field} aria-label="tilt in degrees" />
						</div>
					</div>
				{/each}
			</div>

			<div class="flex flex-wrap gap-2">
				<span class="text-xs text-ocean-500 self-center">add:</span>
				{#each kinds as k}
					<button on:click={() => addItem(k)} class={subtle}>+ {kindLabel[k]}</button>
				{/each}
			</div>
		</div>
	{:else}
		<p class="text-sm text-ocean-600 dark:text-ocean-400">no pages yet.</p>
	{/if}
</div>
