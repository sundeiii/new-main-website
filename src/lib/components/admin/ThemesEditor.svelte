<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { danger, field, fieldLabel, subtle } from './styles';
	import UploadButton from './UploadButton.svelte';
	import Backdrop from '$lib/components/site/Backdrop.svelte';
	import { blankTheme, isSafeGradient, textOn, withAlpha, type ThemesSettings, type Theme } from '$lib/themes';

	export let themes: ThemesSettings;
	const dispatch = createEventDispatcher<{ error: string }>();

	let open = '';
	let previewDark = true;

	function move(i: number, d: number) {
		const j = i + d;
		if (j < 0 || j >= themes.items.length) return;
		const items = [...themes.items];
		[items[i], items[j]] = [items[j], items[i]];
		themes.items = items;
	}
	function add() {
		const t = { ...blankTheme(), id: `theme-${themes.items.length + 1}`, name: 'new theme' };
		themes.items = [...themes.items, t];
		open = t.id;
	}
	function remove(i: number) {
		if (themes.items.length <= 1) return dispatch('error', 'keep at least one theme');
		if (confirm(`Delete the "${themes.items[i].name}" theme?`)) themes.items = themes.items.filter((_, j) => j !== i);
	}
	const update = () => (themes = themes);

	// The same CSS variables the site sets, scoped to the preview box.
	const previewVars = (t: Theme, dark: boolean) => {
		const bg = dark ? t.dark : t.light;
		return `--accent: ${t.accent}; --accent-fg: ${textOn(t.accent)}; --glass: ${withAlpha(bg, t.glass / 100)}; --glass-strong: ${withAlpha(bg, Math.max(t.glass, 88) / 100)}; --glass-blur: ${t.glassBlur}px;`;
	};
	const swatchStyle = (t: Theme) => `background: ${t.swatch && isSafeGradient(t.swatch) ? t.swatch : t.accent}`;
	const range = 'w-full accent-ocean-600';
</script>

