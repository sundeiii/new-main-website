import type { RequestHandler } from '@sveltejs/kit';
import { findOsuMaps } from '$lib/server/osuMaps';

// POST { songs: [{ artist, title }] } (up to 30) → { maps: [OsuMap | null] }, for the osu! pills on /music.
export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const songs = Array.isArray(body?.songs) ? body.songs : null;
	const valid = (s: any) =>
		typeof s?.artist === 'string' && typeof s?.title === 'string' && s.artist.length <= 200 && s.title.length <= 300 && s.title.trim() !== '';
	if (!songs || !songs.length || songs.length > 30 || !songs.every(valid)) {
		return new Response(JSON.stringify({ error: 'send 1 to 30 songs as { artist, title }' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
	}
	const maps = await findOsuMaps(songs).catch((error) => {
		console.error('osu! maps failed:', error);
		return songs.map(() => null);
	});
	return new Response(JSON.stringify({ maps }), { headers: { 'Content-Type': 'application/json' } });
};
