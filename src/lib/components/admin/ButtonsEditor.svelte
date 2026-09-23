<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { danger, field, fieldLabel, subtle } from './styles';
	import UploadButton from './UploadButton.svelte';
	import type { ButtonsSettings } from '$lib/siteSettings';

	export let buttons: ButtonsSettings;
	const dispatch = createEventDispatcher<{ error: string }>();

	function move(i: number, d: number) {
		const j = i + d;
		if (j < 0 || j >= buttons.items.length) return;
		const items = [...buttons.items];
		[items[i], items[j]] = [items[j], items[i]];
		buttons.items = items;
	}
</script>

<div class="flex flex-col gap-4">
	<p class="text-xs text-ocean-500">88×31 buttons shown under "friends" on the home page. gifs stay animated when uploaded.</p>

	{#each buttons.items as b, i}
		<div class="flex flex-wrap sm:flex-nowrap gap-2 items-center">
			{#if b.image}<img src={b.image} alt="" class="h-[31px] w-[88px] shrink-0 {b.pixelated ? 'image-pixelated' : ''}" />{:else}<div class="h-[31px] w-[88px] shrink-0 border border-dashed border-ocean-400 rounded" />{/if}
			<input bind:value={b.image} placeholder="button image url" aria-label="button image" class={field} />
			<UploadButton folder="misc" maxSize={176} on:uploaded={(e) => ((b.image = e.detail), (buttons = buttons))} on:error={(e) => dispatch('error', e.detail)} />
			<input bind:value={b.href} placeholder="links to https://…" aria-label="link" class={field} />
			<input bind:value={b.alt} placeholder="name" aria-label="name" class="{field} !w-36" />
			<label class="flex items-center gap-1 text-xs text-ocean-600 dark:text-ocean-400 shrink-0" title="crisp pixels for pixel-art buttons">
				<input type="checkbox" bind:checked={b.pixelated} /> pixel
			</label>
			<button on:click={() => move(i, -1)} class={subtle} aria-label="move up">▲</button>
			<button on:click={() => (buttons.items = buttons.items.filter((_, j) => j !== i))} class={danger} aria-label="remove button">✕</button>
		</div>
	{/each}
	<div>
		<button on:click={() => (buttons.items = [...buttons.items, { image: '', href: '', alt: '', pixelated: true }])} class={subtle}>+ button</button>
	</div>

	<div class="border-t border-ocean-300 dark:border-ocean-700 pt-4">
		<span class={fieldLabel}>your own button (click on the home page copies its embed code)</span>
		<div class="flex gap-2 items-center">
			{#if buttons.mine.image}<img src={buttons.mine.image} alt="" class="h-[31px] w-[88px] shrink-0 image-pixelated" />{/if}
			<input bind:value={buttons.mine.image} placeholder="image url" aria-label="your button image" class={field} />
			<UploadButton folder="misc" maxSize={176} on:uploaded={(e) => ((buttons.mine.image = e.detail), (buttons = buttons))} on:error={(e) => dispatch('error', e.detail)} />
			<input bind:value={buttons.mine.alt} placeholder="name" aria-label="your button name" class="{field} !w-48" />
		</div>
	</div>
</div>
