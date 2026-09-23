import { romanize } from '$lib/server/romanize';
import type { RequestHandler } from '@sveltejs/kit';

export const config = {
	runtime: 'nodejs20.x'
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { text } = await request.json();

		if (!text || typeof text !== 'string') {
			return new Response(JSON.stringify({ error: 'Missing text' }), { status: 400 });
		}
		// Song titles and artist names are short; romanizing is CPU-heavy, so refuse walls of text.
		if (text.length > 300) {
			return new Response(JSON.stringify({ error: 'Text too long (max 300 chars)' }), { status: 400 });
		}

		const romanized = await romanize(text);
		return new Response(JSON.stringify({ romanized }));
	} catch (error) {
		console.error('Romanize error:', error);
		return new Response(JSON.stringify({ error: 'Failed to romanize' }), { status: 500 });
	}
};