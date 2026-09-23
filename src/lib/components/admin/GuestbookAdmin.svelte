<script lang="ts">
	import { onMount } from 'svelte';
	import { adminApi, danger, field, primary, subtle } from './styles';

	export let onUnauthorized: () => void;

	interface Entry {
		id: string;
		name: string;
		message: string;
		created_at: string;
	}

	let entries: Entry[] = [];
	let loading = false;
	let error = '';
	let search = '';
	let selected = new Set<string>();
	let editingId: string | null = null;
	let editName = '';
	let editMessage = '';
	let saving = false;

	$: query = search.trim().toLowerCase();
	$: filtered = query
		? entries.filter((e) => e.name.toLowerCase().includes(query) || e.message.toLowerCase().includes(query))
		: entries;
	$: weekCount = entries.filter((e) => Date.now() - new Date(e.created_at).getTime() < 7 * 864e5).length;
	$: allFilteredSelected = filtered.length > 0 && filtered.every((e) => selected.has(e.id));

	const api = (method: string, body?: unknown) => adminApi('/api/admin/guestbook', method, body, onUnauthorized);

	async function loadEntries() {
		loading = true;
		error = '';
		try {
			entries = await api('GET');
			selected = new Set([...selected].filter((id) => entries.some((e) => e.id === id)));
		} catch (e) {
			error = (e as Error).message;
		} finally {
			loading = false;
		}
	}

	function startEdit(entry: Entry) {
		editingId = entry.id;
		editName = entry.name;
		editMessage = entry.message;
	}

	async function saveEdit() {
		saving = true;
		error = '';
		try {
			const updated: Entry = await api('PATCH', { id: editingId, name: editName, message: editMessage });
			entries = entries.map((e) => (e.id === updated.id ? updated : e));
			editingId = null;
		} catch (e) {
			error = (e as Error).message;
		} finally {
			saving = false;
		}
	}

	async function remove(ids: string[]) {
		const what = ids.length === 1 ? 'this entry' : `${ids.length} entries`;
		if (!confirm(`Delete ${what}? This can't be undone. Export first if you want a backup.`)) return;
		error = '';
		try {
			await api('DELETE', { ids });
			entries = entries.filter((e) => !ids.includes(e.id));
			ids.forEach((id) => selected.delete(id));
			selected = selected;
		} catch (e) {
			error = (e as Error).message;
		}
	}

	function toggle(id: string) {
		selected.has(id) ? selected.delete(id) : selected.add(id);
		selected = selected;
	}

	function toggleAll() {
		if (allFilteredSelected) filtered.forEach((e) => selected.delete(e.id));
		else filtered.forEach((e) => selected.add(e.id));
		selected = selected;
	}

	function exportJson() {
		const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = `guestbook-${new Date().toISOString().slice(0, 10)}.json`;
		a.click();
		URL.revokeObjectURL(a.href);
	}

	const formatDate = (d: string) =>
		new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

	onMount(loadEntries);
</script>

<div class="flex flex-col gap-5">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<div class="flex gap-6 text-sm">
			<div><span class="text-ocean-900 dark:text-ocean-100 text-lg">{entries.length}</span> <span class="text-ocean-600 dark:text-ocean-400">entries</span></div>
			<div><span class="text-ocean-900 dark:text-ocean-100 text-lg">{weekCount}</span> <span class="text-ocean-600 dark:text-ocean-400">this week</span></div>
		</div>
		<div class="flex flex-wrap gap-2">
			<button on:click={loadEntries} class={subtle} disabled={loading}>{loading ? 'loading…' : 'refresh'}</button>
			<a href="/api/admin/guestbook/export" download class={subtle}>export .sql</a>
			<button on:click={exportJson} class={subtle} disabled={!entries.length}>export .json</button>
		</div>
	</div>

	<div class="flex flex-wrap items-center gap-3">
		<input type="search" bind:value={search} placeholder="search name or message…" class="{field} flex-1 min-w-[200px]" />
		{#if selected.size}
			<button on:click={() => remove([...selected])} class={danger}>delete {selected.size} selected</button>
		{/if}
	</div>

	{#if error}<p class="text-red-600 dark:text-red-400 text-sm">{error}</p>{/if}

	{#if filtered.length}
		<label class="flex items-center gap-2 text-xs text-ocean-600 dark:text-ocean-400">
			<input type="checkbox" checked={allFilteredSelected} on:change={toggleAll} />
			select all {query ? 'matching' : ''} ({filtered.length})
		</label>
	{/if}

	<div class="flex flex-col gap-2">
		{#each filtered as entry (entry.id)}
			<div class="border border-ocean-300 dark:border-ocean-700 rounded p-3 flex gap-3 {selected.has(entry.id) ? 'bg-ocean-200/60 dark:bg-ocean-800/60' : ''}">
				<input type="checkbox" class="mt-1" checked={selected.has(entry.id)} on:change={() => toggle(entry.id)} aria-label="select entry by {entry.name}" />
				<div class="flex-1 min-w-0">
					{#if editingId === entry.id}
						<div class="flex flex-col gap-2">
							<input bind:value={editName} maxlength="50" class={field} aria-label="name" />
							<textarea bind:value={editMessage} maxlength="500" rows="3" class={field} aria-label="message" />
							<div class="flex gap-2">
								<button on:click={saveEdit} class={primary} disabled={saving}>{saving ? 'saving…' : 'save'}</button>
								<button on:click={() => (editingId = null)} class={subtle}>cancel</button>
							</div>
						</div>
					{:else}
						<div class="flex flex-wrap items-baseline justify-between gap-2">
							<span class="text-ocean-900 dark:text-ocean-100 text-sm font-medium">{entry.name}</span>
							<span class="text-ocean-500 text-xs">{formatDate(entry.created_at)}</span>
						</div>
						<p class="text-ocean-700 dark:text-ocean-300 text-sm mt-1 whitespace-pre-wrap break-words">{entry.message}</p>
					{/if}
				</div>
				{#if editingId !== entry.id}
					<div class="flex flex-col gap-1.5">
						<button on:click={() => startEdit(entry)} class={subtle}>edit</button>
						<button on:click={() => remove([entry.id])} class={danger}>delete</button>
					</div>
				{/if}
			</div>
		{:else}
			<p class="text-ocean-600 dark:text-ocean-400 text-sm">
				{loading ? 'loading…' : query ? 'no entries match your search' : 'the guestbook is empty'}
			</p>
		{/each}
	</div>
</div>
