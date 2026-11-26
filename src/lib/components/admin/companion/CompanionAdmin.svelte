<script lang="ts">
	// /admin → ryo: everything about the companion. Tabs for an overview, her pictures and look,
	// dialogue, behaviour, interactions, and a preview where the moment (time, page, song,
	// weather) can be faked and every action tried, without touching any visitor's data.
	import { onMount } from 'svelte';
	import { adminApi, field, fieldLabel, primary, subtle, danger } from '../styles';
	import UploadButton from '../UploadButton.svelte';
	import DialogueManager from './DialogueManager.svelte';
	import Ryo from '$lib/companion/Ryo.svelte';
	import { COLLECTIBLES } from '$lib/collectibles';
	import { CATEGORIES, EXPRESSIONS, STATES, WEATHERS, type CompanionSettings, type CompanionState, type DialogueEntry, type WeatherKind } from '$lib/companion/types';

	export let onUnauthorized: () => void;

	const tabs = ['overview', 'appearance', 'dialogue', 'behaviour', 'interactions', 'preview'] as const;
	let tab: (typeof tabs)[number] = 'overview';
	let config: CompanionSettings | null = null;
	let savedJson = '';
	let busy = false;
	let error = '';
	let saved = '';

	const api = (method: string, body?: unknown) => adminApi('/api/admin/site/companion', method, body, onUnauthorized);
	async function load() {
		try {
			config = await api('GET');
			savedJson = JSON.stringify(config);
		} catch (e) {
			error = (e as Error).message;
		}
	}
	async function save() {
		if (!config) return;
		busy = true;
		error = saved = '';
		try {
			config = await api('PUT', config);
			savedJson = JSON.stringify(config);
			saved = 'saved';
			setTimeout(() => (saved = ''), 2000);
		} catch (e) {
			error = (e as Error).message;
		} finally {
			busy = false;
		}
	}
	onMount(load);
	$: dirty = !!config && JSON.stringify(config) !== savedJson;

	// ── overview ──
	let broken: string[] = [];
	$: if (config) checkSprites(config.sprites);
	function checkSprites(sprites: CompanionSettings['sprites']) {
		const found: string[] = [];
		Promise.all(
			Object.entries(sprites)
				.filter(([, src]) => src)
				.map(([expr, src]) => new Promise<void>((done) => {
					const img = new Image();
					img.onload = () => done();
					img.onerror = () => (found.push(expr), done());
					img.src = src;
				}))
		).then(() => (broken = found));
	}
	$: spriteCount = config ? EXPRESSIONS.filter((e) => config!.sprites[e]).length : 0;
	$: enabledLines = config ? config.dialogue.filter((d) => d.enabled).length : 0;
	$: canonLines = config ? config.dialogue.filter((d) => d.category === 'canon').length : 0;
	$: features = config
		? [
				['headpats', config.interactions.headpats],
				['fictional yen', config.interactions.money],
				['grass', config.interactions.grass],
				['song questions', config.interactions.song],
				['sleeping', config.interactions.sleep],
				['stats', config.interactions.stats],
				['achievements', config.achievements.enabled],
				['dragging', config.draggable],
				['music reactions', config.behaviour.music],
				['weather reactions', config.behaviour.weather],
				['page reactions', config.behaviour.pageReactions]
		  ]
		: [];

	// ── preview ──
	let ryo: Ryo;
	let sim = {
		hour: new Date().getHours(),
		page: '/',
		playing: false,
		song: { title: 'Seishun Complex', artist: 'kessoku band', album: 'Kessoku Band' },
		weatherOn: true,
		weather: { kind: 'rain' as WeatherKind, description: 'light rain', temperature: '4°C' },
		visitor: 'returning' as 'first' | 'returning'
	};
	$: simulated = { hour: sim.hour, page: sim.page, song: sim.playing ? sim.song : null, weather: sim.weatherOn ? sim.weather : null, visitor: sim.visitor };
	let log: string[] = [];
	const note = (text: string) => (log = [text, ...log].slice(0, 8));
	function stamped(id: string) {
		const c = COLLECTIBLES.find((x) => x.id === id);
		note(`would unlock the "${c?.name ?? id}" stamp`);
	}
	function test(entry: DialogueEntry) {
		tab = 'preview';
		setTimeout(() => ryo?.testLine(entry), 50);
		note(`testing "${entry.id}"`);
	}
	const actions = ['talk', 'headpat', 'money', 'purchase', 'grass', 'song', 'sleep', 'wake', 'stats'] as const;
	const pages = ['/', '/osu', '/music', '/blog', '/guestbook', '/tournaments', '/about', '/gallery'];

	const card = 'rounded-2xl border border-ocean-300/70 dark:border-ocean-700/70 p-4';
	const check = 'flex items-center gap-2 text-sm text-ocean-700 dark:text-ocean-300';
