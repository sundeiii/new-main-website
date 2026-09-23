import { getSpotifyAccessToken } from '$lib/server/spotify';
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

		const recentlyPlayed = await api.player.getRecentlyPlayedTracks(50);

		return new Response(JSON.stringify(recentlyPlayed.items), {
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
