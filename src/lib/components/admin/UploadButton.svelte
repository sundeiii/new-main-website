<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { subtle } from './styles';
	import { uploadImage, type Folder } from './upload';

	export let folder: Folder;
	export let label = 'upload';
	/** Longest side in px after resizing. */
	export let maxSize = 2000;

	const dispatch = createEventDispatcher<{ uploaded: string; error: string }>();
	let fileInput: HTMLInputElement;
	let uploading = false;

	async function handle(file: File | undefined) {
		if (!file) return;
		uploading = true;
		try {
			dispatch('uploaded', await uploadImage(file, folder, maxSize));
		} catch (e) {
			dispatch('error', (e as Error).message);
		} finally {
			uploading = false;
			fileInput.value = '';
		}
	}
</script>

<input bind:this={fileInput} type="file" accept="image/*" class="hidden" on:change={() => handle(fileInput.files?.[0])} />
<button type="button" class="{subtle} shrink-0" disabled={uploading} on:click={() => fileInput.click()}>
	{uploading ? 'uploading…' : label}
</button>
