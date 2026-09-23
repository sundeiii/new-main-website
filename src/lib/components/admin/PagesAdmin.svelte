<script lang="ts">
	import { onMount } from 'svelte';
	import { adminApi, danger, field, fieldLabel, primary, subtle } from './styles';
	import UploadButton from './UploadButton.svelte';
	import { uploadImage, uploadLargeFile } from './upload';
	import AboutEditor from './AboutEditor.svelte';
	import ButtonsEditor from './ButtonsEditor.svelte';
	import GalleryEditor from './GalleryEditor.svelte';
	import type { AboutAltSettings, AboutSettings, ButtonsSettings, GallerySettings, HomeSettings, MusicSettings, NowSettings, OsuSettings, SkinsSettings } from '$lib/siteSettings';

	export let onUnauthorized: () => void;

	const sections = ['home', 'about', 'now', 'osu', 'music', 'gallery', 'buttons', 'skins', 'changelog'] as const;
	let active: typeof sections[number] = 'home';

	let home: HomeSettings | null = null;
	let now: NowSettings | null = null;
	let osu: OsuSettings | null = null;
	let music: MusicSettings | null = null;
	let skins: SkinsSettings | null = null;
	let gallery: GallerySettings | null = null;
	let buttons: ButtonsSettings | null = null;
	let about: AboutSettings | null = null;
	let aboutAlt: AboutAltSettings | null = null;
	let changelog: { id: number; date: string; text: string }[] = [];

	let error = '';
	let saved = '';
	let busy = false;

	const api = (url: string, method: string, body?: unknown) => adminApi(url, method, body, onUnauthorized);

	async function load() {
		error = '';
		try {
			[home, now, osu, music, skins, gallery, buttons, about, aboutAlt, changelog] = await Promise.all([
				api('/api/admin/site/home', 'GET'),
				api('/api/admin/site/now', 'GET'),
				api('/api/admin/site/osu', 'GET'),
				api('/api/admin/site/music', 'GET'),
				api('/api/admin/site/skins', 'GET'),
				api('/api/admin/site/gallery', 'GET'),
				api('/api/admin/site/buttons', 'GET'),
				api('/api/admin/site/about', 'GET'),
				api('/api/admin/site/aboutAlt', 'GET'),
				api('/api/admin/changelog', 'GET')
			]);
		} catch (e) {
			error = (e as Error).message;
		}
	}

	async function save(key: 'home' | 'now' | 'osu' | 'music' | 'skins' | 'gallery' | 'buttons' | 'about' | 'aboutAlt', value: unknown) {
		busy = true;
		error = saved = '';
		try {
			const result = await api(`/api/admin/site/${key}`, 'PUT', value);
			if (key === 'home') home = result;
			if (key === 'now') now = result;
			if (key === 'osu') osu = result;
			if (key === 'music') music = result;
			if (key === 'skins') skins = result;
			if (key === 'gallery') gallery = result;
			if (key === 'buttons') buttons = result;
			if (key === 'about') about = result;
			if (key === 'aboutAlt') aboutAlt = result;
			saved = 'saved';
			setTimeout(() => (saved = ''), 2000);
		} catch (e) {
			error = (e as Error).message;
		} finally {
			busy = false;
		}
	}

	// ── changelog ──
	let newEntry = { date: new Date().toISOString().slice(0, 10), text: '' };
	async function addEntry() {
		if (!newEntry.text.trim()) return;
		busy = true;
		error = '';
		try {
			await api('/api/admin/changelog', 'POST', newEntry);
			newEntry = { ...newEntry, text: '' };
			changelog = await api('/api/admin/changelog', 'GET');
		} catch (e) {
			error = (e as Error).message;
		} finally {
			busy = false;
		}
	}
	async function updateEntry(entry: { id: number; date: string; text: string }) {
		try {
			await api('/api/admin/changelog', 'PATCH', entry);
		} catch (e) {
			error = (e as Error).message;
		}
	}
	async function deleteEntry(id: number) {
		if (!confirm('Delete this changelog entry?')) return;
		try {
			await api('/api/admin/changelog', 'DELETE', { id });
			changelog = changelog.filter((e) => e.id !== id);
		} catch (e) {
			error = (e as Error).message;
		}
	}

	// Fills a map from a pasted beatmap link or id via the osu! API.
	let mapLookup = '';
	let lookingUp = false;
	async function addMapFromOsu() {
		if (!osu || !mapLookup.trim()) return;
		lookingUp = true;
		error = '';
		try {
			const m = await api(`/api/admin/osu-map?q=${encodeURIComponent(mapLookup.trim())}`, 'GET');
			osu.maps = [...osu.maps, { ...m, note: '' }];
			mapLookup = '';
		} catch (e) {
			error = (e as Error).message;
		} finally {
			lookingUp = false;
		}
	}

	// ── skins ──
	// Upload progress per skin index, 0–1 (only while an .osk is uploading).
	let oskProgress: Record<number, number> = {};
	let shotUploads: Record<number, number> = {};

	async function uploadOsk(i: number, file: File | undefined) {
		if (!file || !skins) return;
		error = '';
		oskProgress = { ...oskProgress, [i]: 0 };
		try {
			const url = await uploadLargeFile(file, 'skins', (f) => (oskProgress = { ...oskProgress, [i]: f }));
			skins.items[i].download = url;
			if (!skins.items[i].name) skins.items[i].name = file.name.replace(/\.osk$/i, '');
			skins = skins;
		} catch (e) {
			error = `${file.name}: ${(e as Error).message}`;
		} finally {
			const { [i]: _, ...rest } = oskProgress;
			oskProgress = rest;
		}
	}

	async function uploadShots(i: number, files: FileList | null) {
		if (!files || !skins) return;
		error = '';
		shotUploads = { ...shotUploads, [i]: files.length };
		for (const file of [...files]) {
			try {
				const url = await uploadImage(file, 'skins', 1920);
				skins.items[i].screenshots = [...skins.items[i].screenshots, url];
				skins = skins;
			} catch (e) {
				error = `${file.name}: ${(e as Error).message}`;
			}
			shotUploads = { ...shotUploads, [i]: shotUploads[i] - 1 };
		}
	}

	const blankSkin = () => ({ name: '', author: '', description: '', preview: '', screenshots: [] as string[], download: '' });

	// ── home lists ──
	type ListKey = 'wip' | 'projects' | 'links';
	const homeLists: { key: ListKey; title: string }[] = [
		{ key: 'wip', title: 'wip' },
		{ key: 'projects', title: 'projects (leave empty to list your /projects pages automatically)' },
		{ key: 'links', title: 'links' }
	];
	async function useProjectPages() {
		if (!home) return;
		try {
			const pages: { slug: string; title: string; excerpt: string }[] = await (await fetch('/api/blog?kind=project')).json();
			if (!pages.length) return (error = 'no project pages yet (make them in the blog tab as kind "project")');
			home.projects = pages.map((p) => ({ name: p.title, href: `/projects/${p.slug}`, description: p.excerpt }));
		} catch (e) {
			error = (e as Error).message;
		}
	}

	// ── song of the month lookup ──
	let songLink = '';
	let songLookingUp = false;
	async function fetchSong() {
		if (!music || !songLink.trim()) return;
		songLookingUp = true;
		error = '';
		try {
			const song = await api(`/api/admin/song-lookup?q=${encodeURIComponent(songLink.trim())}`, 'GET');
			music.songOfTheMonth = { ...song, note: music.songOfTheMonth?.note ?? '' };
			songLink = '';
		} catch (e) {
			error = (e as Error).message;
		} finally {
			songLookingUp = false;
		}
	}

	const musicNotesExample = "music i've been listening to lately.\n\nno rankings, no serious reviews, just songs/albums i like enough to put here.";

	// Now-page items are edited one per line.
	const linesToItems = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);

	function move<T>(list: T[], i: number, d: number): T[] {
		const j = i + d;
		if (j < 0 || j >= list.length) return list;
		const copy = [...list];
		[copy[i], copy[j]] = [copy[j], copy[i]];
		return copy;
	}

	onMount(load);
