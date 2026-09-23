// Last.fm scrobbles, used to fill the listening history when Spotify's last-50-plays window runs
// short (e.g. after hidden artists are filtered out). Needs LASTFM_API_KEY and LASTFM_USER.

export const lastfmConfigured = () => !!(process.env.LASTFM_API_KEY && process.env.LASTFM_USER);

/** A scrobble shaped like a Spotify "recently played" item, so the music page can show it as-is. */
export interface HistoryItem {
	played_at: string;
	source: 'lastfm';
	track: {
		name: string;
		artists: { name: string }[];
		album: { name: string; images: { url: string }[] };
		external_urls: { spotify: string };
	};
}

// Last.fm returns this placeholder when it has no cover art.
const NO_IMAGE = '2a96cbd8b46e442fc41c2b86b821562f';

/**
 * Scrobbles played before `before` (ms), newest first, up to `limit`. Skips the "now playing"
 * entry, which has no timestamp. Returns [] if Last.fm isn't configured or can't be reached.
 */
export async function recentScrobbles({ before, limit }: { before: number; limit: number }): Promise<HistoryItem[]> {
	if (!lastfmConfigured() || limit <= 0) return [];
	const params = new URLSearchParams({
		method: 'user.getrecenttracks',
		user: process.env.LASTFM_USER!,
		api_key: process.env.LASTFM_API_KEY!,
		format: 'json',
		limit: String(Math.min(200, limit)),
		to: String(Math.floor(before / 1000) - 1)
	});
	try {
		const res = await fetch(`https://ws.audioscrobbler.com/2.0/?${params}`);
		if (!res.ok) throw new Error(`Last.fm responded ${res.status}`);
		const data = await res.json();
		if (data.error) throw new Error(`Last.fm: ${data.message}`);
		const tracks: any[] = [].concat(data.recenttracks?.track ?? []);
		return tracks
			.filter((t) => t.date?.uts && t['@attr']?.nowplaying !== 'true')
			.map((t) => {
				const image = [...(t.image ?? [])].reverse().find((i: any) => i['#text'] && !i['#text'].includes(NO_IMAGE))?.['#text'];
				return {
					played_at: new Date(Number(t.date.uts) * 1000).toISOString(),
					source: 'lastfm' as const,
					track: {
						name: t.name,
						artists: [{ name: t.artist?.['#text'] ?? t.artist?.name ?? '' }],
						album: { name: t.album?.['#text'] ?? '', images: image ? [{ url: image }] : [] },
						external_urls: { spotify: t.url }
					}
				};
			});
	} catch (error) {
		console.error('Last.fm backfill failed:', error);
		return [];
	}
}

// ── Stats for /music ─────────────────────────────────────────────────────────

export const PERIODS = ['7day', '1month', '12month', 'overall'] as const;
export type Period = typeof PERIODS[number];

async function lastfm(method: string, extra: Record<string, string> = {}) {
	const params = new URLSearchParams({ method, user: process.env.LASTFM_USER!, api_key: process.env.LASTFM_API_KEY!, format: 'json', ...extra });
	const res = await fetch(`https://ws.audioscrobbler.com/2.0/?${params}`);
	const data = await res.json();
	if (!res.ok || data.error) throw new Error(`Last.fm: ${data.message ?? res.status}`);
	return data;
}

/** Number of scrobbles since `fromMs` (Last.fm reports the total without sending them all). */
async function scrobblesSince(fromMs: number) {
	const data = await lastfm('user.getrecenttracks', { from: String(Math.floor(fromMs / 1000)), limit: '1' });
	return Number(data.recenttracks?.['@attr']?.total ?? 0);
}

export async function lastfmStats(period: Period, isHidden: (artist: string) => boolean) {
	const now = Date.now();
	const [info, day, week, artists, tracks] = await Promise.all([
		lastfm('user.getinfo'),
		scrobblesSince(now - 864e5),
		scrobblesSince(now - 7 * 864e5),
		lastfm('user.gettopartists', { period, limit: '20' }),
		lastfm('user.gettoptracks', { period, limit: '25' })
	]);
	return {
		user: info.user?.name,
		url: info.user?.url,
		total: Number(info.user?.playcount ?? 0),
		since: Number(info.user?.registered?.unixtime ?? 0) * 1000,
		last24h: day,
		last7d: week,
		topArtists: [].concat(artists.topartists?.artist ?? [])
			.filter((a: any) => !isHidden(a.name))
			.slice(0, 8)
			.map((a: any) => ({ name: a.name, plays: Number(a.playcount), url: a.url })),
		topTracks: [].concat(tracks.toptracks?.track ?? [])
			.filter((t: any) => !isHidden(t.artist?.name ?? ''))
			.slice(0, 10)
			.map((t: any) => ({ name: t.name, artist: t.artist?.name ?? '', plays: Number(t.playcount), url: t.url }))
	};
}
