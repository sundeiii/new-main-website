const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
	new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

// Turns a city name from the visitor's timezone (e.g. "Tallinn", "Los Angeles") into
// "city, region, country" for the home page clock.
export async function GET({ url }: any) {
	const location = (url.searchParams.get('location') || '').trim();

	// Timezone cities are short plain names; refusing anything else keeps this from being used
	// as a free proxy for the ipgeolocation quota.
	if (!/^[\p{L} .'-]{2,40}$/u.test(location)) {
		return json({ error: 'Invalid location' }, 400);
	}

	const apiKey = process.env.IPGEOLOCATION_API_KEY;
	if (!apiKey) return json({ error: 'API key not configured' }, 500);

	try {
		const response = await fetch(
			`https://api.ipgeolocation.io/v2/timezone?apiKey=${apiKey}&location=${encodeURIComponent(location)}`
		);
		if (!response.ok) return json({ error: 'Failed to fetch timezone info' }, 502);

		const data = await response.json();
		const { city, state_prov, country_name } = data.location ?? {};
		// A city's name doesn't change, so let Vercel's cache answer repeat visitors for a day.
		return json({ location: { city, state_prov, country_name } }, 200, {
			'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800'
		});
	} catch {
		return json({ error: 'Server error' }, 500);
	}
}
