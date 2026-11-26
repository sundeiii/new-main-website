import type { RequestHandler } from '@sveltejs/kit';
import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { PERIODS, type Period, lastfmConfigured, lastfmStats } from '$lib/server/lastfm';
import { hiddenArtistFilter } from '$lib/server/hiddenArtists';
import { loadCached, saveCached } from '$lib/server/apiCache';
import { getSpotifyAccessToken } from '$lib/server/spotify';
import { playStats, syncPlays } from '$lib/server/plays';

// Stats for /music: ?period=7day|1month|12month|overall. Last.fm first (scrobble counts and
// top lists). If it's down, or the key stops working (Last.fm needs Pro for API keys from
// December 2026), the site's own play log is used once it covers the period (source: 'log'),
// then Spotify's top artists/tracks (source: 'spotify', no counts). If all of that fails, the
// last Last.fm stats that loaded are served with staleSince set.

// Spotify only has three ranges: about 4 weeks, 6 months and a year.
const spotifyRange = { '7day': 'short_term', '1month': 'short_term', '12month': 'medium_term', overall: 'long_term' } as const;
const spotifySpan = { short_term: 'the last ~4 weeks', medium_term: 'the last ~6 months', long_term: 'about the last year' };

const json = (body: unknown, init: ResponseInit = {}) =>
	new Response(JSON.stringify(body), { ...init, headers: { 'Content-Type': 'application/json', ...init.headers } });

async function spotifyStats(period: Period, platform: unknown, isHidden: (track: any) => boolean, isHiddenName: (name: string) => boolean) {
	const range = spotifyRange[period];
	const api = SpotifyApi.withAccessToken(process.env.SPOTIFY_CLIENT_ID || '', await getSpotifyAccessToken({ platform }));
	const [artists, tracks] = await Promise.all([api.currentUser.topItems('artists', range, 20), api.currentUser.topItems('tracks', range, 30)]);
	return {
		source: 'spotify' as const,
		span: spotifySpan[range],
		topArtists: artists.items
			.filter((a) => !isHiddenName(a.name))
			.slice(0, 8)
			.map((a) => ({ name: a.name, url: a.external_urls.spotify })),
		topTracks: tracks.items
			.filter((t) => !isHidden(t))
			.slice(0, 10)
			.map((t) => ({ name: t.name, artist: t.artists.map((a) => a.name).join(', '), url: t.external_urls.spotify }))
	};
}

export const GET: RequestHandler = async ({ url, platform }) => {
	const period = (url.searchParams.get('period') || '7day') as Period;
	if (!PERIODS.includes(period)) return json({ error: 'unknown period' }, { status: 400 });

	const key = `lastfm-stats:${period}`;
	const { isHidden, isHiddenName } = await hiddenArtistFilter();

	if (lastfmConfigured()) {
		try {
			const stats = { source: 'lastfm', ...(await lastfmStats(period, isHiddenName)) };
			await saveCached(key, stats);
			return json(stats, { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=3600' } });
		} catch (error) {
			console.error('Last.fm stats failed, trying Spotify:', error);
		}
	}

	await syncPlays(platform).catch((error) => console.error('Play sync failed:', error));
	const logged = await playStats(period, isHiddenName);
	if (logged) return json(logged, { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=3600' } });

	try {
		return json(await spotifyStats(period, platform, isHidden, isHiddenName), {
			headers: { 'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600' }
		});
	} catch (error) {
		console.error('Spotify stats failed too:', error);
	}

	const cached = await loadCached<object>(key);
	if (cached) return json({ ...cached.value, staleSince: cached.updatedAt }, { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=120' } });
	return json({ error: 'Neither last.fm nor Spotify is responding right now' }, { status: 502 });
};
