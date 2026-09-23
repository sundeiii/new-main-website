import { getSpotifyAccessToken } from '$lib/server/spotify';
import { hiddenArtistFilter } from '$lib/server/hiddenArtists';
import { recentScrobbles } from '$lib/server/lastfm';
import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import fetch from 'node-fetch';

export async function GET({ platform }: any) {
	const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';

	if (!SPOTIFY_CLIENT_ID) {
		return new Response('Missing Spotify client ID', { status: 500 });
	}

	try {
		const accessToken = await getSpotifyAccessToken({ platform });

		const api = SpotifyApi.withAccessToken(SPOTIFY_CLIENT_ID, accessToken, {
			fetch: fetch as any
		});

		const [recent, { keep }] = await Promise.all([api.player.getRecentlyPlayedTracks(50), hiddenArtistFilter()]);
		const plays: any[] = recent.items.filter(keep);

		// Spotify only remembers the last 50 plays, so hidden artists leave gaps. Fill them with
		// Last.fm scrobbles from before the oldest Spotify play (so nothing shows up twice).
		if (plays.length < 50) {
			const oldest = recent.items[recent.items.length - 1];
			const before = oldest ? new Date(oldest.played_at).getTime() : Date.now();
			// Ask for extra, since hidden artists get filtered out of the scrobbles too.
			const scrobbles = await recentScrobbles({ before, limit: 100 });
			plays.push(...scrobbles.filter(keep).slice(0, 50 - plays.length));
		}

		return new Response(JSON.stringify(plays), {
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=0, s-maxage=60'
			}
		});
	} catch (error) {
		console.error('Failed to fetch listening history:', error);
		return new Response(JSON.stringify({ error: 'Failed to fetch listening history' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}
