import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { db, ensureSchema, isMissingTable, sql } from '$lib/server/db';
import { loadCached, saveCached } from '$lib/server/apiCache';
import { getSpotifyAccessToken } from '$lib/server/spotify';

// A play log of my own: Spotify only remembers the last 50 plays, so /api/plays/sync copies them
// into the plays table (GitHub Actions calls it every hour, see .github/workflows/sync-plays.yml).
// Plays are keyed by their timestamp, so syncing the same ones again changes nothing.
// From that log, /music can show play counts and top lists without last.fm.
// Older history comes from last.fm (scripts/import-lastfm.cjs); those rows have track_id 'lastfm:…'.

const MIN_GAP = 60_000; // don't ask Spotify more than once a minute, however often sync is called

export async function syncPlays(platform: unknown) {
	const last = await loadCached<number>('plays-sync');
	if (last && Date.now() - last.value < MIN_GAP) return { added: 0, skipped: true };
	await saveCached('plays-sync', Date.now());

	await ensureSchema();
	const api = SpotifyApi.withAccessToken(process.env.SPOTIFY_CLIENT_ID || '', await getSpotifyAccessToken({ platform }));
	const recent = await api.player.getRecentlyPlayedTracks(50);
	const inserts = recent.items
		.filter((item) => item.track?.id)
		.map(({ played_at, track }) => ({
			sql: `INSERT INTO plays (played_at, track_id, track, artist, artist_id, artists, album, image, duration_ms)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (played_at) DO NOTHING`,
			args: [
				new Date(played_at).toISOString(),
				track.id,
				track.name,
				track.artists[0]?.name ?? '',
				track.artists[0]?.id ?? null,
				track.artists.map((a) => a.name).join(', '),
				track.album?.name ?? null,
				track.album?.images?.[0]?.url ?? null,
				track.duration_ms ?? null
			]
		}));
	if (!inserts.length) return { added: 0 };
	const results = await db.batch(inserts, 'write');
	return { added: results.reduce((n, r) => n + r.rowsAffected, 0) };
}

const DAY = 864e5;
const periodDays = { '7day': 7, '1month': 30, '12month': 365, overall: null } as const;

/**
 * Stats for /music from the play log, shaped like the last.fm ones. Null when the log is empty,
 * or doesn't go back far enough to cover the period yet.
 */
export async function playStats(period: keyof typeof periodDays, isHiddenName: (name: string) => boolean) {
	try {
		const [first] = await sql('SELECT MIN(played_at) AS first, COUNT(*) AS total FROM plays');
		if (!first?.first) return null;
		const since = Date.parse(first.first);
		const days = periodDays[period];
		// "overall" waits for a month of plays; before that, Spotify's ~1 year top lists say more.
		if (since > Date.now() - (days ?? 30) * DAY) return null;
		const from = new Date(days ? Date.now() - days * DAY : 0).toISOString();
		const iso = (ms: number) => new Date(Date.now() - ms).toISOString();

		const [[{ day }], [{ week }], artists, tracks] = await Promise.all([
			sql('SELECT COUNT(*) AS day FROM plays WHERE played_at >= ?', [iso(DAY)]),
			sql('SELECT COUNT(*) AS week FROM plays WHERE played_at >= ?', [iso(7 * DAY)]),
			// Grouped by name, so imported last.fm scrobbles (no Spotify ids) count together with Spotify plays.
			sql('SELECT MAX(artist) AS artist, MAX(artist_id) AS artist_id, COUNT(*) AS plays FROM plays WHERE played_at >= ? GROUP BY lower(artist) ORDER BY plays DESC LIMIT 30', [from]),
			sql(
				`SELECT MAX(track) AS track, MAX(CASE WHEN track_id NOT LIKE 'lastfm:%' THEN track_id END) AS track_id, MAX(artists) AS artists, COUNT(*) AS plays
				FROM plays WHERE played_at >= ? GROUP BY lower(artist), lower(track) ORDER BY plays DESC LIMIT 40`,
				[from]
			)
		]);
		return {
			source: 'log' as const,
			since,
			total: Number(first.total),
			last24h: Number(day),
			last7d: Number(week),
			topArtists: artists
				.filter((a: any) => !isHiddenName(a.artist))
				.slice(0, 8)
				.map((a: any) => ({ name: a.artist, plays: Number(a.plays), url: a.artist_id ? `https://open.spotify.com/artist/${a.artist_id}` : '' })),
			topTracks: tracks
				.filter((t: any) => !t.artists.split(', ').some(isHiddenName))
				.slice(0, 10)
				.map((t: any) => ({ name: t.track, artist: t.artists, plays: Number(t.plays), url: t.track_id ? `https://open.spotify.com/track/${t.track_id}` : '' }))
		};
	} catch (error: any) {
		if (!isMissingTable(error)) console.error('Failed to load play log stats:', error);
		return null;
	}
}
