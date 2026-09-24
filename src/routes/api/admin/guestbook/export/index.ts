import type { RequestHandler } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/adminAuth';
import { sql } from '$lib/server/db';

// SQL literal for a value: NULL, a number, or a quoted string.
const literal = (v: unknown) => (v == null ? 'NULL' : typeof v === 'number' || typeof v === 'bigint' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);

// Downloads the guestbook as a .sql file (SQLite): the table definition plus one INSERT per entry.
// It uses CREATE TABLE IF NOT EXISTS and INSERT OR IGNORE, so importing it never overwrites anything.
export const GET: RequestHandler = async ({ request }) => {
	const denied = requireAdmin(request);
	if (denied) return denied;

	const [create] = await sql("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'guestbook'");
	const rows = await sql('SELECT * FROM guestbook ORDER BY created_at ASC');

	const now = new Date();
	const lines = [
		`-- guestbook export from sundei.ee`,
		`-- ${now.toISOString()} · ${rows.length} entries`,
		'',
		String(create?.sql ?? '').replace(/^CREATE TABLE( IF NOT EXISTS)?/, 'CREATE TABLE IF NOT EXISTS') + ';',
		''
	];

	for (const row of rows) {
		const columns = Object.keys(row);
		lines.push(`INSERT OR IGNORE INTO guestbook (${columns.join(', ')}) VALUES (${columns.map((c) => literal(row[c])).join(', ')});`);
	}

	const date = now.toISOString().slice(0, 10);
	return new Response(lines.join('\n') + '\n', {
		headers: {
			'Content-Type': 'application/sql; charset=utf-8',
			'Content-Disposition': `attachment; filename="guestbook-${date}.sql"`
		}
	});
};