</script>

{#if config}
	<div class="flex flex-col gap-5">
		<!-- tabs + save -->
		<div class="flex flex-wrap items-center gap-2 sticky top-0 z-10 py-2 -mt-2 glass-strong rounded-xl px-2">
			{#each tabs as t}
				<button on:click={() => (tab = t)} class="px-3 py-1.5 rounded-full text-sm {tab === t ? 'accent-bg' : 'text-ocean-600 dark:text-ocean-400 hover:bg-ocean-200/60 dark:hover:bg-ocean-800/60'}">{t}</button>
			{/each}
			<span class="flex-1" />
			{#if error}<span class="text-xs text-red-500 max-w-xs truncate" title={error}>{error}</span>{/if}
			{#if saved}<span class="text-xs text-ocean-500">{saved}</span>{/if}
			{#if dirty}<span class="text-xs text-amber-600 dark:text-amber-300">unsaved changes</span>{/if}
			<button on:click={save} class={primary} disabled={busy || !dirty}>save</button>
		</div>

		{#if tab === 'overview'}
			<div class="grid gap-5 lg:grid-cols-[1fr_22rem]">
				<div class="flex flex-col gap-4">
					<label class={check}><input type="checkbox" bind:checked={config.enabled} /> {config.name} is on the site</label>
					<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
						{#each [{ k: 'lines', v: `${enabledLines} / ${config.dialogue.length}` }, { k: 'anime quotes', v: canonLines }, { k: 'pictures', v: `${spriteCount} / ${EXPRESSIONS.length}` }, { k: 'shows on', v: config.pages === 'all' ? 'every page' : 'home page' }] as t}
							<div class={card}><div class={fieldLabel}>{t.k}</div><div class="text-lg text-ocean-900 dark:text-ocean-100 tabular-nums">{t.v}</div></div>
						{/each}
					</div>
					<div class={card}>
						<div class={fieldLabel}>features</div>
						<div class="flex flex-wrap gap-1.5 mt-1">
							{#each features as [label, on]}<span class="text-xs px-2 py-0.5 rounded-full {on ? 'accent-soft text-ocean-900 dark:text-ocean-100' : 'border border-ocean-300/70 dark:border-ocean-700/70 text-ocean-500 line-through'}">{label}</span>{/each}
						</div>
						<p class="text-xs text-ocean-500 mt-2">
							{config.desktop ? 'desktop' : ''}{config.desktop && config.mobile ? ' and ' : ''}{config.mobile ? 'phones' : ''}{!config.desktop && !config.mobile ? 'nowhere (desktop and phones both off)' : ''} · {config.position.replace('-', ' ')} · {config.size}px · talks on her own: {config.behaviour.autoTalk} · falls asleep after {config.behaviour.sleepAfter || 'never'}{config.behaviour.sleepAfter ? ' min' : ''}
						</p>
					</div>
					{#if broken.length}
						<div class="rounded-2xl border border-red-400/50 p-4 text-sm text-red-600 dark:text-red-400">pictures that don't load: {broken.join(', ')}. she uses the default picture for those.</div>
					{/if}
					{#if EXPRESSIONS.some((e) => !config?.sprites[e])}
						<p class="text-xs text-ocean-500">no picture yet for: {EXPRESSIONS.filter((e) => !config?.sprites[e]).join(', ')}. those use the default picture with a different animation.</p>
					{/if}
				</div>
				<div class="relative h-80 rounded-2xl border border-ocean-300/70 dark:border-ocean-700/70 overflow-hidden glass">
					<Ryo bind:this={ryo} preview {config} sim={simulated} on:stamp={(e) => stamped(e.detail)} />
					<span class="absolute top-2 left-3 text-[11px] text-ocean-500">preview: click her</span>
				</div>
			</div>
		{:else if tab === 'appearance'}
			<div class="grid gap-5 lg:grid-cols-[1fr_22rem]">
				<div class="flex flex-col gap-5">
					<div class="grid gap-3 sm:grid-cols-2">
						<div><label class={fieldLabel} for="c-name">name</label><input id="c-name" bind:value={config.name} maxlength="30" class={field} /></div>
						<div><label class={fieldLabel} for="c-sub">line under her name in the stats</label><input id="c-sub" bind:value={config.subtitle} maxlength="80" class={field} /></div>
					</div>
					<div class="flex flex-col gap-2">
						<span class={fieldLabel}>pictures per expression</span>
						<p class="text-xs text-ocean-500 -mt-1">see-through png/webp/gif work best. empty = her standard picture for that mood. new pictures in static/companion/ryo can have their edges tidied with <code>node scripts/clean-sprites.cjs file.webp</code>. sources and credits are in static/companion/ryo/manifest.json.</p>
						{#each EXPRESSIONS as expr}
							<div class="flex flex-wrap items-center gap-2">
								<span class="w-24 text-xs text-ocean-700 dark:text-ocean-300">{expr}</span>
								<span class="w-10 h-10 grid place-items-center rounded-lg bg-ocean-900/40 shrink-0 overflow-hidden">{#if config.sprites[expr] || config.sprites.default}<img src={config.sprites[expr] || config.sprites.default} alt="" class="max-w-full max-h-full {config.sprites[expr] ? '' : 'opacity-40'}" />{/if}</span>
								<input bind:value={config.sprites[expr]} placeholder={expr === 'default' ? '/companion/ryo/default.png' : 'her standard picture'} class="{field} flex-1 min-w-[180px]" />
								<UploadButton folder="misc" maxSize={600} label="upload" on:uploaded={(e) => config && ((config.sprites[expr] = e.detail), (config = config))} on:error={(e) => (error = e.detail)} />
								<input bind:value={config.credits[expr]} placeholder="credit / source" class="{field} w-44" />
							</div>
						{/each}
					</div>
					<div class="grid gap-3 sm:grid-cols-3">
						<div><span class={fieldLabel}>size: {config.size}px</span><input type="range" min="64" max="220" bind:value={config.size} class="w-full" /></div>
						<div><span class={fieldLabel}>opacity: {config.opacity}%</span><input type="range" min="30" max="100" bind:value={config.opacity} class="w-full" /></div>
						<div><span class={fieldLabel}>animation: {config.animation}%</span><input type="range" min="0" max="100" bind:value={config.animation} class="w-full" /></div>
					</div>
					<div class="grid gap-3 sm:grid-cols-3">
						<div><span class={fieldLabel}>corner</span><select bind:value={config.position} class={field}><option value="bottom-right">bottom right</option><option value="bottom-left">bottom left</option></select></div>
						<div><span class={fieldLabel}>speech bubble</span><select bind:value={config.bubble} class={field}><option value="auto">automatic side</option><option value="left">to the right of her</option><option value="right">to the left of her</option></select></div>
						<div><span class={fieldLabel}>shows on</span><select bind:value={config.pages} class={field}><option value="home">home page only</option><option value="all">every page</option></select></div>
					</div>
					<div class="flex flex-wrap gap-4">
						<label class={check}><input type="checkbox" bind:checked={config.desktop} /> desktop</label>
						<label class={check}><input type="checkbox" bind:checked={config.mobile} /> phones</label>
						<label class={check}><input type="checkbox" bind:checked={config.draggable} /> visitors can drag her (remembered in their browser)</label>
						<label class={check}><input type="checkbox" bind:checked={config.typewriter} /> typewriter text</label>
					</div>
				</div>
				<div class="relative h-96 rounded-2xl border border-ocean-300/70 dark:border-ocean-700/70 overflow-hidden glass lg:sticky lg:top-16">
					<Ryo bind:this={ryo} preview {config} sim={simulated} on:stamp={(e) => stamped(e.detail)} />
					<span class="absolute top-2 left-3 text-[11px] text-ocean-500">live preview</span>
				</div>
			</div>
		{:else if tab === 'dialogue'}
			<DialogueManager bind:dialogue={config.dialogue} on:test={(e) => test(e.detail)} on:error={(e) => (error = e.detail)} />
		{:else if tab === 'behaviour'}
			<div class="flex flex-col gap-4 max-w-2xl">
				<label class={check}><input type="checkbox" bind:checked={config.behaviour.idle} /> idle life: eating grass, playing bass, thinking on her own</label>
				<div class="grid gap-3 sm:grid-cols-3">
					<div><span class={fieldLabel}>talks on her own</span><select bind:value={config.behaviour.autoTalk} class={field}><option value="off">never</option><option value="rare">rarely (every 2–4 min)</option><option value="normal">sometimes (every 1–2 min)</option></select></div>
					<div><span class={fieldLabel}>falls asleep after (min, 0 = never)</span><input type="number" min="0" max="120" bind:value={config.behaviour.sleepAfter} class={field} /></div>
					<div><span class={fieldLabel}>naps last (min)</span><input type="number" min="1" max="240" bind:value={config.behaviour.sleepFor} class={field} /></div>
				</div>
				<div class="grid gap-3 sm:grid-cols-2">
					<div><span class={fieldLabel}>annoyed after this many quick clicks</span><input type="number" min="2" max="50" bind:value={config.behaviour.annoyAfter} class={field} /></div>
					<div><span class={fieldLabel}>rare line chance: {config.behaviour.rareChance}%</span><input type="range" min="0" max="20" bind:value={config.behaviour.rareChance} class="w-full" /></div>
				</div>
				<label class={check}><input type="checkbox" bind:checked={config.behaviour.music} /> reacts to what i'm listening to (and bobs along)</label>
				<label class={check}><input type="checkbox" bind:checked={config.behaviour.weather} /> mentions the weather once a visit</label>
				<label class={check}><input type="checkbox" bind:checked={config.behaviour.pageReactions} /> sometimes comments on the page you open</label>
				<p class="text-xs text-ocean-500">for visitors who prefer reduced motion she stays still: no breathing, bobbing, particles or typewriter.</p>
			</div>
		{:else if tab === 'interactions'}
			<div class="flex flex-col gap-5 max-w-3xl">
				<div class="flex flex-col gap-2">
					<span class={fieldLabel}>menu (right-click her, or ⋯)</span>
					<div class="flex flex-wrap gap-4">
						<label class={check}><input type="checkbox" bind:checked={config.interactions.headpats} /> headpat</label>
						<label class={check}><input type="checkbox" bind:checked={config.interactions.money} /> give money</label>
						<label class={check}><input type="checkbox" bind:checked={config.interactions.grass} /> give grass</label>
						<label class={check}><input type="checkbox" bind:checked={config.interactions.song} /> ask about the song</label>
						<label class={check}><input type="checkbox" bind:checked={config.interactions.sleep} /> sleep / wake</label>
						<label class={check}><input type="checkbox" bind:checked={config.interactions.stats} /> stats</label>
					</div>
					<div class="grid gap-3 sm:grid-cols-2 max-w-md">
						<div><span class={fieldLabel}>fictional yen per gift</span><input type="number" min="1" bind:value={config.interactions.donation} class={field} /></div>
						<div><span class={fieldLabel}>seconds between actions</span><input type="number" min="0" max="60" bind:value={config.interactions.cooldown} class={field} /></div>
					</div>
				</div>

				<div class="flex flex-col gap-2">
					<span class={fieldLabel}>what she buys (the most expensive thing she can afford; food only rarely)</span>
					{#each config.purchases as p, i}
						<div class="flex flex-wrap gap-2 items-center">
							<input bind:value={p.item} placeholder="item" class="{field} w-44" />
							<input type="number" min="1" bind:value={p.price} class="{field} w-24" aria-label="price in yen" />
							<select bind:value={p.kind} class="{field} w-28">{#each ['bass', 'pedal', 'amp', 'strings', 'album', 'food'] as k}<option value={k}>{k}</option>{/each}</select>
							<input bind:value={p.line} placeholder="what she says after" class="{field} flex-1 min-w-[200px]" />
							<button on:click={() => config && ((config.purchases = config.purchases.filter((_, j) => j !== i)))} class={danger}>✕</button>
						</div>
					{/each}
					<div><button on:click={() => config && (config.purchases = [...config.purchases, { id: `item-${Date.now()}`, item: '', price: 1000, kind: 'pedal', line: '' }])} class={subtle}>+ item</button></div>
				</div>

				<div class="flex flex-col gap-2">
					<label class={check}><input type="checkbox" bind:checked={config.achievements.enabled} /> achievements (passport stamps in the "ryo" section of /passport)</label>
					<div class="grid gap-3 grid-cols-2 sm:grid-cols-3">
						<div><span class={fieldLabel}>financially irresponsible: ¥ given</span><input type="number" bind:value={config.achievements.donated} class={field} /></div>
						<div><span class={fieldLabel}>grass enthusiast: grass</span><input type="number" bind:value={config.achievements.grass} class={field} /></div>
						<div><span class={fieldLabel}>personal space: clicks in 30s</span><input type="number" bind:value={config.achievements.clicks} class={field} /></div>
						<div><span class={fieldLabel}>professional headpatter: pats</span><input type="number" bind:value={config.achievements.headpats} class={field} /></div>
						<div><span class={fieldLabel}>familiar face: different days</span><input type="number" bind:value={config.achievements.days} class={field} /></div>
						<div><span class={fieldLabel}>quiet company: minutes</span><input type="number" bind:value={config.achievements.minutes} class={field} /></div>
					</div>
					<p class="text-xs text-ocean-500">also: night shift (after 3am), good taste (kessoku band playing), unexpected sincerity (a rare line), bass enthusiast (her first bass). special-day lines live in dialogue → category "event" with a date.</p>
				</div>
			</div>
		{:else}
			<div class="grid gap-5 lg:grid-cols-[1fr_20rem]">
				<div class="relative h-[26rem] rounded-2xl border border-ocean-300/70 dark:border-ocean-700/70 overflow-hidden glass">
					<Ryo bind:this={ryo} preview {config} sim={simulated} on:stamp={(e) => stamped(e.detail)} on:said={(e) => note(`said "${e.detail}"`)} />
					<span class="absolute top-2 left-3 text-[11px] text-ocean-500">nothing here touches real visitor data</span>
				</div>
				<div class="flex flex-col gap-4 text-sm">
					<div class="flex flex-col gap-2">
						<span class={fieldLabel}>pretend it's…</span>
						<div><span class="text-xs text-ocean-500">{String(sim.hour).padStart(2, '0')}:00</span><input type="range" min="0" max="23" bind:value={sim.hour} class="w-full" /></div>
						<select bind:value={sim.page} class={field}>{#each pages as p}<option value={p}>page {p}</option>{/each}</select>
						<select bind:value={sim.visitor} class={field}><option value="first">first visit</option><option value="returning">returning visitor</option></select>
						<label class={check}><input type="checkbox" bind:checked={sim.playing} /> music playing</label>
						{#if sim.playing}
							<input bind:value={sim.song.title} placeholder="song" class={field} />
							<input bind:value={sim.song.artist} placeholder="artist" class={field} />
							<input bind:value={sim.song.album} placeholder="album" class={field} />
						{/if}
						<label class={check}><input type="checkbox" bind:checked={sim.weatherOn} /> weather known</label>
						{#if sim.weatherOn}
							<select bind:value={sim.weather.kind} class={field}>{#each WEATHERS as w}<option value={w}>{w}</option>{/each}</select>
						{/if}
					</div>
					<div class="flex flex-col gap-2">
						<span class={fieldLabel}>do</span>
						<div class="flex flex-wrap gap-1.5">{#each actions as a}<button on:click={() => ryo?.perform(a)} class={subtle}>{a}</button>{/each}</div>
					</div>
					<div class="flex flex-col gap-2">
						<span class={fieldLabel}>mood</span>
						<div class="flex flex-wrap gap-1.5">{#each STATES as st}<button on:click={() => ryo?.setMood(st)} class="text-xs px-2 py-1 rounded-full border border-ocean-300/70 dark:border-ocean-700/70 text-ocean-700 dark:text-ocean-300">{st.replace(/_/g, ' ')}</button>{/each}</div>
					</div>
					<button on:click={() => (ryo?.resetPreview(), (log = []))} class="{subtle} w-fit">reset preview</button>
					{#if log.length}
						<ul class="text-xs text-ocean-500 flex flex-col gap-0.5">{#each log as l}<li>{l}</li>{/each}</ul>
					{/if}
				</div>
			</div>
		{/if}
	</div>
{:else if error}
	<p class="text-sm text-red-500">{error}</p>
{:else}
	<p class="text-sm text-ocean-500">loading…</p>
{/if}
