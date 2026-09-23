import { getSpotifyAccessToken } from '$lib/server/spotify';
import { hiddenArtistFilter } from '$lib/server/hiddenArtists';
import type { SpotifyTimeRange } from '$lib/types';
import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import fetch from 'node-fetch';

export async function GET({ fetch: svelteKitFetch, platform, url }: any) {
	const range = url.searchParams.get('time_range') ?? '';

	if (!['short_term', 'medium_term', 'long_term'].includes(range)) {
		return new Response('Invalid time_range', { status: 400 });
	}

	const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
	
	if (!SPOTIFY_CLIENT_ID) {
		return new Response('Missing Spotify client ID', { status: 500 });
	}

	try {
		const accessToken = await getSpotifyAccessToken({ platform });

		const api = SpotifyApi.withAccessToken(SPOTIFY_CLIENT_ID, accessToken, {
			fetch: fetch as any
		});

		// Hidden artists can take up a lot of the top 50, so keep paging further down the list
		// until there are 50 tracks to show (or Spotify runs out).
		const { keep } = await hiddenArtistFilter();
		const tracks: any[] = [];
		for (let offset = 0; offset < 200 && tracks.length < 50; offset += 50) {
			const page = await api.currentUser.topItems('tracks', range as SpotifyTimeRange, 50, offset);
			tracks.push(...page.items.filter(keep));
			if (page.items.length < 50) break;
		}

		return new Response(JSON.stringify(tracks.slice(0, 50)), {
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=0, s-maxage=300'
			}
		});
	} catch (error) {
		console.error('Failed to fetch top tracks:', error);
		return new Response(JSON.stringify({ error: 'Failed to fetch top tracks' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}