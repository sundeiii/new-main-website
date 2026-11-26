import type { RequestHandler } from '@sveltejs/kit';
import { hiddenArtistFilter } from '$lib/server/hiddenArtists';
import { searchPlays } from '$lib/server/plays';

// Song search on /music: ?q= matches song titles and artists in the play log.
export const GET: RequestHandler = async ({ url }) => {
	const q = (url.searchParams.get('q') ?? '').trim().slice(0, 100);
	const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=3600' };
	if (q.length < 2) return new Response(JSON.stringify({ artists: [], tracks: [] }), { headers });
	try {
		const { isHiddenName } = await hiddenArtistFilter();
		return new Response(JSON.stringify(await searchPlays(q, isHiddenName)), { headers });
	} catch (error) {
		console.error('Play search failed:', error);
		return new Response(JSON.stringify({ error: 'search failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
	}
};
