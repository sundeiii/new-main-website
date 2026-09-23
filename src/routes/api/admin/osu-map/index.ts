import type { RequestHandler } from '@sveltejs/kit';
import { json, requireAdmin } from '$lib/server/adminAuth';
import { osuGet } from '$lib/server/osuApi';

// Looks up a beatmap for the osu! page editor. Accepts a difficulty link
// (…/beatmapsets/1#osu/2 or …/beatmaps/2 or …/b/2), a set link (…/beatmapsets/1 or …/s/1),
// or a bare id (tried as a difficulty id first, then as a set id).
export const GET: RequestHandler = async ({ request, url }) => {
	const denied = requireAdmin(request);
	if (denied) return denied;

	const q = (url.searchParams.get('q') || '').trim();
	const diffId = q.match(/#[a-z]+\/(\d+)/)?.[1] ?? q.match(/\/(?:beatmaps|b)\/(\d+)/)?.[1];
	const setId = q.match(/\/(?:beatmapsets|s)\/(\d+)/)?.[1];
	const bare = /^\d+$/.test(q) ? q : null;
	if (!diffId && !setId && !bare) return json({ error: 'paste a beatmap link or id' }, 400);

	try {
		let beatmap: any = null;
		let set: any = null;
		if (diffId || bare) beatmap = await osuGet(`/beatmaps/${diffId ?? bare}`);
		if (beatmap) set = beatmap.beatmapset;
		else if (setId || bare) {
			set = await osuGet(`/beatmapsets/${setId ?? bare}`);
			// A set link picks its hardest difficulty.
			beatmap = set?.beatmaps?.sort((a: any, b: any) => b.difficulty_rating - a.difficulty_rating)[0] ?? null;
		}
		if (!set) return json({ error: 'no beatmap found for that' }, 404);

		const title = `${set.artist} - ${set.title}${beatmap ? ` [${beatmap.version}]` : ''}`;
		return json({
			title,
			url: beatmap ? `https://osu.ppy.sh/beatmapsets/${set.id}#${beatmap.mode ?? 'osu'}/${beatmap.id}` : `https://osu.ppy.sh/beatmapsets/${set.id}`,
			cover: set.covers?.['card@2x'] ?? set.covers?.card ?? null,
			mapper: set.creator ?? null,
			stars: beatmap ? Math.round(beatmap.difficulty_rating * 100) / 100 : null
		});
	} catch (error) {
		console.error('osu! map lookup failed:', error);
		return json({ error: `lookup failed: ${(error as Error).message}` }, 502);
	}
};
