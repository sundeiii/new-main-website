import { pool } from '$lib/server/db';
import { once } from '$lib/server/migrate';

export interface ChangelogEntry {
	id?: number;
	date: string; // YYYY-MM-DD
	text: string;
}

export const ensureChangelogTable = once(() =>
	pool.query(
		`CREATE TABLE IF NOT EXISTS changelog (
			id INT AUTO_INCREMENT PRIMARY KEY,
			date DATE NOT NULL,
			text VARCHAR(500) NOT NULL,
			created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
	)
);

const toDate = (d: unknown) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10));

export async function listChangelog({ createTable = true } = {}): Promise<ChangelogEntry[]> {
	if (createTable) await ensureChangelogTable();
	const [rows]: any = await pool.query('SELECT id, date, text FROM changelog ORDER BY date DESC, id DESC');
	return rows.map((r: any) => ({ id: r.id, date: toDate(r.date), text: r.text }));
}

export function cleanEntry(input: any): ChangelogEntry | string {
	const text = typeof input?.text === 'string' ? input.text.trim() : '';
	const date = typeof input?.date === 'string' && input.date ? input.date : new Date().toISOString().slice(0, 10);
	if (!text) return 'write something';
	if (text.length > 500) return 'max 500 characters';
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'date must be YYYY-MM-DD';
	return { date, text };
}
