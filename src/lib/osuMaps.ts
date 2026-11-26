import { writable } from 'svelte/store';

// osu! maps for songs on /music, looked up in batches through /api/osu-maps and kept for the
// visit. <OsuPill> reads from here; call lookupOsuMaps() with a list once it has loaded.

export interface OsuMapInfo {
	id: number;
	url: string;
	artist: string;
	title: string;
	mapper: string;
	status: string;
	plays: number;
}

export const osuMaps = writable<Record<string, OsuMapInfo | null>>({});
export const osuKey = (artist: string, title: string) => `${artist}|${title}`.toLowerCase();

const asked = new Set<string>();

export function lookupOsuMaps(songs: { artist: string; title: string }[]) {
	const fresh = songs.filter((s) => s.artist && s.title && !asked.has(osuKey(s.artist, s.title)));
	fresh.forEach((s) => asked.add(osuKey(s.artist, s.title)));
	for (let i = 0; i < fresh.length; i += 30) {
		const batch = fresh.slice(i, i + 30);
		fetch('/api/osu-maps', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ songs: batch }) })
			.then((res) => (res.ok ? res.json() : null))
			.then((d) => {
				if (!d?.maps) return;
				osuMaps.update((known) => {
					batch.forEach((s, j) => (known[osuKey(s.artist, s.title)] = d.maps[j] ?? null));
					return known;
				});
			})
			.catch(() => {});
	}
}
