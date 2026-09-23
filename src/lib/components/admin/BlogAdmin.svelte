<script lang="ts">
	import { onMount } from 'svelte';
	import { marked } from 'marked';
	import PostBody from '$lib/components/PostBody.svelte';
	import { adminApi, danger, field, fieldLabel, primary, subtle } from './styles';
	import UploadButton from './UploadButton.svelte';
	import { imageFrom, uploadImage } from './upload';

	export let onUnauthorized: () => void;

	type Kind = 'post' | 'event' | 'project';

	interface Post {
		id?: number;
		kind: Kind;
		location: string | null;
		link: string | null;
		slug: string;
		title: string;
		excerpt: string;
		banner: string | null;
		content: string;
		published: boolean;
		date: string;
	}

	const api = (method: string, body?: unknown) => adminApi('/api/admin/blog', method, body, onUnauthorized);
	const today = () => new Date().toISOString().slice(0, 10);
	const slugify = (s: string) =>
		s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100);

	const kinds: { value: Kind; label: string; path: string }[] = [
		{ value: 'post', label: 'blog posts', path: '/blog' },
		{ value: 'event', label: 'events', path: '/events' },
		{ value: 'project', label: 'projects', path: '/projects' }
	];
	const pathOf = (p: { kind: Kind; slug: string }) => `${kinds.find((k) => k.value === p.kind)?.path ?? '/blog'}/${p.slug}`;
	let kindFilter: Kind = 'post';

	let posts: Post[] = [];
	let loading = true;
	let busy = false;
	let error = '';
	let saved = '';

	// null = list view, otherwise the post being written/edited
	let draft: Post | null = null;
	let slugTouched = false;
	let showPreview = true;
	let editor: HTMLTextAreaElement;
	let imageUploads = 0;

	// Puts text at the cursor in the post editor.
	function insertAtCursor(text: string) {
		if (!draft) return;
		const start = editor?.selectionStart ?? draft.content.length;
		const end = editor?.selectionEnd ?? start;
		draft.content = draft.content.slice(0, start) + text + draft.content.slice(end);
		requestAnimationFrame(() => editor?.setSelectionRange(start + text.length, start + text.length));
	}

	const imageMarkdown = (url: string) => `\n![](${url})\n`;

	// Pasting or dropping an image into the editor uploads it and inserts it at the cursor.
	async function uploadInto(e: ClipboardEvent | DragEvent) {
		const file = imageFrom(e);
		if (!file) return;
		e.preventDefault();
		imageUploads++;
		error = '';
		try {
			insertAtCursor(imageMarkdown(await uploadImage(file, 'blog')));
		} catch (err) {
			error = (err as Error).message;
		} finally {
			imageUploads--;
		}
	}

	$: if (draft && !slugTouched) draft.slug = slugify(draft.title);
	$: previewHtml = draft ? (marked.parse(draft.content || '', { async: false, gfm: true, breaks: true }) as string) : '';
	$: shown = posts.filter((p) => (p.kind ?? 'post') === kindFilter);
	$: words = draft ? draft.content.trim().split(/\s+/).filter(Boolean).length : 0;

	async function load() {
		loading = true;
		try {
			posts = await api('GET');
		} catch (e) {
			error = (e as Error).message;
		} finally {
			loading = false;
		}
	}

	function newPost() {
		draft = { kind: kindFilter, location: '', link: '', slug: '', title: '', excerpt: '', banner: '', content: '', published: false, date: today() };
		slugTouched = false;
		error = saved = '';
	}

	function edit(post: Post) {
		draft = { ...post, kind: post.kind ?? 'post', banner: post.banner ?? '', location: post.location ?? '', link: post.link ?? '' };
		slugTouched = true;
		error = saved = '';
	}

	async function save(publish?: boolean) {
		if (!draft) return;
		if (publish !== undefined) draft.published = publish;
		busy = true;
		error = saved = '';
		try {
			const result: Post = draft.id ? await api('PATCH', draft) : await api('POST', draft);
			draft = { ...result, banner: result.banner ?? '', location: result.location ?? '', link: result.link ?? '' };
			slugTouched = true;
			saved = draft.published ? 'saved & published' : 'saved as draft';
			await load();
		} catch (e) {
			error = (e as Error).message;
		} finally {
			busy = false;
		}
	}

	async function remove(post: Post) {
		if (!confirm(`Delete "${post.title}"? This can't be undone.`)) return;
		busy = true;
		error = '';
		try {
			await api('DELETE', { id: post.id });
			posts = posts.filter((p) => p.id !== post.id);
			if (draft?.id === post.id) draft = null;
		} catch (e) {
			error = (e as Error).message;
		} finally {
			busy = false;
		}
	}

	// Ctrl/Cmd+S saves while editing.
	function handleKeydown(e: KeyboardEvent) {
		if (draft && (e.ctrlKey || e.metaKey) && e.key === 's') {
			e.preventDefault();
			save();
		}
	}

	onMount(load);
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="flex flex-col gap-5">
	{#if error}<p class="text-red-600 dark:text-red-400 text-sm">{error}</p>{/if}

	{#if !draft}
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="flex gap-1">
				{#each kinds as k}
					<button
						on:click={() => (kindFilter = k.value)}
						class="px-3 py-1 text-sm rounded {kindFilter === k.value ? 'bg-ocean-600 text-white' : 'text-ocean-600 dark:text-ocean-400 hover:bg-ocean-200 dark:hover:bg-ocean-800'}"
					>
						{k.label} ({posts.filter((p) => (p.kind ?? 'post') === k.value).length})
					</button>
				{/each}
			</div>
			<button on:click={newPost} class={primary}>+ new {kindFilter}</button>
		</div>

		{#if loading}
			<p class="text-ocean-600 dark:text-ocean-400 text-sm">loading…</p>
		{:else}
			<div class="flex flex-col gap-2">
				{#each shown as post (post.id)}
					<div class="border border-ocean-300 dark:border-ocean-700 rounded p-3 flex items-center gap-3">
						{#if post.banner}<img src={post.banner} alt="" loading="lazy" class="w-20 h-12 object-cover rounded hidden sm:block" />{/if}
						<div class="flex-1 min-w-0">
							<div class="text-ocean-900 dark:text-ocean-100 text-sm truncate">{post.title}</div>
							<div class="text-xs text-ocean-600 dark:text-ocean-400">
								{post.date} · {pathOf(post)} ·
								<span class={post.published ? 'text-ocean-green' : 'text-ocean-yellow'}>{post.published ? 'published' : 'draft'}</span>
							</div>
						</div>
						<a href={pathOf(post)} target="_blank" class={subtle}>view</a>
						<button on:click={() => edit(post)} class={subtle}>edit</button>
						<button on:click={() => remove(post)} class={danger} disabled={busy}>delete</button>
					</div>
				{:else}
					<p class="text-ocean-600 dark:text-ocean-400 text-sm">
						{#if kindFilter === 'post'}
							no posts written here yet. your welcome post is a hand-written page, so it doesn't show up in this list, but it stays on the blog.
						{:else if kindFilter === 'event'}
							no events yet. add LANs and meetups here; upcoming ones show a countdown on /events.
						{:else}
							no project pages yet. each one gets its own page on /projects with a screenshot and a link.
						{/if}
					</p>
				{/each}
			</div>
		{/if}
	{:else}
		<!-- editor -->
		<div class="flex flex-wrap items-center justify-between gap-2">
			<button on:click={() => { draft = null; load(); }} class={subtle}>← all posts</button>
			<div class="flex flex-wrap items-center gap-2">
				{#if saved}<span class="text-ocean-green text-sm">{saved}</span>{/if}
				{#if draft.id}<a href={pathOf(draft)} target="_blank" class={subtle}>view ↗</a>{/if}
				<button on:click={() => save()} class={subtle} disabled={busy}>{busy ? 'saving…' : 'save'}</button>
				{#if draft.published}
					<button on:click={() => save(false)} class={subtle} disabled={busy}>unpublish</button>
				{:else}
					<button on:click={() => save(true)} class={primary} disabled={busy}>publish</button>
				{/if}
			</div>
		</div>

		<div class="flex gap-1">
			{#each kinds as k}
				<button
					on:click={() => draft && (draft.kind = k.value)}
					class="px-3 py-1 text-xs rounded {draft.kind === k.value ? 'bg-ocean-600 text-white' : 'border border-ocean-300 dark:border-ocean-600 text-ocean-600 dark:text-ocean-400'}"
				>
					{k.value}
				</button>
			{/each}
		</div>

		<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
			<div class="sm:col-span-2">
				<label for="b-title" class={fieldLabel}>title</label>
				<input id="b-title" bind:value={draft.title} maxlength="200" class={field} />
			</div>
			<div>
				<label for="b-date" class={fieldLabel}>{draft.kind === 'event' ? 'event date' : 'date'}</label>
				<input id="b-date" type="date" bind:value={draft.date} class={field} />
			</div>
		</div>
		<div>
			<label for="b-slug" class={fieldLabel}>url: {pathOf({ kind: draft.kind, slug: draft.slug || '…' })}</label>
			<input id="b-slug" bind:value={draft.slug} on:input={() => (slugTouched = true)} class={field} />
		</div>
		{#if draft.kind === 'event'}
			<div>
				<label for="b-location" class={fieldLabel}>location</label>
				<input id="b-location" bind:value={draft.location} maxlength="200" placeholder="e.g. TipiLAN, Tallinn" class={field} />
			</div>
		{:else if draft.kind === 'project'}
			<div>
				<label for="b-link" class={fieldLabel}>link (repo or live site)</label>
				<input id="b-link" type="url" bind:value={draft.link} placeholder="https://github.com/…" class={field} />
			</div>
		{/if}
		<div>
			<label for="b-excerpt" class={fieldLabel}>{draft.kind === 'project' ? 'one-line description' : 'excerpt (shown on the list)'}</label>
			<input id="b-excerpt" bind:value={draft.excerpt} maxlength="500" class={field} />
		</div>
		<div>
			<label for="b-banner" class={fieldLabel}>{draft.kind === 'project' ? 'screenshot url (optional)' : 'banner image url (optional)'}</label>
			<div class="flex gap-2">
				<input id="b-banner" type="url" bind:value={draft.banner} class={field} />
				<UploadButton folder="blog" maxSize={2400} on:uploaded={(e) => draft && (draft.banner = e.detail)} on:error={(e) => (error = e.detail)} />
			</div>
			{#if draft.banner}<img src={draft.banner} alt="banner preview" class="mt-2 h-24 w-full object-cover rounded border border-ocean-300 dark:border-ocean-700" />{/if}
		</div>

		<div class="flex items-center justify-between">
			<span class={fieldLabel}>
				post (markdown: <code>## heading</code> · <code>**bold**</code> · <code>*italic*</code> · <code>- list</code> ·
				<code>[link](url)</code> · <code>![image](url)</code> · <code>&gt; quote</code>) · {words} words · ctrl+s saves
			</span>
			<div class="flex items-center gap-3 shrink-0">
				{#if imageUploads}<span class="text-xs text-ocean-500">uploading {imageUploads} image{imageUploads > 1 ? 's' : ''}…</span>{/if}
				<UploadButton folder="blog" label="+ image" on:uploaded={(e) => insertAtCursor(imageMarkdown(e.detail))} on:error={(e) => (error = e.detail)} />
				<label class="flex items-center gap-1.5 text-xs text-ocean-600 dark:text-ocean-400">
					<input type="checkbox" bind:checked={showPreview} /> preview
				</label>
			</div>
		</div>
		<div class="grid gap-4 {showPreview ? 'lg:grid-cols-2' : ''}">
			<textarea
				bind:this={editor}
				bind:value={draft.content}
				on:paste={uploadInto}
				on:drop={uploadInto}
				rows="24"
				class="{field} font-mono leading-relaxed"
				aria-label="post content"
				placeholder="write something… (paste or drop an image to upload it)"
			/>
			{#if showPreview}
				<div class="border border-ocean-300 dark:border-ocean-700 rounded p-4 max-h-[36rem] overflow-y-auto">
					{#if draft.content.trim()}
						<PostBody html={previewHtml} />
					{:else}
						<p class="text-ocean-500 text-sm">preview shows up here</p>
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</div>
