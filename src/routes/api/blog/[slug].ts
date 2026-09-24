import type { RequestHandler } from '@sveltejs/kit';
import { isMissingTable } from '$lib/server/db';
import { isAdmin } from '$lib/server/adminAuth';
import { getPost, isKind, renderMarkdown } from '$lib/server/blog';

// One post, event or project (?kind=, default post) with its markdown rendered to HTML.
// Drafts are only visible to the logged-in admin.
export const GET: RequestHandler = async ({ params, request, url }) => {
	const kind = url.searchParams.get('kind') || 'post';
	try {
		const post = isKind(kind) ? await getPost(params.slug, kind, { includeDrafts: isAdmin(request) }) : null;
		if (post) {
			const { content, ...rest } = post;
			return new Response(JSON.stringify({ ...rest, html: renderMarkdown(content) }), {
				headers: { 'Content-Type': 'application/json' }
			});
		}
	} catch (error: any) {
		if (!isMissingTable(error)) console.error('Failed to load post:', error);
	}
	return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
};
