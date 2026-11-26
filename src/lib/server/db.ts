import { createClient, type InArgs, type InValue } from '@libsql/client/web';
import { once } from '$lib/server/migrate';

// Turso (libSQL, i.e. SQLite) over HTTPS, so there are no connections or IP allow-lists
// to manage from Vercel.
export const db = createClient({
	url: process.env.DB_URL || '',
	authToken: process.env.DB_TOKEN
});

type Arg = InValue | Date | boolean | undefined;

// Dates are stored as ISO strings (they sort and compare correctly as text), booleans as 0/1.
const toArg = (v: Arg): InValue => (v instanceof Date ? v.toISOString() : typeof v === 'boolean' ? (v ? 1 : 0) : v ?? null);
const args = (list: Arg[]): InArgs => list.map(toArg);

/** Runs a SELECT and returns its rows as plain objects. */
export async function sql<T = any>(query: string, params: Arg[] = []): Promise<T[]> {
	const result = await db.execute({ sql: query, args: args(params) });
	return result.rows.map((row) => Object.fromEntries(result.columns.map((c, i) => [c, row[i]])) as T);
}

/** Runs an INSERT / UPDATE / DELETE. */
export async function run(query: string, params: Arg[] = []) {
	const result = await db.execute({ sql: query, args: args(params) });
	return { changes: result.rowsAffected, lastId: result.lastInsertRowid == null ? null : Number(result.lastInsertRowid) };
}

/** `?, ?, ?` for an IN (...) list. */
export const placeholders = (n: number) => Array(n).fill('?').join(', ');

export const isMissingTable = (e: any) => /no such table/i.test(String(e?.message ?? e));
export const isDuplicate = (e: any) => /UNIQUE constraint failed/i.test(String(e?.message ?? e));

// Current time in the same ISO format that toArg() stores.
const NOW = `(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

// Every table the site uses. All of them are IF NOT EXISTS, so running this again is harmless.
export const SCHEMA = [
	`CREATE TABLE IF NOT EXISTS site_settings (
		k TEXT PRIMARY KEY,
		v TEXT NOT NULL,
		updated_at TEXT DEFAULT ${NOW}
	)`,
	`CREATE TABLE IF NOT EXISTS blog_posts (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		kind TEXT NOT NULL DEFAULT 'post',
		slug TEXT NOT NULL UNIQUE,
		title TEXT NOT NULL,
		excerpt TEXT NOT NULL DEFAULT '',
		banner TEXT,
		content TEXT NOT NULL,
		published INTEGER NOT NULL DEFAULT 0,
		date TEXT NOT NULL,
		end_date TEXT,
		location TEXT,
		link TEXT,
		created_at TEXT DEFAULT ${NOW},
		updated_at TEXT DEFAULT ${NOW}
	)`,
	`CREATE TABLE IF NOT EXISTS tournaments (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		year TEXT NOT NULL,
		name TEXT NOT NULL,
		role TEXT NOT NULL,
		link TEXT NOT NULL,
		banner TEXT,
		badge TEXT,
		hosts TEXT NOT NULL,
		position INTEGER NOT NULL DEFAULT 0,
		tier TEXT,
		region TEXT,
		memory TEXT,
		created_at TEXT DEFAULT ${NOW}
	)`,
	`CREATE TABLE IF NOT EXISTS changelog (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		date TEXT NOT NULL,
		text TEXT NOT NULL,
		created_at TEXT DEFAULT ${NOW}
	)`,
	`CREATE TABLE IF NOT EXISTS guestbook (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		message TEXT NOT NULL,
		created_at TEXT DEFAULT ${NOW},
		stamp TEXT
	)`,
	// IPs only ever as salted hashes, in their own table, so guestbook exports never contain them.
	`CREATE TABLE IF NOT EXISTS guestbook_rate (
		ip_hash TEXT NOT NULL,
		created_at TEXT NOT NULL DEFAULT ${NOW}
	)`,
	`CREATE INDEX IF NOT EXISTS guestbook_rate_ip ON guestbook_rate (ip_hash, created_at)`,
	// Guestbook reactions: counts per entry and emoji, plus who reacted (salted IP hashes only)
	// so the same person can't stack the same one.
	`CREATE TABLE IF NOT EXISTS guestbook_reactions (
		entry_id TEXT NOT NULL,
		reaction TEXT NOT NULL,
		count INTEGER NOT NULL DEFAULT 0,
		PRIMARY KEY (entry_id, reaction)
	)`,
	`CREATE TABLE IF NOT EXISTS guestbook_reacted (
		ip_hash TEXT NOT NULL,
		entry_id TEXT NOT NULL,
		reaction TEXT NOT NULL,
		created_at TEXT NOT NULL DEFAULT ${NOW},
		PRIMARY KEY (ip_hash, entry_id, reaction)
	)`,
	// Hit counter: views per page, and per day for the graph on /stats.
	`CREATE TABLE IF NOT EXISTS page_views (
		path TEXT PRIMARY KEY,
		views INTEGER NOT NULL DEFAULT 0
	)`,
	`CREATE TABLE IF NOT EXISTS daily_views (
		day TEXT PRIMARY KEY,
		views INTEGER NOT NULL DEFAULT 0
	)`,
	// Every Spotify play, copied from Spotify's last-50 list by /api/plays/sync (see plays.ts).
	`CREATE TABLE IF NOT EXISTS plays (
		played_at TEXT PRIMARY KEY,
		track_id TEXT NOT NULL,
		track TEXT NOT NULL,
		artist TEXT NOT NULL,
		artist_id TEXT,
		artists TEXT NOT NULL,
		album TEXT,
		image TEXT,
		duration_ms INTEGER
	)`,
	// Small shared counters, like ryo's headpats.
	`CREATE TABLE IF NOT EXISTS counters (
		k TEXT PRIMARY KEY,
		n INTEGER NOT NULL DEFAULT 0
	)`,
	// For the artist pages on /music.
	`CREATE INDEX IF NOT EXISTS plays_artist ON plays (lower(artist))`,
	// Last good responses from outside services, shown while the service is down.
	`CREATE TABLE IF NOT EXISTS api_cache (
		k TEXT PRIMARY KEY,
		v TEXT NOT NULL,
		updated_at TEXT NOT NULL
	)`
];

/** Creates any missing tables. Admin writes call this; public pages don't need to. */
export const ensureSchema = once(() => db.batch(SCHEMA, 'write'));
