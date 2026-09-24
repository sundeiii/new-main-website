import type { RequestHandler } from '@sveltejs/kit';
import { json, requireAdmin } from '$lib/server/adminAuth';
import { isDuplicate, run } from '$lib/server/db';
import { cleanPost, ensureTable, listPosts } from '$lib/server/blog';

const duplicateSlug = isDuplicate;

export const GET: RequestHandler = async ({ request }) => {
	const denied = requireAdmin(request);
	if (denied) return denied;
	return json(await listPosts({ includeDrafts: true }));
};

export const POST: RequestHandler = async ({ request }) => {
	const denied = requireAdmin(request);
	if (denied) return denied;

	const post = cleanPost(await request.json().catch(() => ({})));
	if (typeof post === 'string') return json({ error: post }, 400);

	await ensureTable();
	try {
		const result = await run(
			'INSERT INTO blog_posts (kind, slug, title, excerpt, banner, content, published, date, end_date, location, link) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
			[post.kind, post.slug, post.title, post.excerpt, post.banner, post.content, post.published, post.date, post.endDate, post.location, post.link]
		);
		return json({ ...post, id: result.lastId }, 201);
	} catch (e) {
		if (duplicateSlug(e)) return json({ error: `something already uses the url slug "${post.slug}"` }, 409);
		throw e;
	}
};

export const PATCH: RequestHandler = async ({ request }) => {
	const denied = requireAdmin(request);
	if (denied) return denied;

	const body = await request.json().catch(() => ({}));
	const post = cleanPost(body);
	if (typeof post === 'string') return json({ error: post }, 400);

	await ensureTable();
	try {
		const result = await run(
			'UPDATE blog_posts SET kind = ?, slug = ?, title = ?, excerpt = ?, banner = ?, content = ?, published = ?, date = ?, end_date = ?, location = ?, link = ?, updated_at = ? WHERE id = ?',
			[post.kind, post.slug, post.title, post.excerpt, post.banner, post.content, post.published, post.date, post.endDate, post.location, post.link, new Date(), body.id]
		);
		if (result.changes === 0) return json({ error: 'Post not found' }, 404);
		return json({ ...post, id: body.id });
	} catch (e) {
		if (duplicateSlug(e)) return json({ error: `something already uses the url slug "${post.slug}"` }, 409);
		throw e;
	}
};

export const DELETE: RequestHandler = async ({ request }) => {
	const denied = requireAdmin(request);
	if (denied) return denied;

	const { id } = await request.json().catch(() => ({}));
	if (!Number.isInteger(id)) return json({ error: 'id is required' }, 400);

	await ensureTable();
	const result = await run('DELETE FROM blog_posts WHERE id = ?', [id]);
	return json({ deleted: result.changes });
};
