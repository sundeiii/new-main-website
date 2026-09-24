import type { RequestHandler } from '@sveltejs/kit';

// Profiles are scraped from osu!'s HTML (heavy), and the tournaments page asks for every host, so
// cache results in memory per server instance and on Vercel's edge.
const cache = new Map<string, { at: number; body: string }>();
const CACHE_MS = 6 * 60 * 60 * 1000;
const cacheHeaders = {
	'Content-Type': 'application/json',
	'Cache-Control': 'public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400'
};

export const GET: RequestHandler = async ({ url }) => {
	const userId = url.searchParams.get('id') ?? '';

	if (!/^\d{1,10}$/.test(userId)) {
		return new Response(JSON.stringify({ error: 'Invalid user id' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const hit = cache.get(userId);
	if (hit && Date.now() - hit.at < CACHE_MS) {
		return new Response(hit.body, { headers: cacheHeaders });
	}

	try {
		const response = await fetch(`https://osu.ppy.sh/users/${userId}`, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
				'Accept': 'text/html'
			}
		});

		if (!response.ok) {
			return new Response(JSON.stringify({ cover_url: null, country_code: null, country_name: null }), {
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const html = await response.text();

		// osu! embeds user JSON as HTML-entity-encoded data in the page
		const decoded = html
			.replace(/&quot;/g, '"')
			.replace(/&amp;/g, '&')
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&#039;/g, "'");

		let cover_url: string | null = null;
		let country_code: string | null = null;
		let country_name: string | null = null;

		const coverMatch = decoded.match(/"cover_url":"([^"]+)"/);
		if (coverMatch) {
			cover_url = coverMatch[1].replace(/\\\//g, '/');
		}

		const countryObjMatch = decoded.match(/"country":\{"code":"(\w+)","name":"([^"]+)"\}/);
		if (countryObjMatch) {
			country_code = countryObjMatch[1];
			country_name = countryObjMatch[2];
		} else {
			const countryMatch = decoded.match(/"country_code":"(\w+)"/);
			if (countryMatch) {
				country_code = countryMatch[1];
			}
		}

		const body = JSON.stringify({ cover_url, country_code, country_name });
		cache.set(userId, { at: Date.now(), body });
		return new Response(body, { headers: cacheHeaders });
	} catch (error) {
		console.error('Error fetching osu profile:', error);
		return new Response(JSON.stringify({ cover_url: null, country_code: null, country_name: null }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
