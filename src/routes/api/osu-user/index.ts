let cachedToken: { token: string; expires: number } | null = null;

async function getToken(): Promise<string> {
	if (cachedToken && Date.now() < cachedToken.expires) return cachedToken.token;
	const res = await fetch('https://osu.ppy.sh/oauth/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			client_id: Number(process.env.OSU_CLIENT_ID),
			client_secret: process.env.OSU_CLIENT_SECRET,
			grant_type: 'client_credentials',
			scope: 'public'
		})
	});
	const data = await res.json();
	if (!data.access_token) throw new Error('Failed to get osu! token');
	cachedToken = { token: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 };
	return cachedToken.token;
}

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