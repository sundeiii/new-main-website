import type { RequestHandler } from '@sveltejs/kit';
import { isMissingTable } from '$lib/server/db';
import { listChangelog } from '$lib/server/changelog';

export const GET: RequestHandler = async () => {
	let entries: unknown[] = [];
	try {
		entries = await listChangelog({ createTable: false });
	} catch (error: any) {
		if (!isMissingTable(error)) console.error('Failed to load changelog:', error);
	}
	return new Response(JSON.stringify(entries), {
		headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=600' }
	});
};
