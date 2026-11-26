import { ensureSchema, run, sql } from '$lib/server/db';

// Keeps the last good response from an outside service (like Last.fm), so a page can show it,
// marked as old, while the service is down.

export async function saveCached(key: string, value: unknown) {
	try {
		await ensureSchema();
		await run(
			'INSERT INTO api_cache (k, v, updated_at) VALUES (?, ?, ?) ON CONFLICT (k) DO UPDATE SET v = excluded.v, updated_at = excluded.updated_at',
			[key, JSON.stringify(value), new Date()]
		);
	} catch (error) {
		console.error(`Failed to cache ${key}:`, error);
	}
}

export async function loadCached<T>(key: string): Promise<{ value: T; updatedAt: string } | null> {
	try {
		const [row] = await sql('SELECT v, updated_at FROM api_cache WHERE k = ?', [key]);
		return row ? { value: JSON.parse(row.v), updatedAt: row.updated_at } : null;
	} catch {
		return null;
	}
}
