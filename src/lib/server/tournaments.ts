import { ensureSchema, run, sql } from '$lib/server/db';
import { tournamentSeed, type Tournament, type TournamentYear } from '$lib/tournamentSeed';

export const ensureTable = ensureSchema;

function fromRow(row: any): Tournament {
	let hosts = [];
	try {
		hosts = JSON.parse(row.hosts || '[]');
	} catch {}
	return {
		id: row.id,
		year: row.year,
		name: row.name,
		role: row.role,
		link: row.link,
		banner: row.banner,
		badge: row.badge,
		hosts,
		tier: row.tier ?? null,
		region: row.region ?? null,
		memory: row.memory ?? null
	};
}

/**
 * All tournaments, oldest year first, in their saved order within each year. Only admin requests
 * create the table; for public requests a missing table just throws and the caller falls back.
 */
export async function listTournaments({ createTable = true } = {}): Promise<Tournament[]> {
	if (createTable) await ensureTable();
	const rows = await sql('SELECT * FROM tournaments ORDER BY year ASC, position ASC, id ASC');
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
		tier: str(input?.tier) || null,
		region: str(input?.region) || null,
		memory: str(input?.memory) || null,
		hosts: Array.isArray(input?.hosts)
			? input.hosts
					.map((h: any) => ({ name: str(h?.name), id: Number(h?.id) }))
					.filter((h: any) => h.name && Number.isInteger(h.id) && h.id > 0)
			: []
	};
	if (!t.year || !t.name || !t.role || !t.link) return 'year, name, role and link are required';
	if (t.year.length > 20 || t.name.length > 200 || t.role.length > 100) return 'year, name or role is too long';
	if ((t.tier?.length ?? 0) > 50 || (t.region?.length ?? 0) > 100 || (t.memory?.length ?? 0) > 300) return 'tier, region or memory is too long';
	for (const url of [t.link, t.banner, t.badge]) {
		if (url && (url.length > 500 || !/^https?:\/\//.test(url))) return `not a valid http(s) url: ${url}`;
	}
	return t;
}

export async function insertTournament(t: Tournament) {
	await ensureTable();
	const [{ next }] = await sql('SELECT COALESCE(MAX(position), -1) + 1 AS next FROM tournaments WHERE year = ?', [t.year]);
	const result = await run(
		'INSERT INTO tournaments (year, name, role, link, banner, badge, hosts, position, tier, region, memory) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
		[t.year, t.name, t.role, t.link, t.banner ?? null, t.badge ?? null, JSON.stringify(t.hosts), next, t.tier ?? null, t.region ?? null, t.memory ?? null]
	);
	return result.lastId as number;
}

/** Copies the old hardcoded list into the table. Only runs when the table is empty. */
export async function importSeed() {
	await ensureTable();
	const [{ count }] = await sql('SELECT COUNT(*) AS count FROM tournaments');
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
