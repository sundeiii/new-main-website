import type { RequestHandler } from '@sveltejs/kit';
import { osuGet } from '$lib/server/osuApi';

// Top plays or recent passes for the /osu page, trimmed to what the cards show.
export const GET: RequestHandler = async ({ url }) => {
	const id = url.searchParams.get('id') ?? '';
	const type = url.searchParams.get('type') === 'recent' ? 'recent' : 'best';
	if (!/^\d{1,10}$/.test(id)) return new Response(JSON.stringify({ error: 'Invalid user id' }), { status: 400 });

	try {
		const scores: any[] = (await osuGet(`/users/${id}/scores/${type}?mode=osu&limit=${type === 'best' ? 5 : 10}`)) ?? [];
		const body = scores.map((s) => ({
			id: s.id,
			url: s.beatmap?.url ?? `https://osu.ppy.sh/b/${s.beatmap?.id}`,
			title: s.beatmapset?.title ?? '',
			artist: s.beatmapset?.artist ?? '',
			version: s.beatmap?.version ?? '',
			stars: s.beatmap?.difficulty_rating ?? null,
			cover: s.beatmapset?.covers?.['cover@2x'] ?? s.beatmapset?.covers?.cover ?? null,
			rank: s.rank,
			pp: s.pp ?? null,
			accuracy: s.accuracy,
			combo: s.max_combo,
			mods: (s.mods ?? []).map((m: any) => (typeof m === 'string' ? m : m.acronym)),
			date: s.ended_at ?? s.created_at
		}));
		return new Response(JSON.stringify(body), {
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': type === 'best' ? 'public, max-age=600, s-maxage=3600' : 'public, max-age=60, s-maxage=300'
			}
		});
	} catch (e) {
		console.error('osu scores fetch error:', e);
		return new Response(JSON.stringify([]), { status: 500, headers: { 'Content-Type': 'application/json' } });
	}
};
