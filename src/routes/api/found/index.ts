import type { RequestHandler } from '@sveltejs/kit';
import { db, ensureSchema, isMissingTable, sql } from '$lib/server/db';
import { hashIp, tooFast } from '$lib/server/guestbook';
import { COLLECTIBLES, collectibleById } from '$lib/collectibles';

// How many people found each passport stamp. The page sends one POST per stamp per browser.
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
	new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

export const GET: RequestHandler = async () => {
	try {
		const rows = await sql("SELECT k, n FROM counters WHERE k LIKE 'found:%'");
		const counts = Object.fromEntries(rows.map((r: any) => [String(r.k).slice(6), Number(r.n)]));
		return json({ counts }, 200, { 'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=300' });
	} catch (error) {
		if (!isMissingTable(error)) console.error('Failed to load found counts:', error);
		return json({ counts: {} });
	}
};

export const POST: RequestHandler = async ({ request, clientAddress }) => {
	const body = await request.json().catch(() => null);
	const id = typeof body?.id === 'string' ? body.id : '';
	if (!collectibleById(id)) return json({ error: 'unknown stamp' }, 400);
	// A browser finds each stamp once; this only stops scripts.
	if (tooFast('found:' + hashIp(String(clientAddress || 'unknown')), COLLECTIBLES.length + 5)) return json({ ok: false });
	await ensureSchema();
	await db.execute({ sql: 'INSERT INTO counters (k, n) VALUES (?, 1) ON CONFLICT (k) DO UPDATE SET n = n + 1', args: ['found:' + id] });
	return json({ ok: true });
};
