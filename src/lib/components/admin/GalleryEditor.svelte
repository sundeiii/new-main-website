<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { danger, field, fieldLabel, subtle } from './styles';
	import { uploadImage } from './upload';
	import type { GallerySettings } from '$lib/siteSettings';

	export let gallery: GallerySettings;
	const dispatch = createEventDispatcher<{ error: string }>();

	let open = 0; // index of the album being edited
	let uploading = 0;
	$: album = gallery.albums[open];

	const today = () => new Date().toISOString().slice(0, 10);

	function addAlbum() {
		const title = prompt('album name (e.g. lan, estonia, friends, cursed)')?.trim();
		if (!title) return;
		gallery.albums = [...gallery.albums, { slug: '', title, description: '', photos: [] }];
		open = gallery.albums.length - 1;
	}

	function removeAlbum() {
		if (!album || !confirm(`Remove the album "${album.title}" and its ${album.photos.length} photos from the page? (files stay on the CDN)`)) return;
		gallery.albums = gallery.albums.filter((_, i) => i !== open);
		open = Math.max(0, open - 1);
	}

	async function upload(files: FileList | null) {
		if (!files || !album) return;
		const list = [...files];
		uploading = list.length;
		for (const file of list) {
			try {
				const src = await uploadImage(file, 'gallery', 2400);
				// Use the photo's own date when the file has one, otherwise today.
				const date = file.lastModified ? new Date(file.lastModified).toISOString().slice(0, 10) : today();
				album.photos = [...album.photos, { src, caption: '', date }];
				gallery = gallery;
			} catch (e) {
				dispatch('error', `${file.name}: ${(e as Error).message}`);
			}
			uploading--;
		}
	}

	function movePhoto(i: number, d: number) {
		const j = i + d;
		if (!album || j < 0 || j >= album.photos.length) return;
		const photos = [...album.photos];
		[photos[i], photos[j]] = [photos[j], photos[i]];
		album.photos = photos;
	}

	function moveToAlbum(i: number, target: number) {
		if (!album || target === open) return;
		const [photo] = album.photos.splice(i, 1);
		gallery.albums[target].photos = [...gallery.albums[target].photos, photo];
		gallery = gallery;
	}
</script>

<div class="flex flex-col gap-4">
	<div class="flex flex-wrap items-center gap-1.5">
		{#each gallery.albums as a, i}
			<button
				on:click={() => (open = i)}
				class="px-3 py-1 text-sm rounded-full border {open === i ? 'bg-ocean-600 text-white border-transparent' : 'border-ocean-300 dark:border-ocean-600 text-ocean-700 dark:text-ocean-300'}"
			>
				{a.title || 'untitled'} <span class="opacity-60">{a.photos.length}</span>
			</button>
		{/each}
		<button on:click={addAlbum} class={subtle}>+ album</button>
	</div>

	{#if album}
		<div class="grid sm:grid-cols-3 gap-3">
			<div>
				<label for="g-title" class={fieldLabel}>album name</label>
				<input id="g-title" bind:value={album.title} class={field} />
			</div>
			<div class="sm:col-span-2">
				<label for="g-desc" class={fieldLabel}>description (optional, shown above the photos)</label>
				<input id="g-desc" bind:value={album.description} class={field} />
			</div>
		</div>

		<div class="flex flex-wrap items-center gap-2">
			<label class="{subtle} cursor-pointer">
				{uploading ? `uploading ${uploading}…` : '+ photos'}
				<input type="file" accept="image/*" multiple class="hidden" disabled={uploading > 0} on:change={(e) => { upload(e.currentTarget.files); e.currentTarget.value = ''; }} />
			</label>
			<span class="text-xs text-ocean-500">pick several at once. they're shrunk to webp first.</span>
			<button on:click={removeAlbum} class="{danger} ml-auto">remove album</button>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
			{#each album.photos as photo, i (photo.src + i)}
				<div class="flex gap-3 border border-ocean-300 dark:border-ocean-700 rounded p-2">
					<img src={photo.src} alt="" class="w-24 h-24 object-cover rounded shrink-0" />
					<div class="flex flex-col gap-1.5 flex-1 min-w-0">
						<input bind:value={photo.caption} placeholder="caption" aria-label="caption" class="{field} !py-1" />
						<input type="date" bind:value={photo.date} aria-label="date" class="{field} !py-1" />
						<div class="flex gap-1 items-center">
							<button on:click={() => movePhoto(i, -1)} class="{subtle} !px-2 !py-0.5 !text-xs" aria-label="move left">◀</button>
							<button on:click={() => movePhoto(i, 1)} class="{subtle} !px-2 !py-0.5 !text-xs" aria-label="move right">▶</button>
							{#if gallery.albums.length > 1}
								<select on:change={(e) => { moveToAlbum(i, Number(e.currentTarget.value)); e.currentTarget.value = ''; }} class="{field} !py-0.5 !text-xs !w-auto" aria-label="move to album">
									<option value="">move to…</option>
									{#each gallery.albums as a, ai}{#if ai !== open}<option value={ai}>{a.title}</option>{/if}{/each}
								</select>
							{/if}
							<button on:click={() => album && (album.photos = album.photos.filter((_, j) => j !== i))} class="{danger} !px-2 !py-0.5 !text-xs ml-auto" aria-label="remove photo">✕</button>
						</div>
					</div>
				</div>
			{:else}
				<p class="text-sm text-ocean-600 dark:text-ocean-400">no photos in this album yet</p>
			{/each}
		</div>
		<p class="text-xs text-ocean-500">albums with no photos are hidden on the gallery page.</p>
	{:else}
		<p class="text-sm text-ocean-600 dark:text-ocean-400">no albums yet, add one</p>
	{/if}
</div>
