import { getSetting } from '$lib/server/settings';

/**
 * Returns a filter that drops tracks by any artist in /admin → pages → music → hidden artists
 * (case-insensitive). Works on Spotify track objects and on items that wrap one in `.track`.
 */
export async function hiddenArtistFilter() {
	const hidden = new Set((await getSetting('music')).hiddenArtists.map((a) => a.trim().toLowerCase()).filter(Boolean));
	const isHidden = (track: any) => (track?.artists ?? []).some((a: any) => hidden.has(String(a?.name ?? '').trim().toLowerCase()));
	return {
		isHidden,
		keep: <T>(item: T) => !isHidden((item as any)?.track ?? item)
	};
}
