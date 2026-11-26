import type { RequestHandler } from '@sveltejs/kit';
import { isMissingTable } from '$lib/server/db';
import { hiddenArtistFilter } from '$lib/server/hiddenArtists';
import { playInsights } from '$lib/server/plays';

// From the play log: today's "on repeat" song (home page), and the listening clock and
// monthly recaps (/music).
export const GET: RequestHandler = async () => {
	try {
		const { isHiddenName } = await hiddenArtistFilter();
		return new Response(JSON.stringify(await playInsights(isHiddenName)), {
			headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=1800' }
		});
	} catch (error: any) {
		if (!isMissingTable(error)) console.error('Play insights failed:', error);
		return new Response(JSON.stringify({ repeat: null, clock: [], clockPlays: 0, recaps: [] }), { headers: { 'Content-Type': 'application/json' } });
	}
};
