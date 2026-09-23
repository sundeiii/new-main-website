import { pool } from '$lib/server/db';
import { tournamentSeed, type Tournament, type TournamentYear } from '$lib/tournamentSeed';

let tableReady: Promise<unknown> | null = null;

export function ensureTable() {
	tableReady ??= pool
		.query(
			`CREATE TABLE IF NOT EXISTS tournaments (
				id INT AUTO_INCREMENT PRIMARY KEY,
				year VARCHAR(20) NOT NULL,
				name VARCHAR(200) NOT NULL,
				role VARCHAR(100) NOT NULL,
				link VARCHAR(500) NOT NULL,
				banner VARCHAR(500) NULL,
				badge VARCHAR(500) NULL,
				hosts TEXT NOT NULL,
				position INT NOT NULL DEFAULT 0,
				created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
		)
		.catch((e) => {
			tableReady = null;
			throw e;
		});
	return tableReady;
}

function fromRow(row: any): Tournament {
	let hosts = [];
	try {
		hosts = JSON.parse(row.hosts || '[]');
	} catch {}
	return { id: row.id, year: row.year, name: row.name, role: row.role, link: row.link, banner: row.banner, badge: row.badge, hosts };
}

/**
 * All tournaments, oldest year first, in their saved order within each year. Only admin requests
 * create the table; for public requests a missing table just throws and the caller falls back.
 */
export async function listTournaments({ createTable = true } = {}): Promise<Tournament[]> {
	if (createTable) await ensureTable();
	const [rows]: any = await pool.query('SELECT * FROM tournaments ORDER BY year ASC, position ASC, id ASC');
	return rows.map(fromRow);
}

export function groupByYear(list: Tournament[]): TournamentYear[] {
	const groups: TournamentYear[] = [];
	for (const { year, ...event } of list) {
		let group = groups.find((g) => g.year === year);
		if (!group) groups.push((group = { year, events: [] }));
		group.events.push(event);
	}
	return groups;
}

/** Validates admin input, returning a clean tournament or an error message. */
export function cleanTournament(input: any): Tournament | string {
	const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
	const t = {
		year: str(input?.year),
		name: str(input?.name),
		role: str(input?.role),
		link: str(input?.link),
		banner: str(input?.banner) || null,
		badge: str(input?.badge) || null,
		hosts: Array.isArray(input?.hosts)
			? input.hosts
					.map((h: any) => ({ name: str(h?.name), id: Number(h?.id) }))
					.filter((h: any) => h.name && Number.isInteger(h.id) && h.id > 0)
			: []
	};
	if (!t.year || !t.name || !t.role || !t.link) return 'year, name, role and link are required';
	if (t.year.length > 20 || t.name.length > 200 || t.role.length > 100) return 'year, name or role is too long';
	for (const url of [t.link, t.banner, t.badge]) {
		if (url && (url.length > 500 || !/^https?:\/\//.test(url))) return `not a valid http(s) url: ${url}`;
	}
	return t;
}

export async function insertTournament(t: Tournament) {
	await ensureTable();
	const [[{ next }]]: any = await pool.query('SELECT COALESCE(MAX(position), -1) + 1 AS next FROM tournaments WHERE year = ?', [t.year]);
	const [result]: any = await pool.query(
		'INSERT INTO tournaments (year, name, role, link, banner, badge, hosts, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
		[t.year, t.name, t.role, t.link, t.banner, t.badge, JSON.stringify(t.hosts), next]
	);
	return result.insertId as number;
}

/** Copies the old hardcoded list into the table. Only runs when the table is empty. */
export async function importSeed() {
	await ensureTable();
	const [[{ count }]]: any = await pool.query('SELECT COUNT(*) AS count FROM tournaments');
	if (count > 0) return 0;
	let imported = 0;
	for (const group of tournamentSeed) {
		for (const event of group.events) {
			await insertTournament({ ...event, year: group.year });
			imported++;
		}
	}
	return imported;
}
