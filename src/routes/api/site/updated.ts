import type { RequestHandler } from '@sveltejs/kit';
import { isSettingKey } from '$lib/siteSettings';
import { settingsUpdated } from '$lib/server/settings';

// When pages' content was last saved: /api/site/updated?keys=now,about → { now: "2026-…", about: … }
export const GET: RequestHandler = async ({ url }) => {
	const keys = (url.searchParams.get('keys') ?? '').split(',').filter(isSettingKey).slice(0, 10);
	return new Response(JSON.stringify(await settingsUpdated(keys)), {
		headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=300' }
	});
};
