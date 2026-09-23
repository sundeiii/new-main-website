import { pool } from '$lib/server/db';

/**
 * Adds any of the given columns that the table doesn't have yet. Only ever adds (nullable or
 * defaulted) columns, so it's safe to run on every cold start against the live database.
 */
export async function addColumns(table: string, columns: Record<string, string>) {
	const [rows]: any = await pool.query(
		'SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
		[table]
	);
	const existing = new Set(rows.map((r: any) => r.name));
	const missing = Object.entries(columns).filter(([name]) => !existing.has(name));
	if (missing.length) {
		await pool.query(`ALTER TABLE \`${table}\` ${missing.map(([name, def]) => `ADD COLUMN \`${name}\` ${def}`).join(', ')}`);
	}
}

/** Runs `setup` once per server instance; retries on the next call if it failed. */
export function once(setup: () => Promise<unknown>) {
	let ready: Promise<unknown> | null = null;
	return () =>
		(ready ??= setup().catch((e) => {
			ready = null;
			throw e;
		}));
}
