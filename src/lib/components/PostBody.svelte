<script lang="ts">
	// Rendered markdown for a blog post, styled like the hand-written welcome post.
	// Clicking an image opens it full screen.
	export let html: string;

	let zoomed: string | null = null;

	function handleClick(e: MouseEvent) {
		const img = (e.target as HTMLElement).closest('img');
		if (img && !img.closest('a')) zoomed = img.src;
	}
</script>

<svelte:window on:keydown={(e) => e.key === 'Escape' && (zoomed = null)} />

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="post-body" on:click={handleClick}>
	{@html html}
</div>

{#if zoomed}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80" on:click={() => (zoomed = null)} role="button" tabindex="0">
		<img src={zoomed} alt="" class="max-h-[90vh] max-w-[90vw] rounded object-contain" />
	</div>
{/if}

<style>
	.post-body {
		color: #2b303b;
		line-height: 1.7;
		overflow-wrap: anywhere;
	}
	:global(.dark) .post-body {
		color: #c0c5ce;
	}

	.post-body :global(p),
	.post-body :global(ul),
	.post-body :global(ol),
	.post-body :global(blockquote),
	.post-body :global(pre),
	.post-body :global(table) {
		margin-bottom: 1rem;
	}

	.post-body :global(h1),
	.post-body :global(h2),
	.post-body :global(h3) {
		color: #1f232c;
		font-weight: 700;
		margin: 2rem 0 1rem;
		line-height: 1.3;
	}
	:global(.dark) .post-body :global(h1),
	:global(.dark) .post-body :global(h2),
	:global(.dark) .post-body :global(h3) {
		color: #eff1f5;
	}
	.post-body :global(h1) { font-size: 1.6rem; }
	.post-body :global(h2) { font-size: 1.5rem; }
	.post-body :global(h3) { font-size: 1.25rem; }

	/* No extra space above the first / below the last element, e.g. notes that start with a heading */
	.post-body > :global(:first-child) { margin-top: 0; }
	.post-body > :global(:last-child) { margin-bottom: 0; }

	.post-body :global(ul) { list-style: disc inside; }
	.post-body :global(ol) { list-style: decimal inside; }
	.post-body :global(li) { margin-bottom: 0.5rem; }

	.post-body :global(a) {
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.post-body :global(img) {
		max-width: 100%;
		border-radius: 0.25rem;
		border: 1px solid #c0c5ce;
		margin: 1.5rem auto;
		cursor: zoom-in;
	}
	:global(.dark) .post-body :global(img) {
		border-color: #343d46;
	}

	.post-body :global(blockquote) {
		border-left: 3px solid #a7adba;
		padding-left: 1rem;
		font-style: italic;
		color: #4f5b66;
	}
	:global(.dark) .post-body :global(blockquote) {
		border-color: #4f5b66;
		color: #a7adba;
	}

	.post-body :global(code) {
		font-size: 0.9em;
		background: rgba(101, 115, 126, 0.15);
		padding: 0.1em 0.35em;
		border-radius: 0.25rem;
	}
	.post-body :global(pre) {
		background: rgba(101, 115, 126, 0.15);
		padding: 1rem;
		border-radius: 0.375rem;
		overflow-x: auto;
	}
	.post-body :global(pre code) {
		background: none;
		padding: 0;
	}

	.post-body :global(hr) {
		border-color: #c0c5ce;
		margin: 2rem 0;
	}
	:global(.dark) .post-body :global(hr) {
		border-color: #343d46;
	}

	.post-body :global(table) {
		border-collapse: collapse;
		display: block;
		overflow-x: auto;
	}
	.post-body :global(th),
	.post-body :global(td) {
		border: 1px solid #a7adba;
		padding: 0.35rem 0.75rem;
	}
</style>
