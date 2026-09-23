<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { danger, field, fieldLabel, subtle } from './styles';
	import UploadButton from './UploadButton.svelte';
	import type { AboutSettings, AboutSpec } from '$lib/siteSettings';

	export let about: AboutSettings;
	const dispatch = createEventDispatcher<{ error: string }>();

	const lines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);
	const blankSpec = (): AboutSpec => ({ label: '', value: '', sub: '', image: '' });

	function move<T>(list: T[], i: number, d: number): T[] {
		const j = i + d;
		if (j < 0 || j >= list.length) return list;
		const copy = [...list];
		[copy[i], copy[j]] = [copy[j], copy[i]];
		return copy;
	}
</script>

<div class="flex flex-col gap-5">
	<div>
		<label for="a-bio" class={fieldLabel}>who? (markdown; keep it as neutral as you like)</label>
		<textarea id="a-bio" bind:value={about.bio} rows="6" class={field} />
	</div>

	{#each [{ key: 'pcBuild', title: 'pc build' }, { key: 'peripherals', title: 'peripherals' }] as group}
		{@const specs = about[group.key === 'pcBuild' ? 'pcBuild' : 'peripherals']}
		<div class="flex flex-col gap-2">
			<span class={fieldLabel}>{group.title}</span>
			{#each specs as spec, i}
				<div class="flex flex-wrap sm:flex-nowrap gap-2 items-center">
					{#if spec.image}<img src={spec.image} alt="" class="w-10 h-10 object-contain rounded bg-ocean-200/40 dark:bg-ocean-800/40 shrink-0" />{/if}
					<input bind:value={spec.label} placeholder="what (e.g. mouse)" aria-label="label" class="{field} sm:!w-36" />
					<input bind:value={spec.value} placeholder="model" aria-label="model" class={field} />
					<input bind:value={spec.sub} placeholder="details" aria-label="details" class={field} />
					<UploadButton folder="misc" maxSize={800} label="img" on:uploaded={(e) => ((spec.image = e.detail), (about = about))} on:error={(e) => dispatch('error', e.detail)} />
					<button
						on:click={() => (group.key === 'pcBuild' ? (about.pcBuild = move(about.pcBuild, i, -1)) : (about.peripherals = move(about.peripherals, i, -1)))}
						class={subtle}
						aria-label="move up">▲</button
					>
					<button
						on:click={() =>
							group.key === 'pcBuild'
								? (about.pcBuild = about.pcBuild.filter((_, j) => j !== i))
								: (about.peripherals = about.peripherals.filter((_, j) => j !== i))}
						class={danger}
						aria-label="remove">✕</button
					>
				</div>
			{/each}
			<div>
				<button
					on:click={() => (group.key === 'pcBuild' ? (about.pcBuild = [...about.pcBuild, blankSpec()]) : (about.peripherals = [...about.peripherals, blankSpec()]))}
					class={subtle}>+ item</button
				>
			</div>
		</div>
	{/each}

	<div class="flex flex-col gap-2">
		<span class={fieldLabel}>languages & tools</span>
		<div class="flex flex-wrap gap-2">
			{#each about.languages as lang, i}
				<div class="flex items-center gap-1 border border-ocean-300 dark:border-ocean-700 rounded px-1.5 py-1">
					<input type="color" bind:value={lang.color} aria-label="colour" class="w-6 h-6 bg-transparent" />
					<input bind:value={lang.name} aria-label="name" class="bg-transparent text-sm w-24 text-ocean-900 dark:text-ocean-100 outline-none" />
					<button on:click={() => (about.languages = about.languages.filter((_, j) => j !== i))} class="text-xs text-red-500 px-1" aria-label="remove">✕</button>
				</div>
			{/each}
			<button on:click={() => (about.languages = [...about.languages, { name: '', color: '#888888' }])} class={subtle}>+</button>
		</div>
	</div>

	<div class="grid sm:grid-cols-2 gap-4">
		<div>
			<label for="a-interests" class={fieldLabel}>interests (one per line)</label>
			<textarea id="a-interests" value={about.interests.join('\n')} on:input={(e) => (about.interests = lines(e.currentTarget.value))} rows="5" class={field} />
		</div>
		<div class="flex flex-col gap-2">
			<span class={fieldLabel}>reach me (links)</span>
			{#each about.links as link, i}
				<div class="flex gap-2">
					<input bind:value={link.label} placeholder="label" aria-label="label" class="{field} !w-28" />
					<input bind:value={link.url} placeholder="https://… or mailto:…" aria-label="url" class={field} />
					<button on:click={() => (about.links = about.links.filter((_, j) => j !== i))} class={danger} aria-label="remove link">✕</button>
				</div>
			{/each}
			<div><button on:click={() => (about.links = [...about.links, { label: '', url: '' }])} class={subtle}>+ link</button></div>
		</div>
	</div>
</div>
