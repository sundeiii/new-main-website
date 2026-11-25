import { getSetting } from '$lib/server/settings';

// The weather in the nav: city, label and units are set in /admin → weather.
// Not cached by Vercel (so a changed city shows straight away); instead each server keeps the
// weather per city for 10 minutes, which keeps OpenWeather calls low.
const cache = new Map<string, { at: number; data: unknown }>();

export async function GET() {
	const json = (body: unknown, status = 200, cache = 'no-store') =>
		new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': cache } });
	try {
		const settings = await getSetting('weather');
		if (!settings.show) return json({ hidden: true });
		const cacheKey = `${settings.city}|${settings.units}|${settings.label}`;
		const hit = cache.get(cacheKey);
		if (hit && Date.now() - hit.at < 10 * 60_000) return json(hit.data);

		const key = (process.env.OPENWEATHER_API_KEY || '').trim();
		if (!key) return json({ error: 'Weather API key not configured' }, 500);

		const url = new URL('https://api.openweathermap.org/data/2.5/weather');
		url.searchParams.set('q', settings.city);
		url.searchParams.set('appid', key);
		url.searchParams.set('units', settings.units === 'f' ? 'imperial' : 'metric');

		const response = await fetch(url.toString());
		if (!response.ok) return json({ error: 'OpenWeather error', status: response.status }, 502);
		const data = await response.json();

		const weather = {
			temp: Math.round(data.main.temp),
			unit: settings.units === 'f' ? 'F' : 'C',
			feels_like: Math.round(data.main.feels_like),
			description: data.weather[0].description,
			icon: data.weather[0].icon,
			humidity: data.main.humidity,
			city: data.name || settings.city,
			label: settings.label || data.name || settings.city,
			country: data.sys?.country || ''
		};
		cache.set(cacheKey, { at: Date.now(), data: weather });
		return json(weather);
	} catch (error) {
		console.error('Weather API Error:', error);
		return json({ error: 'Failed to fetch weather data' }, 500);
	}
}
