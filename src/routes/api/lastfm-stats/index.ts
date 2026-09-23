import type { RequestHandler } from '@sveltejs/kit';
import { PERIODS, type Period, lastfmConfigured, lastfmStats } from '$lib/server/lastfm';
import { hiddenArtistFilter } from '$lib/server/hiddenArtists';

// Scrobble counts and top artists/tracks for /music: ?period=7day|1month|12month|overall
export const GET: RequestHandler = async ({ url }) => {
	if (!lastfmConfigured()) return new Response(JSON.stringify({ error: 'Last.fm is not set up' }), { status: 503 });
	const period = (url.searchParams.get('period') || '7day') as Period;
	if (!PERIODS.includes(period)) return new Response(JSON.stringify({ error: 'unknown period' }), { status: 400 });

	try {
		const { isHiddenName } = await hiddenArtistFilter();
		return new Response(JSON.stringify(await lastfmStats(period, isHiddenName)), {
			headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=3600' }
		});
	} catch (error) {
		console.error('Last.fm stats failed:', error);
		return new Response(JSON.stringify({ error: 'Failed to load Last.fm stats' }), { status: 502 });
	}
};
