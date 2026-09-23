<script context="module" lang="ts">
	import type { Load } from '@sveltejs/kit';

	// Posts written in the admin panel. Hand-written posts (like /blog/welcome) have their own
	// folder, which SvelteKit matches before this route.
	export const load: Load = async ({ params, fetch }) => {
		const res = await fetch(`/api/blog/${params.slug}?kind=post`);
		if (!res.ok) return { status: 404, error: new Error('post not found') };
		return { props: { post: await res.json() } };
	};
</script>

<script lang="ts">
	import PostPage from '$lib/components/PostPage.svelte';

	export let post: any;
</script>

<PostPage {post} back={{ href: '/blog', label: 'back to blog' }} />
