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
			sql('SELECT MAX(artist) AS artist, MAX(artist_id) AS artist_id, COUNT(*) AS plays FROM plays WHERE played_at >= ? GROUP BY lower(artist) ORDER BY plays DESC LIMIT 100', [from]),
			sql(
				`SELECT MAX(track) AS track, MAX(CASE WHEN track_id NOT LIKE 'lastfm:%' THEN track_id END) AS track_id, MAX(artists) AS artists, COUNT(*) AS plays
				FROM plays WHERE played_at >= ? GROUP BY lower(artist), lower(track) ORDER BY plays DESC LIMIT 300`,
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
				.slice(0, 10)
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

// ── insights: "on repeat" on the home page, the listening clock and monthly recaps on /music ──

// Days, hours and months are counted in my own time zone, so "today" and "at 23:00" are mine.
const TZ = 'Europe/Tallinn';
const local = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' });
function localParts(iso: string) {
	const p = Object.fromEntries(local.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
	return { day: `${p.year}-${p.month}-${p.day}`, month: `${p.year}-${p.month}`, hour: Number(p.hour) };
}
// Last.fm scrobbles have no length; count those as an average song.
const AVERAGE_SONG_MS = 210_000;

export interface MonthRecap {
	month: string; // YYYY-MM
	partial: boolean; // the month isn't over yet
	plays: number;
	minutes: number;
	days: number; // days with at least one play
	topTrack: { name: string; artist: string; plays: number; image: string | null; url: string } | null;
	topArtist: { name: string; plays: number } | null;
	/** Artists first heard this month (null when the log doesn't reach back before it). */
	newArtists: string[] | null;
	busiestDay: { day: string; plays: number } | null;
}

export async function playInsights(isHiddenName: (name: string) => boolean) {
	const since = new Date(Date.now() - 92 * DAY).toISOString();
	const [rows, [{ first }], firsts] = await Promise.all([
		sql('SELECT played_at, track, track_id, artist, artists, image, duration_ms FROM plays WHERE played_at >= ? ORDER BY played_at', [since]),
		sql('SELECT MIN(played_at) AS first FROM plays'),
		sql('SELECT MAX(artist) AS artist, MIN(played_at) AS first FROM plays GROUP BY lower(artist) HAVING MIN(played_at) >= ?', [since])
	]);
	const plays = rows
		.filter((r: any) => !String(r.artists).split(', ').some(isHiddenName))
		.map((r: any) => ({ ...r, ...localParts(r.played_at) }));
	const trackKey = (p: any) => `${p.artist.toLowerCase()}|${p.track.toLowerCase()}`;
	const trackInfo = (p: any) => ({
		name: p.track,
		artist: p.artists,
		image: p.image ?? null,
		url: p.track_id.startsWith('lastfm:') ? '' : `https://open.spotify.com/track/${p.track_id}`
	});
	function top<T>(list: T[], key: (x: T) => string) {
		const counts = new Map<string, { item: T; plays: number }>();
		for (const x of list) {
			const k = key(x);
			const c = counts.get(k);
			if (c) c.plays++;
			else counts.set(k, { item: x, plays: 1 });
		}
		return [...counts.values()].sort((a, b) => b.plays - a.plays);
	}

	// Today's most played song, if it's been on repeat (3+ plays).
	const today = localParts(new Date().toISOString()).day;
	const [repeat] = top(plays.filter((p) => p.day === today), trackKey);

	// Plays per hour of the day over the last ~3 months.
	const clock = Array.from({ length: 24 }, () => 0);
	for (const p of plays) clock[p.hour]++;

	const thisMonth = localParts(new Date().toISOString()).month;
	const logStart = first ? localParts(first).month : thisMonth;
	const months = [...new Set(plays.map((p) => p.month))].sort().reverse().slice(0, 2);
	const recaps: MonthRecap[] = months.map((month) => {
		const inMonth = plays.filter((p) => p.month === month);
		const [tt] = top(inMonth, trackKey);
		const [ta] = top(inMonth, (p) => p.artist.toLowerCase());
		const [bd] = top(inMonth, (p) => p.day);
		return {
			month,
			partial: month === thisMonth,
			plays: inMonth.length,
			minutes: Math.round(inMonth.reduce((n, p) => n + Number(p.duration_ms ?? AVERAGE_SONG_MS), 0) / 60000),
			days: new Set(inMonth.map((p) => p.day)).size,
			topTrack: tt ? { ...trackInfo(tt.item), plays: tt.plays } : null,
			topArtist: ta ? { name: ta.item.artist, plays: ta.plays } : null,
			newArtists:
				logStart < month
					? firsts.filter((a: any) => localParts(a.first).month === month && !isHiddenName(a.artist)).map((a: any) => a.artist)
					: null,
			busiestDay: bd ? { day: bd.item.day, plays: bd.plays } : null
		};
	});

	return {
		repeat: repeat && repeat.plays >= 3 ? { ...trackInfo(repeat.item), plays: repeat.plays } : null,
		clock,
		clockPlays: plays.length,
		recaps
	};
}

const spotifyTrackUrl = (id: string | null | undefined) => (id && !id.startsWith('lastfm:') ? `https://open.spotify.com/track/${id}` : '');
// Spotify ids only: imported last.fm rows have made-up 'lastfm:…' ids.
const SPOTIFY_ID = `MAX(CASE WHEN track_id NOT LIKE 'lastfm:%' THEN track_id END)`;

/**
 * Everything the log knows about one artist (matched case-insensitively on the main artist),
 * for /music/artist/[name]. Null if they've never been played, or are hidden.
 */
export async function artistStats(name: string, isHiddenName: (name: string) => boolean) {
	const where = 'WHERE lower(artist) = lower(?)';
	const [[summary], [firstPlay], tracks, months, [cover], ranking] = await Promise.all([
		sql(
			`SELECT MAX(artist) AS name, MAX(artist_id) AS artist_id, COUNT(*) AS plays, MIN(played_at) AS first, MAX(played_at) AS last,
				COUNT(DISTINCT lower(track)) AS tracks, SUM(COALESCE(duration_ms, ${AVERAGE_SONG_MS})) AS ms FROM plays ${where}`,
			[name]
		),
		sql(`SELECT track, track_id FROM plays ${where} ORDER BY played_at LIMIT 1`, [name]),
		sql(
			`SELECT MAX(track) AS track, ${SPOTIFY_ID} AS track_id, MAX(image) AS image, COUNT(*) AS plays, MIN(played_at) AS first, MAX(played_at) AS last
			FROM plays ${where} GROUP BY lower(track) ORDER BY plays DESC LIMIT 25`,
			[name]
		),
		sql(`SELECT substr(played_at, 1, 7) AS month, COUNT(*) AS plays FROM plays ${where} GROUP BY month ORDER BY month`, [name]),
		sql(`SELECT image FROM plays ${where} AND image IS NOT NULL ORDER BY played_at DESC LIMIT 1`, [name]),
		sql('SELECT lower(artist) AS a, MAX(artist) AS artist, COUNT(*) AS plays FROM plays GROUP BY a ORDER BY plays DESC LIMIT 300')
	]);
	if (!summary || !Number(summary.plays) || isHiddenName(String(summary.name))) return null;
	const rank = ranking.filter((r: any) => !isHiddenName(r.artist)).findIndex((r: any) => r.a === String(summary.name).toLowerCase());
	return {
		name: String(summary.name),
		artistId: summary.artist_id ? String(summary.artist_id) : null,
		image: cover?.image ?? null,
		rank: rank >= 0 ? rank + 1 : null,
		plays: Number(summary.plays),
		minutes: Math.round(Number(summary.ms) / 60000),
		tracks: Number(summary.tracks),
		first: { at: String(summary.first), track: firstPlay?.track ?? null, url: spotifyTrackUrl(firstPlay?.track_id) },
		last: String(summary.last),
		topTracks: tracks.map((t: any) => ({
			name: t.track,
			plays: Number(t.plays),
			first: t.first,
			last: t.last,
			image: t.image ?? null,
			url: spotifyTrackUrl(t.track_id)
		})),
		months: months.map((m: any) => ({ month: m.month, plays: Number(m.plays) }))
	};
}

/** Songs (by title or artist) and artists in the log matching `query`, most played first. */
export async function searchPlays(query: string, isHiddenName: (name: string) => boolean) {
	const like = `%${query.toLowerCase().replace(/[\\%_]/g, (c) => '\\' + c)}%`;
	const [tracks, artists] = await Promise.all([
		sql(
			`SELECT MAX(track) AS track, ${SPOTIFY_ID} AS track_id, MAX(artist) AS artist, MAX(artists) AS artists, MAX(image) AS image,
				COUNT(*) AS plays, MIN(played_at) AS first, MAX(played_at) AS last
			FROM plays WHERE lower(track) LIKE ? ESCAPE '\\' OR lower(artists) LIKE ? ESCAPE '\\'
			GROUP BY lower(artist), lower(track) ORDER BY plays DESC LIMIT 80`,
			[like, like]
		),
		sql(
			`SELECT MAX(artist) AS artist, COUNT(*) AS plays FROM plays WHERE lower(artist) LIKE ? ESCAPE '\\'
			GROUP BY lower(artist) ORDER BY plays DESC LIMIT 12`,
			[like]
		)
	]);
	return {
		artists: artists
			.filter((a: any) => !isHiddenName(a.artist))
			.slice(0, 5)
			.map((a: any) => ({ name: a.artist, plays: Number(a.plays) })),
		tracks: tracks
			.filter((t: any) => !String(t.artists).split(', ').some(isHiddenName))
			.slice(0, 30)
			.map((t: any) => ({
				name: t.track,
				artist: t.artist,
				artists: t.artists,
				plays: Number(t.plays),
				first: t.first,
				last: t.last,
				image: t.image ?? null,
				url: spotifyTrackUrl(t.track_id)
			}))
	};
}
