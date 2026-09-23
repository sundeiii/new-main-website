// osu! API v2 with a cached client-credentials token (OSU_CLIENT_ID / OSU_CLIENT_SECRET).

let cachedToken: { token: string; expires: number } | null = null;

export async function getOsuToken(): Promise<string> {
	if (cachedToken && Date.now() < cachedToken.expires) return cachedToken.token;
	const res = await fetch('https://osu.ppy.sh/oauth/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			client_id: Number(process.env.OSU_CLIENT_ID), // must be a number, not a string
			client_secret: process.env.OSU_CLIENT_SECRET,
			grant_type: 'client_credentials',
			scope: 'public'
		})
	});
	const data = await res.json();
	if (!data.access_token) {
		console.error('osu! token error:', JSON.stringify(data));
		throw new Error('Failed to get osu! token');
	}
	cachedToken = { token: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 };
	return cachedToken.token;
}

/** GET an osu! API v2 path; returns null on 404. */
export async function osuGet(path: string) {
	const res = await fetch(`https://osu.ppy.sh/api/v2${path}`, {
		headers: { Authorization: `Bearer ${await getOsuToken()}`, Accept: 'application/json' }
	});
	if (res.status === 404) return null;
	if (!res.ok) throw new Error(`osu! API responded ${res.status}`);
	return res.json();
}
