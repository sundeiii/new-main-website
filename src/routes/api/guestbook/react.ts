import type { RequestHandler } from '@sveltejs/kit';
import { sql } from '$lib/server/db';
import { hashIp, tooFast, toggleReaction } from '$lib/server/guestbook';
import { reactionById } from '$lib/stamps';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// Toggles one reaction on one guestbook entry for this visitor.
export const POST: RequestHandler = async ({ request, clientAddress }) => {
	const body = await request.json().catch(() => null);
	const id = typeof body?.id === 'string' ? body.id.slice(0, 64) : '';
	const reaction = reactionById(body?.reaction)?.id;
	if (!id || !reaction) return json({ error: 'Bad reaction' }, 400);

	const ipHash = hashIp(String(clientAddress || 'unknown'));
	if (tooFast(ipHash)) return json({ error: 'Slow down a little' }, 429);
	try {
		const [entry] = await sql('SELECT id FROM guestbook WHERE id = ?', [id]);
		if (!entry) return json({ error: 'No such entry' }, 404);
		return json(await toggleReaction(id, reaction, ipHash));
	} catch (error) {
		console.error('Failed to react:', error);
		return json({ error: 'Could not react' }, 500);
	}
};
