import type { RequestHandler } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/adminAuth';
import { formatSql, pool } from '$lib/server/db';

// Downloads the guestbook as a .sql file: the table definition plus one INSERT per entry.
// It uses CREATE TABLE IF NOT EXISTS and INSERT IGNORE, so importing it never overwrites anything.
export const GET: RequestHandler = async ({ request }) => {
	const denied = requireAdmin(request);
	if (denied) return denied;

	const [[create]]: any = await pool.query('SHOW CREATE TABLE guestbook');
	const [rows]: any = await pool.query('SELECT * FROM guestbook ORDER BY created_at ASC');

	const now = new Date();
	const lines = [
		`-- guestbook export from sundei.ee`,
		`-- ${now.toISOString()} · ${rows.length} entries`,
		'',
		'SET NAMES utf8mb4;',
		'',
		String(create['Create Table']).replace(/^CREATE TABLE/, 'CREATE TABLE IF NOT EXISTS') + ';',
		''
	];

	for (const row of rows) {
		const columns = Object.keys(row);
		lines.push(
			formatSql(
				`INSERT IGNORE INTO \`guestbook\` (${columns.map((c) => `\`${c}\``).join(', ')}) VALUES (${columns.map(() => '?').join(', ')});`,
				columns.map((c) => row[c]),
				false,
				'+00:00'
			)
		);
	}

	const date = now.toISOString().slice(0, 10);
	return new Response(lines.join('\n') + '\n', {
		headers: {
			'Content-Type': 'application/sql; charset=utf-8',
			'Content-Disposition': `attachment; filename="guestbook-${date}.sql"`
		}
	});
};
