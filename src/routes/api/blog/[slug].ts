import type { RequestHandler } from '@sveltejs/kit';
import { isAdmin } from '$lib/server/adminAuth';
import { getPost, renderMarkdown } from '$lib/server/blog';

// One post with its markdown rendered to HTML. Drafts are only visible to the logged-in admin.
export const GET: RequestHandler = async ({ params, request }) => {
	try {
		const post = await getPost(params.slug, { includeDrafts: isAdmin(request) });
		if (post) {
			const { content, ...rest } = post;
			return new Response(JSON.stringify({ ...rest, html: renderMarkdown(content) }), {
				headers: { 'Content-Type': 'application/json' }
			});
		}
	} catch (error) {
		console.error('Failed to load blog post:', error);
	}
	return new Response(JSON.stringify({ error: 'Post not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
};
