import type { RequestHandler } from '@sveltejs/kit';
import { json, requireAdmin } from '$lib/server/adminAuth';
import { pool } from '$lib/server/db';
import { cleanEntry, ensureChangelogTable, listChangelog } from '$lib/server/changelog';

export const GET: RequestHandler = async ({ request }) => {
	const denied = requireAdmin(request);
	if (denied) return denied;
	return json(await listChangelog());
};

export const POST: RequestHandler = async ({ request }) => {
	const denied = requireAdmin(request);
	if (denied) return denied;
	const entry = cleanEntry(await request.json().catch(() => ({})));
	if (typeof entry === 'string') return json({ error: entry }, 400);
	await ensureChangelogTable();
	const [result]: any = await pool.query('INSERT INTO changelog (date, text) VALUES (?, ?)', [entry.date, entry.text]);
	return json({ ...entry, id: result.insertId }, 201);
};

export const PATCH: RequestHandler = async ({ request }) => {
	const denied = requireAdmin(request);
	if (denied) return denied;
	const body = await request.json().catch(() => ({}));
	const entry = cleanEntry(body);
	if (typeof entry === 'string') return json({ error: entry }, 400);
	await ensureChangelogTable();
	const [result]: any = await pool.query('UPDATE changelog SET date = ?, text = ? WHERE id = ?', [entry.date, entry.text, body.id]);
	if (result.affectedRows === 0) return json({ error: 'Entry not found' }, 404);
	return json({ ...entry, id: body.id });
};

export const DELETE: RequestHandler = async ({ request }) => {
	const denied = requireAdmin(request);
	if (denied) return denied;
	const { id } = await request.json().catch(() => ({}));
	if (!Number.isInteger(id)) return json({ error: 'id is required' }, 400);
	await ensureChangelogTable();
	await pool.query('DELETE FROM changelog WHERE id = ?', [id]);
	return json({ ok: true });
};
