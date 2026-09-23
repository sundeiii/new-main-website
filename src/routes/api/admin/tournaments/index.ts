import type { RequestHandler } from '@sveltejs/kit';
import { json, requireAdmin } from '$lib/server/adminAuth';
import { pool } from '$lib/server/db';
import { tournamentSeed } from '$lib/tournamentSeed';
import { cleanTournament, ensureTable, importSeed, insertTournament, listTournaments } from '$lib/server/tournaments';

const seedCount = tournamentSeed.reduce((n, g) => n + g.events.length, 0);

export const GET: RequestHandler = async ({ request }) => {
	const denied = requireAdmin(request);
	if (denied) return denied;
	return json({ tournaments: await listTournaments(), seedCount });
};

// Create a tournament, or { action: 'import' } to copy in the old hardcoded list.
export const POST: RequestHandler = async ({ request }) => {
	const denied = requireAdmin(request);
	if (denied) return denied;

	const body = await request.json().catch(() => ({}));
	if (body.action === 'import') {
		return json({ imported: await importSeed(), tournaments: await listTournaments() });
	}

	const t = cleanTournament(body);
	if (typeof t === 'string') return json({ error: t }, 400);
	const id = await insertTournament(t);
	return json({ ...t, id }, 201);
};

export const PATCH: RequestHandler = async ({ request }) => {
	const denied = requireAdmin(request);
	if (denied) return denied;

	const body = await request.json().catch(() => ({}));
	const t = cleanTournament(body);
	if (typeof t === 'string') return json({ error: t }, 400);

	await ensureTable();
	const [result]: any = await pool.query(
		'UPDATE tournaments SET year = ?, name = ?, role = ?, link = ?, banner = ?, badge = ?, hosts = ? WHERE id = ?',
		[t.year, t.name, t.role, t.link, t.banner, t.badge, JSON.stringify(t.hosts), body.id]
	);
	if (result.affectedRows === 0) return json({ error: 'Tournament not found' }, 404);
	return json({ ...t, id: body.id });
};

// Save a new order: { order: [id, id, ...] } — position is the index in the array.
export const PUT: RequestHandler = async ({ request }) => {
	const denied = requireAdmin(request);
	if (denied) return denied;

	const { order } = await request.json().catch(() => ({}));
	if (!Array.isArray(order) || !order.every(Number.isInteger)) return json({ error: 'order must be a list of ids' }, 400);

	await ensureTable();
	await Promise.all(order.map((id: number, position: number) => pool.query('UPDATE tournaments SET position = ? WHERE id = ?', [position, id])));
	return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ request }) => {
	const denied = requireAdmin(request);
	if (denied) return denied;

	const { id } = await request.json().catch(() => ({}));
	if (!Number.isInteger(id)) return json({ error: 'id is required' }, 400);

	await ensureTable();
	const [result]: any = await pool.query('DELETE FROM tournaments WHERE id = ?', [id]);
	return json({ deleted: result.affectedRows });
};
