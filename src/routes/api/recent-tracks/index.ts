import { getSpotifyAccessToken } from '$lib/server/spotify';
import { hiddenArtistFilter } from '$lib/server/hiddenArtists';
import { SpotifyApi } from '@spotify/web-api-ts-sdk';

export async function GET({ fetch, platform }: any) {
	const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
	
	if (!SPOTIFY_CLIENT_ID) {
		return new Response('Missing Spotify client ID', { status: 500 });
	}

	try {
		const accessToken = await getSpotifyAccessToken({ fetch, platform });

		const api = SpotifyApi.withAccessToken(SPOTIFY_CLIENT_ID, accessToken);

		// Look a bit further back so a hidden artist's track doesn't leave this empty.
		const [recentlyPlayed, { keep }] = await Promise.all([api.player.getRecentlyPlayedTracks(20), hiddenArtistFilter()]);

		return new Response(JSON.stringify(recentlyPlayed.items.find(keep) ?? null), {
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=0, s-maxage=60'
			}
		});
	} catch (error) {
		console.error('Failed to fetch recently played tracks:', error);
		return new Response(JSON.stringify({ error: 'Failed to fetch recently played tracks' }), {
			status: 500,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	}
}
