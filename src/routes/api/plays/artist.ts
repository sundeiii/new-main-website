import type { RequestHandler } from '@sveltejs/kit';
import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { hiddenArtistFilter } from '$lib/server/hiddenArtists';
import { artistStats } from '$lib/server/plays';
import { getSpotifyAccessToken } from '$lib/server/spotify';

// One artist from the play log (?name=), for /music/artist/[name]. 404 for unknown or hidden artists.
export const GET: RequestHandler = async ({ url, platform }) => {
	const name = (url.searchParams.get('name') ?? '').trim();
	const json = (body: unknown, status = 200) =>
		new Response(JSON.stringify(body), {
			status,
			headers: { 'Content-Type': 'application/json', ...(status === 200 ? { 'Cache-Control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=3600' } : {}) }
		});
	if (!name || name.length > 200) return json({ error: 'no artist' }, 400);
	try {
		const { isHiddenName } = await hiddenArtistFilter();
		const stats = await artistStats(name, isHiddenName);
		if (!stats) return json({ error: 'never played' }, 404);
		// Their photo from Spotify when we know their id; the page falls back to one of their covers.
		let photo: string | null = null;
		if (stats.artistId) {
			try {
				const api = SpotifyApi.withAccessToken(process.env.SPOTIFY_CLIENT_ID || '', await getSpotifyAccessToken({ platform }));
				photo = (await api.artists.get(stats.artistId)).images?.[0]?.url ?? null;
			} catch (error) {
				console.error('Spotify artist lookup failed:', error);
			}
		}
		return json({ ...stats, photo, spotify: stats.artistId ? `https://open.spotify.com/artist/${stats.artistId}` : null });
	} catch (error) {
		console.error('Artist stats failed:', error);
		return json({ error: 'failed' }, 500);
	}
};
