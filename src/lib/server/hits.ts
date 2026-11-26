import { db, ensureSchema, isMissingTable, sql } from '$lib/server/db';
import type { HitStats } from '$lib/hitStats';

const today = () => new Date().toISOString().slice(0, 10);

/** Pages worth counting: real paths, not the admin panel or API. */
export const countable = (path: unknown): path is string =>
	typeof path === 'string' && path.startsWith('/') && path.length <= 120 && !/^\/(admin|api)(\/|$)/.test(path);

/** Adds one view to the page and to today, and returns the new site total. */
export async function addView(path: string) {
	await ensureSchema();
	const [, , total] = await db.batch(
		[
			{ sql: 'INSERT INTO page_views (path, views) VALUES (?, 1) ON CONFLICT (path) DO UPDATE SET views = views + 1', args: [path] },
			{ sql: 'INSERT INTO daily_views (day, views) VALUES (?, 1) ON CONFLICT (day) DO UPDATE SET views = views + 1', args: [today()] },
			'SELECT COALESCE(SUM(views), 0) AS n FROM page_views'
		],
		'write'
	);
	return Number(total.rows[0][0]);
}

export async function hitStats(): Promise<HitStats> {
	const empty: HitStats = { total: 0, today: 0, days: [], top: [] };
	const since = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
	try {
		const [[{ total }], days, top] = await Promise.all([
			sql('SELECT COALESCE(SUM(views), 0) AS total FROM page_views'),
			sql('SELECT day, views FROM daily_views WHERE day >= ? ORDER BY day', [since]),
			sql('SELECT path, views FROM page_views ORDER BY views DESC LIMIT 8')
		]);
		const byDay = new Map(days.map((d: any) => [d.day, Number(d.views)]));
		const filled = Array.from({ length: 30 }, (_, i) => {
			const day = new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10);
			return { day, views: byDay.get(day) ?? 0 };
		});
		return {
			total: Number(total),
			today: byDay.get(today()) ?? 0,
			days: filled,
			top: top.map((t: any) => ({ path: t.path, views: Number(t.views) }))
		};
	} catch (error: any) {
		if (!isMissingTable(error)) console.error('Failed to load hit stats:', error);
		return empty;
	}
}
