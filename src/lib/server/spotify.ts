import type { AccessToken } from '@spotify/web-api-ts-sdk';
export const TEST = 'test';

type AccessTokenResponse = {
	access_token: string;
	token_type: string;
	expires_in: number;
	scope: string;
};

const mockKV = (() => {
	const kv: Record<string, string | undefined> = {};

	return () => ({
		async get(key: string) {
			return kv[key];
		},
		async put(key: string, value: string) {
			kv[key] = value;
		}
	});
})();

function makeKV(platform: any) {
	if (!platform?.env?.SPOTIFY_KV) {
		return mockKV();
	}

	return platform.env?.SPOTIFY_KV;
}

export async function getSpotifyAccessToken({
	platform
}: {
	fetch?: typeof globalThis.fetch;
	platform: any;
}) {
	const kv = makeKV(platform);

	// Get credentials from environment variables
	const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
	const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';
	const SPOTIFY_REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN || '';

	if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_REFRESH_TOKEN) {
		throw new Error('Missing Spotify credentials in environment variables');
	}

	let accessTokenRaw = await kv.get('accessToken');
	let accessToken: AccessToken;

	const expirationTime = Number(await kv.get('expirationTime')) || 0;

	if (!accessTokenRaw || Date.now() > expirationTime) {
		const response: AccessTokenResponse = await fetch(
			'https://accounts.spotify.com/api/token',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					Authorization: `Basic ${Buffer.from(
						`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
					).toString('base64')}`
				},
				body: new URLSearchParams({
					grant_type: 'refresh_token',
					refresh_token: SPOTIFY_REFRESH_TOKEN
				}).toString()
			}
		).then((res) => res.json() as Promise<AccessTokenResponse>);

		await kv.put('accessToken', JSON.stringify(response));
		await kv.put(
			'expirationTime',
			`${Date.now() + response.expires_in * 1000}`
		);

		accessToken = {
			...response,
			refresh_token: SPOTIFY_REFRESH_TOKEN
		};
	} else {
		accessToken = JSON.parse(accessTokenRaw);

		accessToken.expires_in = (expirationTime - Date.now()) / 1000;
		accessToken.refresh_token = SPOTIFY_REFRESH_TOKEN;
	}

	return accessToken;
}