</script>

<div class="flex flex-col gap-5">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div class="flex flex-wrap gap-1">
			{#each sections as s}
				<button
					on:click={() => (active = s)}
					class="px-3 py-1 text-sm rounded {active === s ? 'bg-ocean-600 text-white' : 'text-ocean-600 dark:text-ocean-400 hover:bg-ocean-200 dark:hover:bg-ocean-800'}"
				>
					{s === 'osu' ? 'osu!' : s}
				</button>
			{/each}
		</div>
		<div class="flex items-center gap-2 text-sm">
			{#if saved}<span class="text-ocean-green">{saved}</span>{/if}
			{#if active !== 'changelog'}
				<a href={active === 'home' || active === 'buttons' ? '/' : `/${active}`} target="_blank" class={subtle}>view ↗</a>
			{/if}
		</div>
	</div>

	{#if error}<p class="text-red-600 dark:text-red-400 text-sm">{error}</p>{/if}

	<!-- HOME -->
	{#if active === 'home' && home}
		<div class="flex flex-col gap-3">
			<div>
				<label for="p-intro" class={fieldLabel}>intro (shown under your name on the home page)</label>
				<textarea id="p-intro" bind:value={home.intro} rows="3" maxlength="1000" class={field} />
			</div>
			{#each homeLists as list}
				<div class="flex flex-col gap-2">
					<div class="flex items-center justify-between gap-2">
						<span class={fieldLabel}>{list.title}</span>
						{#if list.key === 'projects'}<button on:click={useProjectPages} class="{subtle} !text-xs">fill from my project pages</button>{/if}
					</div>
					{#each home[list.key] as item, i}
						<div class="flex flex-wrap sm:flex-nowrap gap-2">
							<input bind:value={item.name} placeholder="name" aria-label="name" class="{field} sm:!w-44" />
							<input bind:value={item.href} placeholder="https://…, /projects/…, or mailto:…" aria-label="link" class={field} />
							<input bind:value={item.description} placeholder="description (optional)" aria-label="description" class={field} />
							<button on:click={() => home && (home[list.key] = move(home[list.key], i, -1))} class={subtle} aria-label="move up">▲</button>
							<button on:click={() => home && (home[list.key] = home[list.key].filter((_, j) => j !== i))} class={danger} aria-label="remove">✕</button>
						</div>
					{/each}
					<div><button on:click={() => home && (home[list.key] = [...home[list.key], { name: '', href: '', description: '' }])} class={subtle}>+ add</button></div>
				</div>
			{/each}
			<div><button on:click={() => save('home', home)} class={primary} disabled={busy}>save</button></div>
		</div>

	<!-- NOW -->
	{:else if active === 'now' && now}
		<div class="flex flex-col gap-4">
			<div class="max-w-xs">
				<label for="p-updated" class={fieldLabel}>last updated</label>
				<input id="p-updated" bind:value={now.updated} placeholder="September 2026" class={field} />
			</div>
			{#each now.sections as section, i}
				<div class="border border-ocean-300 dark:border-ocean-700 rounded p-3 flex flex-col gap-2">
					<div class="flex gap-2">
						<input bind:value={section.icon} maxlength="8" aria-label="icon" class="{field} !w-14 text-center" />
						<input bind:value={section.title} placeholder="section title" aria-label="section title" class={field} />
						<button on:click={() => now && (now.sections = move(now.sections, i, -1))} class={subtle} aria-label="move up">▲</button>
						<button on:click={() => now && (now.sections = move(now.sections, i, 1))} class={subtle} aria-label="move down">▼</button>
						<button on:click={() => now && (now.sections = now.sections.filter((_, j) => j !== i))} class={danger} aria-label="remove section">✕</button>
					</div>
					<textarea
						value={section.items.join('\n')}
						on:input={(e) => (section.items = linesToItems(e.currentTarget.value))}
						rows={Math.max(2, section.items.length + 1)}
						placeholder="one item per line"
						aria-label="items, one per line"
						class={field}
					/>
				</div>
			{/each}
			<div class="flex gap-2">
				<button on:click={() => now && (now.sections = [...now.sections, { icon: '✨', title: '', items: [] }])} class={subtle}>+ section</button>
				<button on:click={() => save('now', now)} class={primary} disabled={busy}>save</button>
			</div>
		</div>

	<!-- OSU -->
	{:else if active === 'osu' && osu}
		<div class="flex flex-col gap-4">
			<div class="grid sm:grid-cols-2 gap-3">
				<div>
					<label for="p-osu-user" class={fieldLabel}>osu! username (for live stats)</label>
					<input id="p-osu-user" bind:value={osu.username} class={field} />
				</div>
				<label class="flex items-center gap-2 text-sm text-ocean-700 dark:text-ocean-300 mt-5">
					<input type="checkbox" bind:checked={osu.showStats} /> show rank & pp card
				</label>
			</div>
			<div>
				<label for="p-osu-intro" class={fieldLabel}>intro (markdown)</label>
				<textarea id="p-osu-intro" bind:value={osu.intro} rows="4" class={field} />
			</div>

			<div class="flex flex-col gap-2">
				<span class={fieldLabel}>maps i love</span>
				<form on:submit|preventDefault={addMapFromOsu} class="flex gap-2">
					<input bind:value={mapLookup} placeholder="paste a beatmap link or id → fills in title, mapper, stars & cover" aria-label="beatmap link or id" class={field} />
					<button type="submit" class={primary} disabled={lookingUp || !mapLookup.trim()}>{lookingUp ? 'fetching…' : 'fetch'}</button>
				</form>
				{#each osu.maps as map, i}
					<div class="flex flex-wrap sm:flex-nowrap gap-2 items-center">
						{#if map.cover}<img src={map.cover} alt="" class="w-16 h-9 object-cover rounded shrink-0" />{/if}
						<input bind:value={map.title} placeholder="artist - title [diff]" aria-label="map title" class={field} />
						<input bind:value={map.url} placeholder="https://osu.ppy.sh/beatmapsets/…" aria-label="map link" class={field} />
						<input bind:value={map.note} placeholder="why (optional)" aria-label="note" class={field} />
						<button on:click={() => osu && (osu.maps = move(osu.maps, i, -1))} class={subtle} aria-label="move up">▲</button>
						<button on:click={() => osu && (osu.maps = osu.maps.filter((_, j) => j !== i))} class={danger} aria-label="remove map">✕</button>
					</div>
				{/each}
				<div><button on:click={() => osu && (osu.maps = [...osu.maps, { title: '', url: '', note: '' }])} class={subtle}>+ map manually</button></div>
			</div>

			<div class="flex flex-col gap-2">
				<span class={fieldLabel}>achievements (funny ones count)</span>
				{#each osu.achievements as a, i}
					<div class="flex gap-2">
						<input bind:value={a.date} placeholder="2026" aria-label="date" class="{field} !w-28" />
						<input bind:value={a.text} placeholder="fc'd something, got a badge, survived a grand final…" aria-label="achievement" class={field} />
						<button on:click={() => osu && (osu.achievements = move(osu.achievements, i, -1))} class={subtle} aria-label="move up">▲</button>
						<button on:click={() => osu && (osu.achievements = osu.achievements.filter((_, j) => j !== i))} class={danger} aria-label="remove">✕</button>
					</div>
				{/each}
				<div><button on:click={() => osu && (osu.achievements = [...osu.achievements, { date: '', text: '' }])} class={subtle}>+ achievement</button></div>
			</div>

			<p class="text-xs text-ocean-500">maps without a title and http link, and empty achievements, are dropped when you save.</p>
			<div><button on:click={() => save('osu', osu)} class={primary} disabled={busy}>save</button></div>
		</div>

	<!-- MUSIC -->
	{:else if active === 'music' && music}
		<div class="flex flex-col gap-4">
			<div>
				<span class={fieldLabel}>page design</span>
				<div class="flex gap-2">
					{#each [{ v: 'list', label: 'list (original)' }, { v: 'cards', label: 'cards (album art)' }] as d}
						<button
							on:click={() => music && (music.design = d.v === 'cards' ? 'cards' : 'list')}
							class="px-3 py-1.5 text-sm rounded border {music.design === d.v ? 'bg-ocean-600 text-white border-transparent' : 'border-ocean-300 dark:border-ocean-600 text-ocean-700 dark:text-ocean-300'}"
						>
							{d.label}
						</button>
					{/each}
				</div>
			</div>

			<div class="border border-ocean-300 dark:border-ocean-700 rounded p-3 flex flex-col gap-2">
				<div class="flex items-center justify-between">
					<span class={fieldLabel}>song of the month</span>
					{#if music.songOfTheMonth}
						<button on:click={() => music && (music.songOfTheMonth = null)} class={subtle}>remove</button>
					{:else}
						<button on:click={() => music && (music.songOfTheMonth = { title: '', artist: '', url: '', image: '', note: '' })} class={subtle}>+ add</button>
					{/if}
				</div>
				<form on:submit|preventDefault={fetchSong} class="flex gap-2">
					<input bind:value={songLink} placeholder="paste a spotify or youtube link → fills in everything" aria-label="song link" class={field} />
					<button type="submit" class={primary} disabled={songLookingUp || !songLink.trim()}>{songLookingUp ? 'fetching…' : 'fetch'}</button>
				</form>
				{#if music.songOfTheMonth}
					<div class="grid sm:grid-cols-2 gap-2">
						<input bind:value={music.songOfTheMonth.title} placeholder="title" aria-label="song title" class={field} />
						<input bind:value={music.songOfTheMonth.artist} placeholder="artist" aria-label="artist" class={field} />
						<input bind:value={music.songOfTheMonth.url} placeholder="spotify / youtube link" aria-label="song link" class={field} />
						<div class="flex gap-2">
							<input bind:value={music.songOfTheMonth.image} placeholder="cover image url" aria-label="cover image" class={field} />
							<UploadButton folder="misc" maxSize={600} on:uploaded={(e) => music?.songOfTheMonth && (music.songOfTheMonth.image = e.detail)} on:error={(e) => (error = e.detail)} />
						</div>
					</div>
					<input bind:value={music.songOfTheMonth.note} placeholder="why this one (optional)" aria-label="note" class={field} />
					{#if music.songOfTheMonth.image}<img src={music.songOfTheMonth.image} alt="" class="w-16 h-16 rounded object-cover" />{/if}
				{/if}
			</div>

			<div>
				<label for="p-music-notes" class={fieldLabel}>notes above the lists (markdown, e.g. what you're obsessed with lately)</label>
				<textarea
					id="p-music-notes"
					bind:value={music.notes}
					rows="4"
					class={field}
					placeholder={musicNotesExample}
				/>
			</div>
			<div>
				<label for="p-hidden-artists" class={fieldLabel}>hidden artists (one per line) — their tracks never show on the music page or as now playing</label>
				<textarea
					id="p-hidden-artists"
					value={music.hiddenArtists.join('\n')}
					on:input={(e) => music && (music.hiddenArtists = linesToItems(e.currentTarget.value))}
					rows="3"
					class={field}
				/>
			</div>
			<div><button on:click={() => save('music', music)} class={primary} disabled={busy}>save</button></div>
		</div>

	<!-- ABOUT / GALLERY / BUTTONS -->
	{:else if active === 'about' && about && aboutAlt}
		<AboutEditor bind:about bind:alt={aboutAlt} on:error={(e) => (error = e.detail)} />
		<div><button on:click={async () => { await save('about', about); await save('aboutAlt', aboutAlt); }} class={primary} disabled={busy}>save</button></div>
	{:else if active === 'gallery' && gallery}
		<GalleryEditor bind:gallery on:error={(e) => (error = e.detail)} />
		<div><button on:click={() => save('gallery', gallery)} class={primary} disabled={busy}>save</button></div>
	{:else if active === 'buttons' && buttons}
		<ButtonsEditor bind:buttons on:error={(e) => (error = e.detail)} />
		<div><button on:click={() => save('buttons', buttons)} class={primary} disabled={busy}>save</button></div>

	<!-- SKINS -->
	{:else if active === 'skins' && skins}
		<div class="flex flex-col gap-4">
			{#each skins.items as skin, i}
				<div class="border border-ocean-300 dark:border-ocean-700 rounded p-3 flex flex-col gap-3">
					<div class="flex gap-2">
						<input bind:value={skin.name} placeholder="skin name" aria-label="skin name" class={field} />
						<input bind:value={skin.author} placeholder="made by" aria-label="author" class={field} />
						<button on:click={() => skins && (skins.items = move(skins.items, i, -1))} class={subtle} aria-label="move up">▲</button>
						<button on:click={() => skins && (skins.items = move(skins.items, i, 1))} class={subtle} aria-label="move down">▼</button>
						<button on:click={() => skins && confirm(`Remove "${skin.name || 'this skin'}" from the page? (files stay on the CDN)`) && (skins.items = skins.items.filter((_, j) => j !== i))} class={danger} aria-label="remove skin">✕</button>
					</div>
					<textarea bind:value={skin.description} rows="2" placeholder="description (optional): what you changed, when you used it…" aria-label="description" class={field} />

					<div>
						<span class={fieldLabel}>.osk file</span>
						<div class="flex gap-2 items-center">
							<input bind:value={skin.download} placeholder="upload, or paste a download link" aria-label="download link" class={field} />
							<label class="{subtle} shrink-0 cursor-pointer">
								{i in oskProgress ? `${Math.round(oskProgress[i] * 100)}%` : 'upload .osk'}
								<input type="file" accept=".osk,.zip" class="hidden" disabled={i in oskProgress} on:change={(e) => { uploadOsk(i, e.currentTarget.files?.[0]); e.currentTarget.value = ''; }} />
							</label>
						</div>
						{#if i in oskProgress}
							<div class="h-1 mt-1.5 rounded bg-ocean-200 dark:bg-ocean-800 overflow-hidden">
								<div class="h-full bg-ocean-600 transition-all" style="width: {oskProgress[i] * 100}%" />
							</div>
						{/if}
					</div>

					<div>
						<span class={fieldLabel}>preview (card image)</span>
						<div class="flex gap-2 items-center">
							{#if skin.preview}<img src={skin.preview} alt="" class="w-20 h-11 object-cover rounded shrink-0" />{/if}
							<input bind:value={skin.preview} placeholder="image url" aria-label="preview image" class={field} />
							<UploadButton folder="skins" maxSize={1600} on:uploaded={(e) => skins && ((skin.preview = e.detail), (skins = skins))} on:error={(e) => (error = e.detail)} />
						</div>
					</div>

					<div>
						<span class={fieldLabel}>screenshots</span>
						<div class="flex flex-wrap gap-2 items-center">
							{#each skin.screenshots as shot, s}
								<div class="relative group">
									<img src={shot} alt="" class="w-24 h-14 object-cover rounded border border-ocean-300 dark:border-ocean-700" />
									<button
										on:click={() => skins && ((skin.screenshots = skin.screenshots.filter((_, j) => j !== s)), (skins = skins))}
										class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white text-xs leading-none opacity-0 group-hover:opacity-100"
										aria-label="remove screenshot">✕</button
									>
								</div>
							{/each}
							<label class="{subtle} cursor-pointer">
								{shotUploads[i] ? `uploading ${shotUploads[i]}…` : '+ screenshots'}
								<input type="file" accept="image/*" multiple class="hidden" on:change={(e) => { uploadShots(i, e.currentTarget.files); e.currentTarget.value = ''; }} />
							</label>
						</div>
					</div>
				</div>
			{/each}
			<div class="flex gap-2">
				<button on:click={() => skins && (skins.items = [...skins.items, blankSkin()])} class={subtle}>+ skin</button>
				<button on:click={() => save('skins', skins)} class={primary} disabled={busy || Object.keys(oskProgress).length > 0}>save</button>
			</div>
			<p class="text-xs text-ocean-500">big .osk files upload in pieces, so a 30 MB skin takes a little while. skins without a name are dropped when you save.</p>
		</div>

	<!-- CHANGELOG -->
	{:else if active === 'changelog'}
		<div class="flex flex-col gap-3">
			<form on:submit|preventDefault={addEntry} class="flex gap-2">
				<input type="date" bind:value={newEntry.date} aria-label="date" class="{field} !w-40" />
				<input bind:value={newEntry.text} maxlength="500" placeholder="added more garbage" aria-label="what changed" class={field} />
				<button type="submit" class={primary} disabled={busy || !newEntry.text.trim()}>add</button>
			</form>
			{#each changelog as entry (entry.id)}
				<div class="flex gap-2">
					<input type="date" bind:value={entry.date} on:change={() => updateEntry(entry)} aria-label="date" class="{field} !w-40" />
					<input bind:value={entry.text} on:change={() => updateEntry(entry)} aria-label="entry" class={field} />
					<button on:click={() => deleteEntry(entry.id)} class={danger} aria-label="delete entry">✕</button>
				</div>
			{:else}
				<p class="text-sm text-ocean-600 dark:text-ocean-400">no entries yet</p>
			{/each}
			{#if changelog.length}<p class="text-xs text-ocean-500">edits save when you leave the field.</p>{/if}
		</div>
	{:else}
		<p class="text-sm text-ocean-600 dark:text-ocean-400">loading…</p>
	{/if}
</div>
