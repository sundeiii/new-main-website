import type { RequestHandler } from '@sveltejs/kit';
import { json, requireAdmin } from '$lib/server/adminAuth';
import { osuGet } from '$lib/server/osuApi';

// Finds an osu! player for the tournament host editor. Accepts a profile link
// (…/users/123 or …/u/123), a user id, or a username. A number is tried as an id first,
// then as a username (some players have numeric names).
export const GET: RequestHandler = async ({ request, url }) => {
	const denied = requireAdmin(request);
	if (denied) return denied;

	const q = (url.searchParams.get('q') || '').trim();
	if (!q || q.length > 100) return json({ error: 'type a username, id or profile link' }, 400);

	const idFromLink = q.match(/osu\.ppy\.sh\/(?:users|u)\/([^/?#\s]+)/i)?.[1];
	const query = decodeURIComponent(idFromLink ?? q);

	try {
		let user = null;
		if (/^\d+$/.test(query)) user = await osuGet(`/users/${query}?key=id`);
		user ??= await osuGet(`/users/${encodeURIComponent(query)}?key=username`);
		if (!user) return json({ error: `no osu! player called "${query}"` }, 404);

		return json({ id: user.id, name: user.username, avatar: user.avatar_url ?? null, country: user.country_code ?? null });
	} catch (error) {
		console.error('osu! player lookup failed:', error);
		return json({ error: `lookup failed: ${(error as Error).message}` }, 502);
	}
};
