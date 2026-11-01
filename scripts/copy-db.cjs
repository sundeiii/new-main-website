// One-off copy of every table from one libSQL database to another (e.g. Bunny -> Turso).
// Reads FROM_DB_URL / FROM_DB_TOKEN and TO_DB_URL / TO_DB_TOKEN from the environment or .env.
// Usage: node scripts/copy-db.cjs
require('dotenv').config();
const { createClient } = require('@libsql/client');

const from = createClient({ url: process.env.FROM_DB_URL, authToken: process.env.FROM_DB_TOKEN });
const to = createClient({ url: process.env.TO_DB_URL, authToken: process.env.TO_DB_TOKEN });

const CHUNK = 100;

async function main() {
	if (!process.env.FROM_DB_URL || !process.env.TO_DB_URL) throw new Error('Set FROM_DB_URL and TO_DB_URL');

	// Recreate the schema exactly as the source has it (tables first, then indexes).
	const { rows: objects } = await from.execute(
		`SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY type = 'index'`
	);
	const tables = objects.filter((o) => o.type === 'table').map((o) => o.name);

	// Refuse to copy into tables that already hold rows, so running this twice can't duplicate anything.
	for (const t of tables) {
		const exists = await to.execute({ sql: `SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?`, args: [t] });
		if (!exists.rows.length) continue;
		const { rows } = await to.execute(`SELECT COUNT(*) AS n FROM "${t}"`);
		if (Number(rows[0].n) > 0) throw new Error(`Target table ${t} is not empty, stopping`);
	}

	await to.batch(
		objects.map((o) => o.sql.replace(/^CREATE (UNIQUE )?(TABLE|INDEX) (?!IF NOT EXISTS)/i, 'CREATE $1$2 IF NOT EXISTS ')),
		'write'
	);

	for (const t of tables) {
		const { rows, columns } = await from.execute(`SELECT * FROM "${t}"`);
		const insert = `INSERT INTO "${t}" (${columns.map((c) => `"${c}"`).join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`;
		for (let i = 0; i < rows.length; i += CHUNK) {
			await to.batch(
				rows.slice(i, i + CHUNK).map((r) => ({ sql: insert, args: columns.map((_, j) => r[j]) })),
				'write'
			);
		}
		const { rows: check } = await to.execute(`SELECT COUNT(*) AS n FROM "${t}"`);
		console.log(`${t}: ${rows.length} copied, ${check[0].n} in target`);
	}
}

main().catch((e) => {
	console.error(e.message ?? e);
	process.exit(1);
});
