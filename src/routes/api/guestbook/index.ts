import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { ensureSchema, run, sql } from '$lib/server/db';
import { stampById } from '$lib/stamps';

// Posts per IP per window. IPs are stored only as salted hashes, in their own table, so the
// guestbook table (and its exports) never contain them.
const IP_LIMIT = 3;
const IP_WINDOW_MINUTES = 10;

const hashIp = (ip: string) =>
	createHash('sha256').update(`${process.env.GUESTBOOK_SALT || process.env.BUNNY_DB_TOKEN || ''}:${ip}`).digest('hex');

export async function GET() {
	try {
		const rows = await sql('SELECT * FROM guestbook ORDER BY created_at DESC');
		return new Response(JSON.stringify(rows), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		console.error('Failed to fetch guestbook:', error);
		return new Response(JSON.stringify([]), {
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

export async function POST({ request, clientAddress }: any) {
	try {
		const { name, message, website, stamp } = await request.json();

		// Honeypot: the form has a hidden "website" field people never see, so only bots fill it.
		if (website) {
			return new Response(JSON.stringify({ error: 'Invalid input' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		if (!name || !message) {
			return new Response(JSON.stringify({ error: 'Name and message required' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		if (name.length > 50) {
			return new Response(JSON.stringify({ error: 'Name too long (max 50 chars)' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		if (message.length > 500) {
			return new Response(JSON.stringify({ error: 'Message too long (max 500 chars)' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Sanitize: strip HTML tags
		const cleanName = name.replace(/<[^>]*>/g, '').trim();
		const cleanMessage = message.replace(/<[^>]*>/g, '').trim();

		if (!cleanName || !cleanMessage) {
			return new Response(JSON.stringify({ error: 'Invalid input' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Rate limit per IP, so changing the name doesn't get around it
		await ensureSchema();
		const ipHash = hashIp(String(clientAddress || 'unknown'));
		const [{ count }] = await sql('SELECT COUNT(*) AS count FROM guestbook_rate WHERE ip_hash = ? AND created_at > ?', [
			ipHash,
			new Date(Date.now() - IP_WINDOW_MINUTES * 60 * 1000)
		]);
		if (count >= IP_LIMIT) {
			return new Response(JSON.stringify({ error: 'Too many posts, try again in a few minutes' }), {
				status: 429,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// And max 1 entry per name per 5 minutes
		const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
		const recentRows = await sql(
			'SELECT * FROM guestbook WHERE name = ? AND created_at > ? ORDER BY created_at DESC LIMIT 1',
			[cleanName, fiveMinutesAgo]
		);
		if (recentRows.length > 0) {
			return new Response(JSON.stringify({ error: 'Please wait a few minutes before posting again' }), {
				status: 429,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		await run('INSERT INTO guestbook_rate (ip_hash, created_at) VALUES (?, ?)', [ipHash, new Date()]);
		// Keep the table tiny: drop entries older than a day.
		run('DELETE FROM guestbook_rate WHERE created_at < ?', [new Date(Date.now() - 24 * 60 * 60 * 1000)]).catch(() => {});

		const stampId = stampById(stamp)?.id ?? null;

		const id = uuidv4();
		const createdAt = new Date();
		await run(
			'INSERT INTO guestbook (id, name, message, created_at, stamp) VALUES (?, ?, ?, ?, ?)',
			[id, cleanName, cleanMessage, createdAt, stampId]
		);
		const rows = await sql('SELECT * FROM guestbook WHERE id = ?', [id]);
		const newEntry = rows[0];

		return new Response(JSON.stringify(newEntry), {
			status: 201,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		console.error('Failed to post guestbook entry:', error);
		return new Response(JSON.stringify({ error: 'Failed to post entry' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}
