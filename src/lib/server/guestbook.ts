import { createHash } from 'crypto';
import { db, ensureSchema, isMissingTable, sql } from '$lib/server/db';

/** Salted, so the stored hashes can't be matched back to IPs. */
export const hashIp = (ip: string) =>
	createHash('sha256').update(`${process.env.GUESTBOOK_SALT || process.env.DB_TOKEN || ''}:${ip}`).digest('hex');

export type Reactions = Record<string, number>;

/** Reaction counts for every entry: { entryId: { heart: 3, … } }. Empty if none yet. */
export async function allReactions(): Promise<Record<string, Reactions>> {
	try {
		const rows = await sql('SELECT entry_id, reaction, count FROM guestbook_reactions WHERE count > 0');
		const out: Record<string, Reactions> = {};
		for (const r of rows) (out[r.entry_id] ??= {})[r.reaction] = Number(r.count);
		return out;
	} catch (error) {
		if (!isMissingTable(error)) console.error('Failed to load reactions:', error);
		return {};
	}
}

/**
 * Adds the reaction, or takes it back if this visitor already gave it. Returns the entry's new
 * counts and whether the visitor now has it on.
 */
export async function toggleReaction(entryId: string, reaction: string, ipHash: string) {
	await ensureSchema();
	const [had] = await sql('SELECT 1 AS x FROM guestbook_reacted WHERE ip_hash = ? AND entry_id = ? AND reaction = ?', [ipHash, entryId, reaction]);
	const on = !had;
	await db.batch(
		on
			? [
					{ sql: 'INSERT OR IGNORE INTO guestbook_reacted (ip_hash, entry_id, reaction) VALUES (?, ?, ?)', args: [ipHash, entryId, reaction] },
					{
						sql: 'INSERT INTO guestbook_reactions (entry_id, reaction, count) VALUES (?, ?, 1) ON CONFLICT (entry_id, reaction) DO UPDATE SET count = count + 1',
						args: [entryId, reaction]
					}
			  ]
			: [
					{ sql: 'DELETE FROM guestbook_reacted WHERE ip_hash = ? AND entry_id = ? AND reaction = ?', args: [ipHash, entryId, reaction] },
					{ sql: 'UPDATE guestbook_reactions SET count = MAX(count - 1, 0) WHERE entry_id = ? AND reaction = ?', args: [entryId, reaction] }
			  ],
		'write'
	);
	const rows = await sql('SELECT reaction, count FROM guestbook_reactions WHERE entry_id = ? AND count > 0', [entryId]);
	return { on, reactions: Object.fromEntries(rows.map((r) => [r.reaction, Number(r.count)])) as Reactions };
}

/** Per visitor: how many reaction changes in the last minute (to stop scripted spamming). */
const recent = new Map<string, number[]>();
export function tooFast(ipHash: string, limit = 30) {
	const now = Date.now();
	const list = (recent.get(ipHash) ?? []).filter((t) => now - t < 60_000);
	list.push(now);
	recent.set(ipHash, list);
	if (recent.size > 5000) recent.clear();
	return list.length > limit;
}
