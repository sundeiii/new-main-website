import type { RequestHandler } from '@sveltejs/kit';
import { db, ensureSchema, isMissingTable, sql } from '$lib/server/db';
import { hashIp, tooFast } from '$lib/server/guestbook';

// Ryo's headpats, one total shared by everyone. The page sends pats in small batches.
const KEY = 'headpats';
const json = (body: unknown, init: ResponseInit = {}) =>
	new Response(JSON.stringify(body), { ...init, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...init.headers } });

async function total() {
	try {
		const [row] = await sql('SELECT n FROM counters WHERE k = ?', [KEY]);
		return Number(row?.n ?? 0);
	} catch (error) {
		if (!isMissingTable(error)) throw error;
		return 0;
	}
}

export const GET: RequestHandler = async () => json({ total: await total() });

export const POST: RequestHandler = async ({ request, clientAddress }) => {
	const body = await request.json().catch(() => null);
	const pats = Math.floor(Number(body?.pats));
	if (!(pats >= 1 && pats <= 10)) return json({ error: 'pats must be 1 to 10' }, { status: 400 });
	// About 10 batches a minute is plenty for a person; past that, it just doesn't count.
	if (tooFast('pat:' + hashIp(String(clientAddress || 'unknown')), 12)) return json({ total: await total(), ignored: true });
	await ensureSchema();
	const [, result] = await db.batch(
		[
			{ sql: 'INSERT INTO counters (k, n) VALUES (?, ?) ON CONFLICT (k) DO UPDATE SET n = n + excluded.n', args: [KEY, pats] },
			{ sql: 'SELECT n FROM counters WHERE k = ?', args: [KEY] }
		],
		'write'
	);
	return json({ total: Number(result.rows[0][0]) });
};
