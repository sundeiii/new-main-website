<script context="module" lang="ts">
	// A blog post written in the admin panel.
	import type { Load } from '@sveltejs/kit';

	export const load: Load = async ({ params, fetch }) => {
		const res = await fetch(`/api/blog/${params.slug}?kind=post`);
		if (!res.ok) return { status: 404, error: new Error('post not found') };
		return { props: { post: await res.json() } };
	};
</script>

<script lang="ts">
	import PostPage from '$lib/components/site/PostPage.svelte';

	export let post: any;
</script>

<PostPage {post} back={{ href: '/blog', label: 'back to blog' }} />
