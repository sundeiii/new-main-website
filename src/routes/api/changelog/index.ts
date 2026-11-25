import type { RequestHandler } from '@sveltejs/kit';
import { isMissingTable } from '$lib/server/db';
import { listChangelog } from '$lib/server/changelog';
import commits from '$lib/commits.json';

// Hand-written notes from the admin panel plus the site's commits (scripts/generate-changelog.cjs),
// newest first.
export const GET: RequestHandler = async () => {
	let notes: { id?: number; date: string; text: string }[] = [];
	try {
		notes = await listChangelog({ createTable: false });
	} catch (error: any) {
		if (!isMissingTable(error)) console.error('Failed to load changelog:', error);
	}
	const entries = [
		...notes.map((n) => ({ key: `note-${n.id}`, date: n.date, text: n.text })),
		...commits.map((c) => ({ key: c.sha, date: c.date, text: c.text, sha: c.sha.slice(0, 7) }))
	].sort((a, b) => b.date.localeCompare(a.date));
	return new Response(JSON.stringify(entries), {
		headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=600' }
	});
};
