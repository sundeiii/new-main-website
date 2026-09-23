import { getSpotifyAccessToken } from '$lib/server/spotify';
import { SpotifyApi } from '@spotify/web-api-ts-sdk';

export async function GET({ fetch, platform }: any) {
	const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
	
	if (!SPOTIFY_CLIENT_ID) {
		return new Response('Missing Spotify client ID', { status: 500 });
	}

	try {
		const accessToken = await getSpotifyAccessToken({ fetch, platform });

		const api = SpotifyApi.withAccessToken(SPOTIFY_CLIENT_ID, accessToken);

		const recentlyPlayed = await api.player.getRecentlyPlayedTracks(1);
		
		return new Response(JSON.stringify(recentlyPlayed.items[0]), {
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
