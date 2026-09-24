import { getOsuToken as getToken } from '$lib/server/osuApi';

export async function GET({ url }: any) {
	const username = url.searchParams.get('u');
	if (!username) return new Response(JSON.stringify(null), { status: 400 });

	try {
		const token = await getToken();
		const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };

		const userRes = await fetch(
			`https://osu.ppy.sh/api/v2/users/${encodeURIComponent(username)}/osu?key=username`,
			{ headers }
		);

		if (!userRes.ok) return new Response(JSON.stringify(null), { headers: { 'Content-Type': 'application/json' } });

		const user = await userRes.json();


		// Team — may be embedded in user object directly
		let team: { id: number; name: string; short_name: string | null; flag_url: string | null } | null = null;
		if (user.team) {
			const t = user.team;
			team = {
				id: t.id,
				name: t.name,
				short_name: t.short_name ?? t.tag ?? null,
				flag_url: t.flag_url ?? t.header_url ?? t.logo_url
					?? (t.id ? `https://assets.ppy.sh/teams/flags/${t.id}.png` : null)
			};
		}

		return new Response(JSON.stringify({
			id: user.id,
			username: user.username,
			avatar_url: user.avatar_url,
			cover_url: user.cover_url,
			country_code: user.country_code,
			global_rank: user.statistics?.global_rank,
			country_rank: user.statistics?.country_rank,
			pp: user.statistics?.pp,
			// Global rank for each of the last 90 days, oldest first (0 = unranked that day).
			rank_history: user.rank_history?.data ?? user.rankHistory?.data ?? [],
			is_online: user.is_online,
			// use support_level > 0 as the supporter check since is_supporter can be unreliable
			support_level: user.support_level ?? 0,
			groups: user.groups?.map((g: any) => ({
				name: g.short_name,
				colour: g.colour
			})) ?? [],
			team
		}), {
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=60, s-maxage=300'
			}
		});
	} catch (e) {
		console.error('osu user fetch error:', e);
		return new Response(JSON.stringify(null), { status: 500 });
	}
}