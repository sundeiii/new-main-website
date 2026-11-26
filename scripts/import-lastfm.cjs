// One-off: copies my last.fm scrobbles into the plays table, so the /music play log starts years
// back instead of on the day it was switched on. Only scrobbles from before the first Spotify play
// in the log are imported (later ones are already there from Spotify), and plays are keyed by
// their time, so running it again only fills in what's missing.
// Needs DB_URL / DB_TOKEN and LASTFM_API_KEY / LASTFM_USER (from .env).
// Usage: node scripts/import-lastfm.cjs
require('dotenv').config({ quiet: true });
const { createClient } = require('@libsql/client');

const db = createClient({ url: process.env.DB_URL, authToken: process.env.DB_TOKEN });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Last.fm's placeholder image when there's no cover art.
const NO_IMAGE = '2a96cbd8b46e442fc41c2b86b821562f';

async function page(n, to) {
	const params = new URLSearchParams({
		method: 'user.getrecenttracks',
		user: process.env.LASTFM_USER,
		api_key: process.env.LASTFM_API_KEY,
		format: 'json',
		limit: '200',
		page: String(n),
		to: String(to)
	});
	for (let attempt = 1; ; attempt++) {
		const res = await fetch(`https://ws.audioscrobbler.com/2.0/?${params}`);
		const data = await res.json().catch(() => ({}));
		if (res.ok && !data.error) return data.recenttracks;
		if (attempt >= 5) throw new Error(`Last.fm page ${n}: ${data.message ?? res.status}`);
		await sleep(2000 * attempt);
	}
}

async function main() {
	if (!process.env.LASTFM_API_KEY || !process.env.LASTFM_USER) throw new Error('Set LASTFM_API_KEY and LASTFM_USER');
	const { rows } = await db.execute(`SELECT MIN(played_at) AS first FROM plays WHERE track_id NOT LIKE 'lastfm:%'`);
	const to = rows[0]?.first ? Math.floor(Date.parse(rows[0].first) / 1000) - 1 : Math.floor(Date.now() / 1000);

	let added = 0;
	let pages = 1;
	for (let n = 1; n <= pages; n++) {
		const data = await page(n, to);
		pages = Number(data['@attr']?.totalPages ?? 1);
		const tracks = [].concat(data.track ?? []).filter((t) => t.date?.uts && t['@attr']?.nowplaying !== 'true');
		if (tracks.length) {
			const results = await db.batch(
				tracks.map((t) => {
					const artist = t.artist?.['#text'] ?? t.artist?.name ?? '';
					const image = [...(t.image ?? [])].reverse().find((i) => i['#text'] && !i['#text'].includes(NO_IMAGE))?.['#text'] ?? null;
					return {
						sql: `INSERT INTO plays (played_at, track_id, track, artist, artist_id, artists, album, image, duration_ms)
							VALUES (?, ?, ?, ?, NULL, ?, ?, ?, NULL) ON CONFLICT (played_at) DO NOTHING`,
						args: [
							new Date(Number(t.date.uts) * 1000).toISOString(),
							`lastfm:${artist.toLowerCase()}|${t.name.toLowerCase()}`,
							t.name,
							artist,
							artist,
							t.album?.['#text'] || null,
							image
						]
					};
				}),
				'write'
			);
			added += results.reduce((sum, r) => sum + r.rowsAffected, 0);
		}
		console.log(`page ${n}/${pages}: ${added} added so far`);
		await sleep(250); // stay well under last.fm's rate limit
	}
	console.log(`done: ${added} scrobbles added`);
}

main().catch((e) => {
	console.error(e.message ?? e);
	process.exit(1);
});
