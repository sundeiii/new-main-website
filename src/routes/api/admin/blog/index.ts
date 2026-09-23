import type { RequestHandler } from '@sveltejs/kit';
import { json, requireAdmin } from '$lib/server/adminAuth';
import { pool } from '$lib/server/db';
import { cleanPost, ensureTable, listPosts } from '$lib/server/blog';

const duplicateSlug = (e: any) => e?.code === 'ER_DUP_ENTRY';

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
		const [result]: any = await pool.query(
			'INSERT INTO blog_posts (slug, title, excerpt, banner, content, published, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
			[post.slug, post.title, post.excerpt, post.banner, post.content, post.published, post.date]
		);
		return json({ ...post, id: result.insertId }, 201);
	} catch (e) {
		if (duplicateSlug(e)) return json({ error: `a post with the url /blog/${post.slug} already exists` }, 409);
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
		const [result]: any = await pool.query(
			'UPDATE blog_posts SET slug = ?, title = ?, excerpt = ?, banner = ?, content = ?, published = ?, date = ? WHERE id = ?',
			[post.slug, post.title, post.excerpt, post.banner, post.content, post.published, post.date, body.id]
		);
		if (result.affectedRows === 0) return json({ error: 'Post not found' }, 404);
		return json({ ...post, id: body.id });
	} catch (e) {
		if (duplicateSlug(e)) return json({ error: `a post with the url /blog/${post.slug} already exists` }, 409);
		throw e;
	}
};

export const DELETE: RequestHandler = async ({ request }) => {
	const denied = requireAdmin(request);
	if (denied) return denied;

	const { id } = await request.json().catch(() => ({}));
	if (!Number.isInteger(id)) return json({ error: 'id is required' }, 400);

	await ensureTable();
	const [result]: any = await pool.query('DELETE FROM blog_posts WHERE id = ?', [id]);
	return json({ deleted: result.affectedRows });
};
