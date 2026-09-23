<script context="module" lang="ts">
	import type { Load } from '@sveltejs/kit';

	export const load: Load = async ({ params, fetch }) => {
		const res = await fetch(`/api/blog/${params.slug}?kind=event`);
		if (!res.ok) return { status: 404, error: new Error('event not found') };
		return { props: { post: await res.json() } };
	};
</script>

<script lang="ts">
	import PostPage from '$lib/components/PostPage.svelte';

	export let post: any;
</script>

<PostPage {post} back={{ href: '/events', label: 'all events' }} />
