import { createClient, type InArgs, type InValue } from '@libsql/client/web';
import { once } from '$lib/server/migrate';

// Bunny Database (libSQL, i.e. SQLite) over HTTPS, so there are no connections or IP allow-lists
// to manage from Vercel.
export const db = createClient({
	url: process.env.BUNNY_DB_URL || '',
	authToken: process.env.BUNNY_DB_TOKEN
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
	`CREATE INDEX IF NOT EXISTS guestbook_rate_ip ON guestbook_rate (ip_hash, created_at)`
];

/** Creates any missing tables. Admin writes call this; public pages don't need to. */
export const ensureSchema = once(() => db.batch(SCHEMA, 'write'));
