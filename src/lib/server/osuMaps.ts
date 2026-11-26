import { db, placeholders, sql } from '$lib/server/db';
import { osuGet } from '$lib/server/osuApi';

// Finds an osu! beatmap for a song (the "osu!" pills on /music). Results, "no map" included,
// are kept in api_cache, so each song is searched about once a month (once a week for misses).

export interface OsuMap {
	id: number;
	url: string;
	artist: string;
	title: string;
	mapper: string;
	status: string;
	plays: number;
}

const FOUND_FOR = 30 * 864e5;
const MISSING_FOR = 7 * 864e5;
// Ranked/loved maps first, then the most played.
const STATUS_ORDER = ['ranked', 'approved', 'loved', 'qualified'];

// "Song - Remastered 2011", "Song (feat. X)", "Song [TV Size]" → "Song".
function cleanTitle(title: string) {
	const clean = title
		.replace(/\s+-\s+.*$/, '')
		.replace(/\s*[([（【][^)\]）】]*[)\]）】]/g, '')
		.trim();
	return clean || title.trim();
}
const cleanArtist = (artist: string) => artist.split(', ')[0].trim();
const keyOf = (artist: string, title: string) => `osu-map:${cleanArtist(artist).toLowerCase()}|${cleanTitle(title).toLowerCase()}`;

async function search(artist: string, title: string): Promise<OsuMap | null> {
	const strip = (s: string) => s.replace(/"/g, '');
	const q = `artist="${strip(cleanArtist(artist))}" title="${strip(cleanTitle(title))}"`;
	const data = await osuGet(`/beatmapsets/search?s=any&q=${encodeURIComponent(q)}`);
	const sets: any[] = data?.beatmapsets ?? [];
	const rank = (s: any) => (STATUS_ORDER.includes(s.status) ? STATUS_ORDER.indexOf(s.status) : STATUS_ORDER.length);
	const best = sets.sort((a, b) => rank(a) - rank(b) || b.play_count - a.play_count)[0];
	if (!best) return null;
	return {
		id: best.id,
		url: `https://osu.ppy.sh/beatmapsets/${best.id}`,
		artist: best.artist,
		title: best.title,
		mapper: best.creator,
		status: best.status,
		plays: best.play_count
	};
}

/** One result per song, in order: its map, or null when osu! has none (or the lookup failed). */
export async function findOsuMaps(songs: { artist: string; title: string }[]): Promise<(OsuMap | null)[]> {
	const keys = songs.map((s) => keyOf(s.artist, s.title));
	const unique = [...new Set(keys)];
	const known = new Map<string, OsuMap | null>();
	const rows = await sql(`SELECT k, v, updated_at FROM api_cache WHERE k IN (${placeholders(unique.length)})`, unique).catch(() => []);
	for (const row of rows) {
		const value = JSON.parse(row.v) as OsuMap | null;
		if (Date.now() - Date.parse(row.updated_at) < (value ? FOUND_FOR : MISSING_FOR)) known.set(row.k, value);
	}

	const looked = await Promise.all(
		unique
			.filter((k) => !known.has(k))
			.map(async (k) => {
				const song = songs[keys.indexOf(k)];
				try {
					return { k, map: await search(song.artist, song.title), ok: true };
				} catch (error) {
					console.error('osu! map search failed:', error);
					return { k, map: null, ok: false };
				}
			})
	);
	const now = new Date().toISOString();
	const saves = looked
		.filter((l) => l.ok)
		.map((l) => ({
			sql: 'INSERT INTO api_cache (k, v, updated_at) VALUES (?, ?, ?) ON CONFLICT (k) DO UPDATE SET v = excluded.v, updated_at = excluded.updated_at',
			args: [l.k, JSON.stringify(l.map), now]
		}));
	if (saves.length) await db.batch(saves, 'write').catch((error) => console.error('Failed to cache osu! maps:', error));
	for (const l of looked) known.set(l.k, l.map);
	return keys.map((k) => known.get(k) ?? null);
}
