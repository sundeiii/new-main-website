<script lang="ts">
	// /admin → ryo → dialogue: every line she can say, with search, filters, an editor per line
	// (category, expression, rarity, weight, cooldown, conditions, anime source), bulk actions and
	// JSON import/export. Changes are kept in the page until "save" in the companion admin.
	import { createEventDispatcher } from 'svelte';
	import { danger, field, fieldLabel, subtle } from '../styles';
	import { CATEGORIES, EXPRESSIONS, RARITIES, TIMES, WEATHERS, type Category, type DialogueEntry } from '$lib/companion/types';

	export let dialogue: DialogueEntry[];
	const dispatch = createEventDispatcher<{ test: DialogueEntry; error: string }>();

	let search = '';
	let category: Category | '' = '';
	let expression = '';
	let rarity = '';
	let status: '' | 'on' | 'off' = '';
	let editing: string | null = null;
	let selected = new Set<string>();

	$: q = search.trim().toLowerCase();
	$: list = dialogue.filter(
		(e) =>
			(!q || e.text.toLowerCase().includes(q) || e.id.includes(q) || (e.conditions.artist ?? '').toLowerCase().includes(q)) &&
			(!category || e.category === category) &&
			(!expression || e.expression === expression) &&
			(!rarity || e.rarity === rarity) &&
			(!status || (status === 'on') === e.enabled)
	);
	$: counts = Object.fromEntries(CATEGORIES.map((c) => [c, dialogue.filter((e) => e.category === c).length]));
	$: allSelected = list.length > 0 && list.every((e) => selected.has(e.id));

	function uniqueId(base: string) {
		let id = base;
		let n = 2;
		while (dialogue.some((e) => e.id === id)) id = `${base}-${n++}`;
		return id;
	}
	function add() {
		const entry: DialogueEntry = {
			id: uniqueId(`${category || 'general'}-new`),
			text: '',
			category: category || 'general',
			expression: 'default',
			weight: 10,
			rarity: 'common',
			conditions: {},
			cooldown: 300,
			source: null,
			enabled: true
		};
		dialogue = [entry, ...dialogue];
		editing = entry.id;
		search = '';
	}
	function duplicate(e: DialogueEntry) {
		const copy = { ...structuredClone(e), id: uniqueId(`${e.id}-copy`) };
		const i = dialogue.indexOf(e);
		dialogue = [...dialogue.slice(0, i + 1), copy, ...dialogue.slice(i + 1)];
		editing = copy.id;
	}
	function remove(ids: string[]) {
		if (!confirm(ids.length === 1 ? 'delete this line?' : `delete ${ids.length} lines?`)) return;
		dialogue = dialogue.filter((e) => !ids.includes(e.id));
		ids.forEach((id) => selected.delete(id));
		selected = selected;
	}
	function setEnabled(ids: string[], on: boolean) {
		dialogue = dialogue.map((e) => (ids.includes(e.id) ? { ...e, enabled: on } : e));
	}
	function toggleAll() {
		if (allSelected) list.forEach((e) => selected.delete(e.id));
		else list.forEach((e) => selected.add(e.id));
		selected = selected;
	}
	const toggle = (id: string) => (selected.has(id) ? selected.delete(id) : selected.add(id), (selected = selected));

	// Conditions: small helpers so the editor can bind to optional fields.
	function setList<K extends 'time' | 'weather'>(e: DialogueEntry, key: K, value: string, on: boolean) {
		const current = new Set<string>((e.conditions[key] as string[] | undefined) ?? []);
		on ? current.add(value) : current.delete(value);
		e.conditions = { ...e.conditions, [key]: current.size ? [...current] : undefined };
		dialogue = dialogue;
	}
	function setCond(e: DialogueEntry, key: 'artist' | 'song' | 'date' | 'music' | 'visitor', value: string) {
		e.conditions = { ...e.conditions, [key]: value.trim() || undefined };
		dialogue = dialogue;
	}
	function setPages(e: DialogueEntry, value: string) {
		const pages = value.split(',').map((p) => p.trim()).filter((p) => p.startsWith('/'));
		e.conditions = { ...e.conditions, pages: pages.length ? pages : undefined };
		dialogue = dialogue;
	}
	function setCategory(e: DialogueEntry, picked: string) {
		const value = (CATEGORIES as readonly string[]).includes(picked) ? (picked as Category) : 'general';
		e.category = value;
		if (value === 'canon' && !e.source) e.source = { anime: 'Bocchi the Rock!', episode: 1, speaker: 'Ryo Yamada', url: '', translation: '' };
		if (value !== 'canon') e.source = null;
		dialogue = dialogue;
	}

	// ── JSON ──
	function exportJson() {
		const blob = new Blob([JSON.stringify(dialogue, null, 2)], { type: 'application/json' });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = `ryo-dialogue-${new Date().toISOString().slice(0, 10)}.json`;
		a.click();
		URL.revokeObjectURL(a.href);
	}
	let importInput: HTMLInputElement;
	async function importJson(file: File | undefined) {
		if (!file) return;
		try {
			const data = JSON.parse(await file.text());
			const entries = Array.isArray(data) ? data : Array.isArray(data?.dialogue) ? data.dialogue : null;
			if (!entries) throw new Error('expected a list of lines (or an object with a "dialogue" list)');
			const valid = entries.filter((e: any) => e && typeof e.text === 'string' && e.text.trim());
			if (!valid.length) throw new Error('no lines with text in that file');
			const replace = confirm(`${valid.length} lines found. OK = replace all current lines, Cancel = add them to the current ones.`);
			const cleaned: DialogueEntry[] = valid.map((e: any) => ({
				id: String(e.id ?? ''),
				text: String(e.text),
				category: CATEGORIES.includes(e.category) ? e.category : 'general',
				expression: (EXPRESSIONS as readonly string[]).includes(e.expression) ? e.expression : 'default',
				weight: Number(e.weight) || 10,
				rarity: RARITIES.includes(e.rarity) ? e.rarity : 'common',
				conditions: typeof e.conditions === 'object' && e.conditions ? e.conditions : {},
				cooldown: Number(e.cooldown) || 300,
				source: e.category === 'canon' ? e.source ?? null : null,
				enabled: e.enabled !== false
			}));
			const base = replace ? [] : dialogue;
			for (const e of cleaned) {
				let id = e.id.toLowerCase().replace(/[^a-z0-9_-]+/g, '-') || `${e.category}-imported`;
				while (base.some((x) => x.id === id)) id += '-2';
				base.push({ ...e, id });
			}
			dialogue = [...base];
		} catch (e) {
			dispatch('error', `import: ${(e as Error).message}`);
		} finally {
			importInput.value = '';
		}
	}

	const chip = 'text-[10px] px-1.5 py-0.5 rounded-full border border-ocean-300/70 dark:border-ocean-700/70 text-ocean-600 dark:text-ocean-400';
	const condText = (e: DialogueEntry) =>
		[
			e.conditions.time?.join('/'),
			e.conditions.pages?.join(' '),
			e.conditions.music,
			e.conditions.artist && `artist: ${e.conditions.artist}`,
			e.conditions.song && `song: ${e.conditions.song}`,
			e.conditions.weather?.join('/'),
			e.conditions.visitor && `${e.conditions.visitor} visit`,
			e.conditions.date && `on ${e.conditions.date}`
		]
			.filter(Boolean)
			.join(' · ');
