import type { RequestHandler } from '@sveltejs/kit';
import { tournamentSeed } from '$lib/tournamentSeed';
import { groupByYear, listTournaments } from '$lib/server/tournaments';

// Public list for the tournaments page. Until the list has been imported into the database
// (or if the database is unreachable), serve the old hardcoded list so the page never breaks.
export const GET: RequestHandler = async () => {
	let groups = tournamentSeed;
	try {
		const list = await listTournaments({ createTable: false });
		if (list.length) groups = groupByYear(list);
	} catch (error) {
		console.error('Failed to load tournaments, using built-in list:', error);
	}
	return new Response(JSON.stringify(groups), {
		headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=600' }
	});
};