<div class="flex flex-col gap-3">
	<p class="text-xs text-ocean-600 dark:text-ocean-400">
		the site's themes. visitors pick from these in the nav and in ctrl+k. secret ones only show up once unlocked with a link like
		<code>sundei.ee/?theme=ryo</code> (or <code>tf</code> for the trans one).
	</p>
	<label class="flex flex-wrap items-center gap-2 text-sm text-ocean-700 dark:text-ocean-300">
		new visitors start in
		<select bind:value={themes.default} class="{field} !w-44">
			{#each themes.items.filter((t) => !t.hidden && !t.secret) as t}<option value={t.id}>{t.name}</option>{/each}
		</select>
		<span class="text-xs text-ocean-500">(anyone who already picked a theme keeps theirs)</span>
	</label>

	{#each themes.items as t, i (t.id + i)}
		<div class="border border-ocean-300 dark:border-ocean-700 rounded-lg overflow-hidden">
			<!-- summary row -->
			<div class="flex items-center gap-2 p-2">
				<span class="w-6 h-6 rounded-full shrink-0 ring-1 ring-ocean-400/50" style={swatchStyle(t)} />
				<input bind:value={t.name} on:input={update} placeholder="name" aria-label="theme name" class="{field} !w-40" />
				<span class="text-xs text-ocean-500 truncate">id: {t.id}{t.hidden ? ' · hidden' : ''}{t.secret ? ' · secret' : ''} · {t.background}</span>
				<span class="ml-auto flex gap-1 shrink-0">
					<button on:click={() => (open = open === t.id ? '' : t.id)} class={subtle}>{open === t.id ? 'close' : 'edit'}</button>
					<button on:click={() => move(i, -1)} class={subtle} aria-label="move up">▲</button>
					<button on:click={() => move(i, 1)} class={subtle} aria-label="move down">▼</button>
					<button on:click={() => remove(i)} class={danger} aria-label="delete theme">✕</button>
				</span>
			</div>

			{#if open === t.id}
				<div class="grid lg:grid-cols-[1fr_22rem] gap-5 p-3 border-t border-ocean-300 dark:border-ocean-700">
					<div class="flex flex-col gap-4 text-sm">
						<!-- visibility -->
						<div class="flex flex-wrap gap-x-5 gap-y-2 items-center">
							<label class="flex items-center gap-2"><input type="checkbox" bind:checked={t.hidden} on:change={update} /> hidden</label>
							<label class="flex items-center gap-2"><input type="checkbox" bind:checked={t.secret} on:change={update} /> secret</label>
							<label class="flex items-center gap-2">
								mode
								<select bind:value={t.mode} on:change={update} class="{field} !w-auto !py-1">
									<option value="both">follows dark mode</option>
									<option value="light">always light</option>
									<option value="dark">always dark</option>
								</select>
							</label>
						</div>

						<!-- colours -->
						<div class="grid grid-cols-3 gap-3">
							{#each [{ key: 'light', label: 'page (light)' }, { key: 'dark', label: 'page (dark)' }, { key: 'accent', label: 'accent' }] as c}
								<div class="flex flex-col gap-1">
									<span class={fieldLabel}>{c.label}</span>
									<span class="flex items-center gap-2">
										<input type="color" bind:value={t[c.key === 'light' ? 'light' : c.key === 'dark' ? 'dark' : 'accent']} on:input={update} aria-label={c.label} class="w-8 h-8 bg-transparent shrink-0" />
										<input bind:value={t[c.key === 'light' ? 'light' : c.key === 'dark' ? 'dark' : 'accent']} on:input={update} aria-label="{c.label} (hex)" class="{field} !py-1 font-mono text-xs" />
									</span>
								</div>
							{/each}
						</div>

						<!-- background -->
						<div class="flex flex-col gap-2">
							<span class={fieldLabel}>background</span>
							<div class="flex flex-wrap gap-1">
								{#each [{ v: 'mesh', l: 'moving mesh' }, { v: 'solid', l: 'plain colour' }, { v: 'gradient', l: 'gradient' }, { v: 'image', l: 'picture' }] as b}
									<button
										on:click={() => ((t.background = b.v === 'mesh' ? 'mesh' : b.v === 'solid' ? 'solid' : b.v === 'gradient' ? 'gradient' : 'image'), update())}
										class="px-3 py-1 rounded text-xs border {t.background === b.v ? 'bg-ocean-600 text-white border-ocean-600' : 'border-ocean-300 dark:border-ocean-700'}">{b.l}</button
									>
								{/each}
							</div>

							{#if t.background === 'mesh'}
								<div class="flex flex-wrap items-center gap-2">
									{#each t.mesh as _, m}
										<span class="flex items-center gap-0.5">
											<input type="color" bind:value={t.mesh[m]} on:input={update} class="w-8 h-8 bg-transparent" aria-label="mesh colour {m + 1}" />
											{#if t.mesh.length > 2}<button on:click={() => ((t.mesh = t.mesh.filter((_, k) => k !== m)), update())} class="text-xs text-red-500 px-0.5" aria-label="remove colour">✕</button>{/if}
										</span>
									{/each}
									{#if t.mesh.length < 6}<button on:click={() => ((t.mesh = [...t.mesh, t.accent]), update())} class={subtle}>+ colour</button>{/if}
								</div>
								<label class="flex flex-col gap-1"><span class={fieldLabel}>strength: {t.meshStrength}%</span><input type="range" min="0" max="60" bind:value={t.meshStrength} on:input={update} class={range} /></label>
							{:else if t.background === 'gradient'}
								<textarea bind:value={t.gradient} on:input={update} rows="2" placeholder="linear-gradient(135deg, #1e2b45, #3b5584)" class="{field} font-mono text-xs" />
								{#if t.gradient && !isSafeGradient(t.gradient)}<span class="text-xs text-red-500">not a valid css gradient (linear-, radial- or conic-gradient(…))</span>{/if}
							{:else if t.background === 'image'}
								<div class="flex gap-2 items-center">
									<input bind:value={t.image} on:input={update} placeholder="https://… (or upload)" aria-label="picture url" class="{field} text-xs" />
									<UploadButton folder="themes" maxSize={2560} label="upload" on:uploaded={(e) => ((t.image = e.detail), update())} on:error={(e) => dispatch('error', e.detail)} />
								</div>
								<label class="flex items-center gap-2">
									fit
									<select bind:value={t.fit} on:change={update} class="{field} !w-auto !py-1">
										<option value="cover">fill the screen</option>
										<option value="contain">show all of it</option>
										<option value="tile">tile / repeat</option>
									</select>
								</label>
							{/if}
							{#if t.background === 'image' || t.background === 'gradient'}
								<div class="grid grid-cols-2 gap-3">
									<label class="flex flex-col gap-1"><span class={fieldLabel}>blur: {t.blur}px</span><input type="range" min="0" max="40" bind:value={t.blur} on:input={update} class={range} /></label>
									<label class="flex flex-col gap-1"><span class={fieldLabel}>dim: {t.dim}%</span><input type="range" min="0" max="90" bind:value={t.dim} on:input={update} class={range} /></label>
								</div>
							{/if}
						</div>

						<!-- glass -->
						<div class="grid grid-cols-2 gap-3">
							<label class="flex flex-col gap-1"><span class={fieldLabel}>glass (nav, cards): {t.glass}% solid</span><input type="range" min="0" max="100" bind:value={t.glass} on:input={update} class={range} /></label>
							<label class="flex flex-col gap-1"><span class={fieldLabel}>glass blur: {t.glassBlur}px</span><input type="range" min="0" max="40" bind:value={t.glassBlur} on:input={update} class={range} /></label>
						</div>

						<!-- extras -->
						<div class="grid sm:grid-cols-2 gap-3">
							<label class="flex flex-col gap-1">
								<span class={fieldLabel}>top stripe (css gradient, optional)</span>
								<input bind:value={t.stripe} on:input={update} placeholder="linear-gradient(90deg, …)" class="{field} font-mono text-xs" />
							</label>
							<label class="flex flex-col gap-1">
								<span class={fieldLabel}>picker dot (css gradient, optional)</span>
								<input bind:value={t.swatch} on:input={update} placeholder="uses the accent" class="{field} font-mono text-xs" />
							</label>
						</div>
						<div class="flex items-center gap-3">
							<span class={fieldLabel}>cursor trail</span>
							<input type="color" value={t.trail[0] ?? '#00f0ff'} on:input={(e) => ((t.trail = [e.currentTarget.value, ...t.trail.slice(1)]), update())} class="w-8 h-8 bg-transparent" aria-label="trail colour" />
							<span class="text-xs text-ocean-500">tip</span>
							<input type="color" value={t.trail[1] ?? t.trail[0] ?? '#00f0ff'} on:input={(e) => ((t.trail = [t.trail[0] ?? '#00f0ff', e.currentTarget.value]), update())} class="w-8 h-8 bg-transparent" aria-label="trail tip colour" />
							{#if t.trail.length > 1}<button on:click={() => ((t.trail = t.trail.slice(0, 1)), update())} class={subtle}>same as body</button>{/if}
						</div>
					</div>

					<!-- live preview -->
					<div class="flex flex-col gap-2">
						<div class="flex items-center justify-between">
							<span class={fieldLabel}>preview</span>
							{#if t.mode === 'both'}
								<button on:click={() => (previewDark = !previewDark)} class={subtle}>{previewDark ? 'dark' : 'light'}</button>
							{/if}
						</div>
						{#if true}
							{@const dark = t.mode === 'both' ? previewDark : t.mode === 'dark'}
							<div class="relative h-72 rounded-lg overflow-hidden isolate font-cascadia {dark ? 'dark' : ''}" style={previewVars(t, dark)}>
								<Backdrop theme={t} {dark} contained />
								{#if t.stripe && isSafeGradient(t.stripe)}<div class="absolute top-0 inset-x-0 h-[3px]" style="background: {t.stripe}" />{/if}
								<div class="relative p-3 flex flex-col gap-3 h-full">
									<div class="glass rounded-full px-3 py-1.5 flex items-center gap-3 text-[11px] border border-ocean-300/60 dark:border-ocean-700/60">
										<span class="text-ocean-900 dark:text-ocean-100">sundei</span>
										<span class="accent-soft rounded-full px-2 py-0.5 text-ocean-900 dark:text-ocean-100">home</span>
										<span class="text-ocean-600 dark:text-ocean-400">about</span>
										<span class="ml-auto w-3 h-3 rounded-full" style={swatchStyle(t)} />
									</div>
									<div class="glass rounded-2xl p-3 border border-ocean-300/50 dark:border-ocean-700/50 flex flex-col gap-1.5 text-xs">
										<span class="flex items-center gap-2 text-[10px] uppercase tracking-widest text-ocean-500"><span class="w-2 h-2 rounded-full accent-bg" />playing</span>
										<span class="text-ocean-900 dark:text-ocean-100">osu!</span>
										<span class="text-ocean-600 dark:text-ocean-400">clicking circles</span>
										<div class="h-1 rounded-full bg-ocean-300/60 dark:bg-ocean-700/60 overflow-hidden"><div class="h-full w-2/3 accent-bg" /></div>
									</div>
									<p class="text-xs text-ocean-800 dark:text-ocean-200 leading-relaxed">
										page text sits right on the background, so <span style="background: var(--accent); color: var(--accent-fg)">check it stays readable</span>.
									</p>
								</div>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	{/each}

	<div><button on:click={add} class={subtle}>+ theme</button></div>
</div>
