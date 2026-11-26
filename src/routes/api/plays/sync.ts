import type { RequestHandler } from '@sveltejs/kit';
import { syncPlays } from '$lib/server/plays';

// Copies Spotify's recent plays into the play log. Called every hour by GitHub Actions; safe to
// call by anyone, since it only ever adds plays and asks Spotify at most once a minute.
export const GET: RequestHandler = async ({ platform }) => {
	try {
		return new Response(JSON.stringify(await syncPlays(platform)), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
	} catch (error) {
		console.error('Play sync failed:', error);
		return new Response(JSON.stringify({ error: 'Sync failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
	}
};
