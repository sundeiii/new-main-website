import type { RequestHandler } from '@sveltejs/kit';
import { isMissingTable } from '$lib/server/db';
import { isKind, listPosts } from '$lib/server/blog';

// Published items for a list page (no content): ?kind=post (default), event or project.
export const GET: RequestHandler = async ({ url }) => {
	const kind = url.searchParams.get('kind') || 'post';
	if (!isKind(kind)) return new Response(JSON.stringify({ error: 'Unknown kind' }), { status: 400 });

	let items: any[] = [];
	try {
		// Reading time instead of the text itself (about 200 words a minute).
		items = (await listPosts({ kind, createTable: false })).map(({ content, published, id, ...rest }) => ({
			...rest,
			minutes: Math.max(1, Math.round(content.trim().split(/\s+/).filter(Boolean).length / 200))
		}));
	} catch (error: any) {
		// Table not created yet (nothing written in the admin panel), or the database is down.
		if (!isMissingTable(error)) console.error('Failed to load posts:', error);
	}
	items.sort((a, b) => b.date.localeCompare(a.date));

	return new Response(JSON.stringify(items), {
		headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=300' }
	});
};