</script>

<div class="flex flex-col gap-4">
	<div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-[2fr_1.2fr_1fr_1fr_1fr]">
		<input type="search" bind:value={search} placeholder="search lines, ids, artists…" class={field} />
		<select bind:value={category} class={field} aria-label="category">
			<option value="">all categories ({dialogue.length})</option>
			{#each CATEGORIES as c}<option value={c}>{c.replace('_', ' ')} ({counts[c]})</option>{/each}
		</select>
		<select bind:value={expression} class={field} aria-label="expression">
			<option value="">any expression</option>
			{#each EXPRESSIONS as x}<option value={x}>{x}</option>{/each}
		</select>
		<select bind:value={rarity} class={field} aria-label="rarity">
			<option value="">any rarity</option>
			{#each RARITIES as r}<option value={r}>{r}</option>{/each}
		</select>
		<select bind:value={status} class={field} aria-label="enabled">
			<option value="">on and off</option><option value="on">on</option><option value="off">off</option>
		</select>
	</div>

	<div class="flex flex-wrap gap-2 items-center">
		<button on:click={add} class={subtle}>+ new line{category ? ` (${category.replace('_', ' ')})` : ''}</button>
		<button on:click={exportJson} class={subtle}>export json</button>
		<button on:click={() => importInput.click()} class={subtle}>import json</button>
		<input bind:this={importInput} type="file" accept="application/json,.json" class="hidden" on:change={(e) => importJson(e.currentTarget.files?.[0])} />
		<label class="flex items-center gap-1.5 text-xs text-ocean-600 dark:text-ocean-400 ml-auto"><input type="checkbox" checked={allSelected} on:change={toggleAll} /> select shown ({list.length})</label>
		{#if selected.size}
			<button on:click={() => setEnabled([...selected], true)} class={subtle}>turn on {selected.size}</button>
			<button on:click={() => setEnabled([...selected], false)} class={subtle}>turn off {selected.size}</button>
			<button on:click={() => remove([...selected])} class={danger}>delete {selected.size}</button>
		{/if}
	</div>

	<div class="flex flex-col gap-1.5">
		{#each list as e (e.id)}
			<div class="rounded-xl border border-ocean-300/70 dark:border-ocean-700/70 {e.enabled ? '' : 'opacity-55'} {selected.has(e.id) ? 'bg-ocean-200/50 dark:bg-ocean-800/40' : ''}">
				<div class="flex items-start gap-2.5 px-3 py-2">
					<input type="checkbox" class="mt-1" checked={selected.has(e.id)} on:change={() => toggle(e.id)} aria-label="select" />
					<button class="flex-1 min-w-0 text-left" on:click={() => (editing = editing === e.id ? null : e.id)}>
						<span class="block text-sm text-ocean-900 dark:text-ocean-100 break-words">{e.text || '(empty)'}</span>
						<span class="flex flex-wrap gap-1 mt-1">
							<span class={chip}>{e.category.replace('_', ' ')}</span>
							<span class={chip}>{e.expression}</span>
							{#if e.rarity !== 'common'}<span class={chip}>{e.rarity}</span>{/if}
							{#if e.source}<span class="{chip} !text-amber-600 dark:!text-amber-300">anime ep {e.source.episode}</span>{/if}
							{#if condText(e)}<span class={chip}>{condText(e)}</span>{/if}
						</span>
					</button>
					<div class="flex gap-1 shrink-0">
						<button on:click={() => dispatch('test', e)} class={subtle} title="say it in the preview">test</button>
						<button on:click={() => setEnabled([e.id], !e.enabled)} class={subtle}>{e.enabled ? 'on' : 'off'}</button>
					</div>
				</div>

				{#if editing === e.id}
					<div class="border-t border-ocean-300/60 dark:border-ocean-700/60 px-3 py-3 flex flex-col gap-3">
						<div>
							<label class={fieldLabel} for="t-{e.id}">what she says</label>
							<textarea id="t-{e.id}" rows="2" maxlength="300" bind:value={e.text} class={field} />
							<p class="text-[11px] text-ocean-500 mt-1">placeholders: {'{song} {artist} {album} {weather} {temperature} {page} {money} {visits} {headpats} {time} {item}'}. a line only comes up when its placeholders can be filled.</p>
						</div>
						<div class="grid gap-2 grid-cols-2 sm:grid-cols-5">
							<div><span class={fieldLabel}>category</span><select value={e.category} on:change={(ev) => setCategory(e, ev.currentTarget.value)} class={field}>{#each CATEGORIES as c}<option value={c}>{c.replace('_', ' ')}</option>{/each}</select></div>
							<div><span class={fieldLabel}>expression</span><select bind:value={e.expression} class={field}>{#each EXPRESSIONS as x}<option value={x}>{x}</option>{/each}</select></div>
							<div><span class={fieldLabel}>rarity</span><select bind:value={e.rarity} class={field}>{#each RARITIES as r}<option value={r}>{r}</option>{/each}</select></div>
							<div><span class={fieldLabel}>weight 1–100</span><input type="number" min="1" max="100" bind:value={e.weight} class={field} /></div>
							<div><span class={fieldLabel}>cooldown (s)</span><input type="number" min="0" max="86400" bind:value={e.cooldown} class={field} /></div>
						</div>

						<div class="flex flex-col gap-2">
							<span class={fieldLabel}>only when… (all optional)</span>
							<div class="flex flex-wrap gap-3 text-xs text-ocean-700 dark:text-ocean-300">
								{#each TIMES as t}<label class="flex items-center gap-1"><input type="checkbox" checked={e.conditions.time?.includes(t)} on:change={(ev) => setList(e, 'time', t, ev.currentTarget.checked)} /> {t}</label>{/each}
								<span class="text-ocean-400">|</span>
								{#each WEATHERS as w}<label class="flex items-center gap-1"><input type="checkbox" checked={e.conditions.weather?.includes(w)} on:change={(ev) => setList(e, 'weather', w, ev.currentTarget.checked)} /> {w}</label>{/each}
							</div>
							<div class="grid gap-2 grid-cols-2 sm:grid-cols-3">
								<input value={e.conditions.pages?.join(', ') ?? ''} on:change={(ev) => setPages(e, ev.currentTarget.value)} placeholder="pages: /, /osu, /blog" class={field} />
								<input value={e.conditions.artist ?? ''} on:change={(ev) => setCond(e, 'artist', ev.currentTarget.value)} placeholder="artist contains…" class={field} />
								<input value={e.conditions.song ?? ''} on:change={(ev) => setCond(e, 'song', ev.currentTarget.value)} placeholder="song contains…" class={field} />
								<select value={e.conditions.music ?? ''} on:change={(ev) => setCond(e, 'music', ev.currentTarget.value)} class={field}><option value="">music: any</option><option value="playing">music playing</option><option value="silent">nothing playing</option></select>
								<select value={e.conditions.visitor ?? ''} on:change={(ev) => setCond(e, 'visitor', ev.currentTarget.value)} class={field}><option value="">any visitor</option><option value="first">first visit</option><option value="returning">returning</option></select>
								<input value={e.conditions.date ?? ''} on:change={(ev) => setCond(e, 'date', ev.currentTarget.value)} placeholder="date MM-DD" maxlength="5" class={field} />
							</div>
						</div>

						{#if e.category === 'canon' && e.source}
							<div class="flex flex-col gap-2 rounded-xl border border-amber-500/30 p-3">
								<span class={fieldLabel}>anime source (canon lines only; original lines can't have one)</span>
								<div class="grid gap-2 grid-cols-2 sm:grid-cols-4">
									<input bind:value={e.source.anime} placeholder="anime" class={field} />
									<input type="number" min="0" bind:value={e.source.episode} placeholder="episode" class={field} />
									<input bind:value={e.source.speaker} placeholder="speaker" class={field} />
									<input bind:value={e.source.url} placeholder="source url" class={field} />
								</div>
								<input bind:value={e.source.translation} placeholder="translation (whose subtitles?)" class={field} />
							</div>
						{/if}

						<div class="flex flex-wrap gap-2 items-center">
							<span class="text-[11px] text-ocean-500 mr-auto">id: {e.id}</span>
							<button on:click={() => dispatch('test', e)} class={subtle}>test in preview</button>
							<button on:click={() => duplicate(e)} class={subtle}>duplicate</button>
							<button on:click={() => remove([e.id])} class={danger}>delete</button>
							<button on:click={() => (editing = null)} class={subtle}>done</button>
						</div>
					</div>
				{/if}
			</div>
		{:else}
			<p class="text-sm text-ocean-600 dark:text-ocean-400">no lines match.</p>
		{/each}
	</div>
</div>
