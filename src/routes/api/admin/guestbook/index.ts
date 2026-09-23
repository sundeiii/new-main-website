import type { RequestHandler } from '@sveltejs/kit';
import { json, requireAdmin } from '$lib/server/adminAuth';
import { pool } from '$lib/server/db';

export const GET: RequestHandler = async ({ request }) => {
	const denied = requireAdmin(request);
	if (denied) return denied;

	const [rows] = await pool.query('SELECT * FROM guestbook ORDER BY created_at DESC');
	return json(rows);
};

// Edit an entry's name and/or message.
export const PATCH: RequestHandler = async ({ request }) => {
	const denied = requireAdmin(request);
	if (denied) return denied;

	const { id, name, message } = await request.json().catch(() => ({}));
	if (!id || typeof name !== 'string' || typeof message !== 'string' || !name.trim() || !message.trim()) {
		return json({ error: 'id, name and message are required' }, 400);
	}
	if (name.length > 50 || message.length > 500) {
		return json({ error: 'Name max 50 chars, message max 500 chars' }, 400);
	}

	const [result]: any = await pool.query('UPDATE guestbook SET name = ?, message = ? WHERE id = ?', [
		name.trim(),
		message.trim(),
		id
	]);
	if (result.affectedRows === 0) return json({ error: 'Entry not found' }, 404);

	const [rows]: any = await pool.query('SELECT * FROM guestbook WHERE id = ?', [id]);
	return json(rows[0]);
};

// Delete one or more entries: { ids: [...] }
export const DELETE: RequestHandler = async ({ request }) => {
	const denied = requireAdmin(request);
	if (denied) return denied;

	const { ids } = await request.json().catch(() => ({}));
	if (!Array.isArray(ids) || ids.length === 0) return json({ error: 'ids is required' }, 400);

	const [result]: any = await pool.query('DELETE FROM guestbook WHERE id IN (?)', [ids]);
	return json({ deleted: result.affectedRows });
};
