<script lang="ts">
	import { onMount } from 'svelte';
	import type { Tournament } from '$lib/tournamentSeed';
	import { adminApi, danger, field, fieldLabel, primary, subtle } from './styles';
	import UploadButton from './UploadButton.svelte';

	export let onUnauthorized: () => void;

	const api = (method: string, body?: unknown) => adminApi('/api/admin/tournaments', method, body, onUnauthorized);

	let tournaments: Tournament[] = [];
	let seedCount = 0;
	let loading = true;
	let busy = false;
	let error = '';

	// Form state: editingId null = adding a new one.
	const blank = () => ({ year: String(new Date().getFullYear()), name: '', role: 'referee', link: '', banner: '', badge: '', hosts: [{ name: '', id: '' }] });
	let form = blank();
	let editingId: number | null = null;
	let formEl: HTMLElement;

	$: years = [...new Set(tournaments.map((t) => t.year))].sort().reverse();
	$: roles = [...new Set(['referee', 'streamer', 'commentator', 'playtester', ...tournaments.map((t) => t.role)])];
	$: groups = years.map((year) => ({ year, events: tournaments.filter((t) => t.year === year) }));

	async function load() {
		loading = true;
		error = '';
		try {
			({ tournaments, seedCount } = await api('GET'));
		} catch (e) {
			error = (e as Error).message;
		} finally {
			loading = false;
		}
	}

	async function run(action: () => Promise<void>) {
		busy = true;
		error = '';
		try {
			await action();
		} catch (e) {
			error = (e as Error).message;
		} finally {
			busy = false;
		}
	}

	const importSeed = () =>
		run(async () => {
			({ tournaments } = await api('POST', { action: 'import' }));
		});

	// Accepts a plain id or a pasted osu! profile link.
	const parseOsuId = (v: string | number) => Number(String(v).match(/(\d+)\/?(?:[a-z]+)?\/?$/)?.[1] ?? v);

	function payload() {
		return {
			...form,
			hosts: form.hosts.filter((h) => h.name.trim() && String(h.id).trim()).map((h) => ({ name: h.name.trim(), id: parseOsuId(h.id) }))
		};
	}

	const save = () =>
		run(async () => {
			if (editingId === null) {
				await api('POST', payload());
			} else {
				await api('PATCH', { ...payload(), id: editingId });
			}
			await load();
			cancelEdit();
		});

	function startEdit(t: Tournament) {
		editingId = t.id ?? null;
		form = {
			year: t.year,
			name: t.name,
			role: t.role,
			link: t.link,
			banner: t.banner ?? '',
			badge: t.badge ?? '',
			hosts: t.hosts.length ? t.hosts.map((h) => ({ name: h.name, id: String(h.id) })) : [{ name: '', id: '' }]
		};
		formEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	function cancelEdit() {
		editingId = null;
		form = { ...blank(), year: form.year };
	}

	const remove = (t: Tournament) =>
		run(async () => {
			if (!confirm(`Delete "${t.name}"?`)) return;
			await api('DELETE', { id: t.id });
			tournaments = tournaments.filter((x) => x.id !== t.id);
			if (editingId === t.id) cancelEdit();
		});

	const move = (year: string, index: number, delta: number) =>
		run(async () => {
			const events = tournaments.filter((t) => t.year === year);
			const target = index + delta;
			if (target < 0 || target >= events.length) return;
			[events[index], events[target]] = [events[target], events[index]];
			tournaments = [...tournaments.filter((t) => t.year !== year), ...events];
			await api('PUT', { order: events.map((t) => t.id) });
		});

	onMount(load);
</script>

<div class="flex flex-col gap-6">
	{#if error}<p class="text-red-600 dark:text-red-400 text-sm">{error}</p>{/if}

	{#if loading}
		<p class="text-ocean-600 dark:text-ocean-400 text-sm">loading…</p>
	{:else if tournaments.length === 0}
		<div class="border border-ocean-300 dark:border-ocean-700 rounded-lg p-6 flex flex-col gap-3 text-sm">
			<p class="text-ocean-800 dark:text-ocean-200">
				no tournaments in the database yet. the site is still showing the {seedCount} that used to be hardcoded in the page.
			</p>
			<div>
				<button on:click={importSeed} class={primary} disabled={busy}>{busy ? 'importing…' : `import those ${seedCount} tournaments`}</button>
			</div>
			<p class="text-ocean-500 text-xs">or just add a new one below; the page switches to the database as soon as it has anything in it.</p>
		</div>
	{/if}

	<!-- add / edit form -->
	<form bind:this={formEl} on:submit|preventDefault={save} class="border border-ocean-300 dark:border-ocean-700 rounded-lg p-5 flex flex-col gap-4">
		<div class="flex items-center justify-between">
			<h2 class="text-ocean-900 dark:text-ocean-100">{editingId === null ? 'add tournament' : `editing: ${form.name}`}</h2>
			{#if editingId !== null}<button type="button" on:click={cancelEdit} class={subtle}>cancel</button>{/if}
		</div>

		<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
			<div>
				<label for="t-year" class={fieldLabel}>year</label>
				<input id="t-year" bind:value={form.year} list="t-years" required class={field} />
				<datalist id="t-years">{#each years as y}<option value={y} />{/each}</datalist>
			</div>
			<div class="sm:col-span-2">
				<label for="t-role" class={fieldLabel}>role</label>
				<input id="t-role" bind:value={form.role} list="t-roles" required class={field} />
				<datalist id="t-roles">{#each roles as r}<option value={r} />{/each}</datalist>
			</div>
		</div>

		<div>
			<label for="t-name" class={fieldLabel}>name</label>
			<input id="t-name" bind:value={form.name} required maxlength="200" class={field} />
		</div>
		<div>
			<label for="t-link" class={fieldLabel}>link (forum post)</label>
			<input id="t-link" bind:value={form.link} type="url" required placeholder="https://osu.ppy.sh/community/forums/topics/…" class={field} />
		</div>
		<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
			<div>
				<label for="t-banner" class={fieldLabel}>banner image url (optional)</label>
				<div class="flex gap-2">
					<input id="t-banner" bind:value={form.banner} type="url" class={field} />
					<UploadButton folder="tournaments" maxSize={1600} on:uploaded={(e) => (form.banner = e.detail)} on:error={(e) => (error = e.detail)} />
				</div>
			</div>
			<div>
				<label for="t-badge" class={fieldLabel}>badge image url (optional)</label>
				<div class="flex gap-2">
					<input id="t-badge" bind:value={form.badge} type="url" class={field} />
					<UploadButton folder="tournaments" maxSize={400} on:uploaded={(e) => (form.badge = e.detail)} on:error={(e) => (error = e.detail)} />
				</div>
			</div>
		</div>
		{#if form.banner || form.badge}
			<div class="flex gap-3 items-center">
				{#if form.banner}<img src={form.banner} alt="banner preview" class="h-16 flex-1 max-w-xs object-cover rounded border border-ocean-300 dark:border-ocean-700" />{/if}
				{#if form.badge}<img src={form.badge} alt="badge preview" class="h-16 w-16 object-contain" />{/if}
			</div>
		{/if}

		<div class="flex flex-col gap-2">
			<span class={fieldLabel}>hosts (osu! id or profile link)</span>
			{#each form.hosts as host, i}
				<div class="flex gap-2">
					<input bind:value={host.name} placeholder="name" aria-label="host name" class={field} />
					<input bind:value={host.id} placeholder="osu! id or profile url" aria-label="host osu id" class={field} />
					<button type="button" on:click={() => (form.hosts = form.hosts.filter((_, j) => j !== i))} class={subtle} aria-label="remove host">✕</button>
				</div>
			{/each}
			<div><button type="button" on:click={() => (form.hosts = [...form.hosts, { name: '', id: '' }])} class={subtle}>+ host</button></div>
		</div>

		<div><button type="submit" class={primary} disabled={busy}>{busy ? 'saving…' : editingId === null ? 'add tournament' : 'save changes'}</button></div>
	</form>

	<!-- list -->
	{#if tournaments.length}
		<div class="flex items-center justify-between text-sm">
			<span class="text-ocean-600 dark:text-ocean-400">{tournaments.length} tournaments</span>
			<a href="/tournaments" target="_blank" class={subtle}>view page ↗</a>
		</div>
		{#each groups as group}
			<div class="flex flex-col gap-2">
				<h3 class="text-ocean-900 dark:text-ocean-100">{group.year} <span class="text-ocean-500 text-xs">({group.events.length})</span></h3>
				{#each group.events as t, i (t.id)}
					<div class="border border-ocean-300 dark:border-ocean-700 rounded p-3 flex items-center gap-3 {editingId === t.id ? 'ring-2 ring-ocean-500' : ''}">
						<div class="flex flex-col">
							<button on:click={() => move(group.year, i, -1)} disabled={busy || i === 0} class="text-ocean-500 hover:text-ocean-900 dark:hover:text-ocean-100 disabled:opacity-20 text-xs" aria-label="move up">▲</button>
							<button on:click={() => move(group.year, i, 1)} disabled={busy || i === group.events.length - 1} class="text-ocean-500 hover:text-ocean-900 dark:hover:text-ocean-100 disabled:opacity-20 text-xs" aria-label="move down">▼</button>
						</div>
						{#if t.banner}<img src={t.banner} alt="" loading="lazy" class="w-20 h-10 object-cover rounded hidden sm:block" />{/if}
						<div class="flex-1 min-w-0">
							<div class="text-ocean-900 dark:text-ocean-100 text-sm truncate">{t.name}</div>
							<div class="text-ocean-600 dark:text-ocean-400 text-xs truncate">
								{t.role}{t.hosts.length ? ` · ${t.hosts.map((h) => h.name).join(', ')}` : ''}{t.badge ? ' · 🏅' : ''}
							</div>
						</div>
						<button on:click={() => startEdit(t)} class={subtle}>edit</button>
						<button on:click={() => remove(t)} class={danger} disabled={busy}>delete</button>
					</div>
				{/each}
			</div>
		{/each}
	{/if}
</div>
