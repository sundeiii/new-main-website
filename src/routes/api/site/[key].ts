import type { RequestHandler } from '@sveltejs/kit';
import { isSettingKey } from '$lib/siteSettings';
import { getSetting } from '$lib/server/settings';

// Public, read-only page content (home intro, /now, /osu, /music).
export const GET: RequestHandler = async ({ params }) => {
	if (!isSettingKey(params.key)) return new Response(JSON.stringify({ error: 'Unknown key' }), { status: 404 });
	return new Response(JSON.stringify(await getSetting(params.key)), {
		headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=300' }
	});
};
