<script lang="ts">
	import { onMount } from 'svelte';
	import { adminApi, danger, subtle } from './styles';
	import { imageFrom, uploadImage, type Folder } from './upload';

	export let onUnauthorized: () => void;

	interface MediaFile {
		name: string;
		size: number;
		modified: number;
		url: string;
	}

	const folders: Folder[] = ['blog', 'tournaments', 'skins', 'gallery', 'misc'];
	let folder: Folder = 'blog';
	let files: MediaFile[] = [];
	let loading = false;
	let uploading = 0;
	let error = '';
	let copied = '';
	let dragging = false;
	let fileInput: HTMLInputElement;

	async function load() {
		loading = true;
		error = '';
		try {
			files = (await adminApi(`/api/admin/media?folder=${folder}`, 'GET', undefined, onUnauthorized)).files;
		} catch (e) {
			files = [];
			error = (e as Error).message;
		} finally {
			loading = false;
		}
	}

	async function uploadAll(list: File[]) {
		error = '';
		await Promise.all(
			list.map(async (file) => {
				uploading++;
				try {
					await uploadImage(file, folder);
				} catch (e) {
					error = `${file.name}: ${(e as Error).message}`;
				} finally {
					uploading--;
				}
			})
		);
		load();
	}

	function onDrop(e: DragEvent) {
		dragging = false;
		e.preventDefault();
		uploadAll([...(e.dataTransfer?.files ?? [])].filter((f) => f.type.startsWith('image/')));
	}

	async function copy(file: MediaFile) {
		await navigator.clipboard.writeText(file.url);
		copied = file.name;
		setTimeout(() => copied === file.name && (copied = ''), 1500);
	}

	async function remove(file: MediaFile) {
		if (!confirm(`Delete ${file.name}? Anything still using this image will show a broken image.`)) return;
		try {
			await adminApi(`/api/admin/media?folder=${folder}&name=${encodeURIComponent(file.name)}`, 'DELETE', undefined, onUnauthorized);
			files = files.filter((f) => f.name !== file.name);
		} catch (e) {
			error = (e as Error).message;
		}
	}

	const size = (b: number) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`);

	onMount(load);
</script>

<svelte:window on:paste={(e) => { const f = imageFrom(e); if (f) uploadAll([f]); }} />

<div class="flex flex-col gap-5">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div class="flex gap-1">
			{#each folders as f}
				<button
					on:click={() => { folder = f; load(); }}
					class="px-3 py-1 text-sm rounded {folder === f ? 'bg-ocean-600 text-white' : 'text-ocean-600 dark:text-ocean-400 hover:bg-ocean-200 dark:hover:bg-ocean-800'}"
				>
					{f}
				</button>
			{/each}
		</div>
		<div class="flex gap-2">
			<button on:click={load} class={subtle} disabled={loading}>{loading ? 'loading…' : 'refresh'}</button>
			<input bind:this={fileInput} type="file" accept="image/*" multiple class="hidden" on:change={() => { uploadAll([...(fileInput.files ?? [])]); fileInput.value = ''; }} />
			<button on:click={() => fileInput.click()} class={subtle} disabled={uploading > 0}>{uploading ? `uploading ${uploading}…` : 'upload'}</button>
		</div>
	</div>

	<div
		class="border-2 border-dashed rounded-lg p-4 text-center text-sm transition-colors {dragging ? 'border-ocean-500 bg-ocean-200/40 dark:bg-ocean-800/40' : 'border-ocean-300 dark:border-ocean-700'} text-ocean-600 dark:text-ocean-400"
		on:dragover|preventDefault={() => (dragging = true)}
		on:dragleave={() => (dragging = false)}
		on:drop={onDrop}
	>
		drop images here or paste one (ctrl+v) to upload to <code>/{folder}</code>. they're shrunk to webp first.
	</div>

	{#if error}<p class="text-red-600 dark:text-red-400 text-sm">{error}</p>{/if}

	<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
		{#each files as file (file.name)}
			<div class="border border-ocean-300 dark:border-ocean-700 rounded overflow-hidden flex flex-col">
				<a href={file.url} target="_blank" rel="noopener noreferrer" class="block aspect-video bg-ocean-200 dark:bg-ocean-800">
					<img src={file.url} alt={file.name} loading="lazy" class="w-full h-full object-cover" />
				</a>
				<div class="p-2 flex flex-col gap-1.5">
					<span class="text-xs text-ocean-800 dark:text-ocean-200 truncate" title={file.name}>{file.name}</span>
					<span class="text-[10px] text-ocean-500">{size(file.size)} · {new Date(file.modified).toLocaleDateString('en-GB')}</span>
					<div class="flex gap-1.5">
						<button on:click={() => copy(file)} class="{subtle} flex-1 !px-2 !py-1 !text-xs">{copied === file.name ? 'copied!' : 'copy url'}</button>
						<button on:click={() => remove(file)} class="{danger} !px-2 !py-1 !text-xs" aria-label="delete {file.name}">✕</button>
					</div>
				</div>
			</div>
		{:else}
			{#if !loading && !error}<p class="text-ocean-600 dark:text-ocean-400 text-sm col-span-full">nothing in /{folder} yet</p>{/if}
		{/each}
	</div>
</div>
