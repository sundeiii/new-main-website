import type { RequestHandler } from '@sveltejs/kit';
import { addView, countable, hitStats } from '$lib/server/hits';

const json = (body: unknown, init: ResponseInit = {}) =>
	new Response(JSON.stringify(body), { ...init, headers: { 'Content-Type': 'application/json', ...init.headers } });

// Totals, the last 30 days and the most viewed pages, for the footer and /stats.
export const GET: RequestHandler = async () =>
	json(await hitStats(), { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=300' } });

// The layout sends one of these per page a visitor opens (once per tab), so bots that don't run
// JavaScript aren't counted.
export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	if (!countable(body?.path)) return json({ error: 'Bad path' }, { status: 400 });
	try {
		return json({ total: await addView(body.path) });
	} catch (error) {
		console.error('Failed to count view:', error);
		return json({ error: 'Could not count' }, { status: 500 });
	}
};
