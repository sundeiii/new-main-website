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
