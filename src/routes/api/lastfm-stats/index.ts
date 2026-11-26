import type { RequestHandler } from '@sveltejs/kit';
import { PERIODS, type Period, lastfmConfigured, lastfmStats } from '$lib/server/lastfm';
import { hiddenArtistFilter } from '$lib/server/hiddenArtists';
import { loadCached, saveCached } from '$lib/server/apiCache';

// Scrobble counts and top artists/tracks for /music: ?period=7day|1month|12month|overall
// While Last.fm is down, the last stats that loaded are served instead, with staleSince set.
export const GET: RequestHandler = async ({ url }) => {
	if (!lastfmConfigured()) return new Response(JSON.stringify({ error: 'Last.fm is not set up' }), { status: 503 });
	const period = (url.searchParams.get('period') || '7day') as Period;
	if (!PERIODS.includes(period)) return new Response(JSON.stringify({ error: 'unknown period' }), { status: 400 });

	const key = `lastfm-stats:${period}`;
	try {
		const { isHiddenName } = await hiddenArtistFilter();
		const stats = await lastfmStats(period, isHiddenName);
		await saveCached(key, stats);
		return new Response(JSON.stringify(stats), {
			headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=3600' }
		});
	} catch (error) {
		console.error('Last.fm stats failed:', error);
		const cached = await loadCached<object>(key);
		if (cached) {
			return new Response(JSON.stringify({ ...cached.value, staleSince: cached.updatedAt }), {
				headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=0, s-maxage=120' }
			});
		}
		return new Response(JSON.stringify({ error: 'Last.fm is not responding right now' }), { status: 502 });
	}
};
