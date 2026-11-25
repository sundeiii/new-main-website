import { getSetting } from '$lib/server/settings';

// The weather in the nav: city, label and units are set in /admin → pages → weather.
export async function GET() {
	const json = (body: unknown, status = 200, cache = 'no-store') =>
		new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': cache } });
	try {
		const settings = await getSetting('weather');
		if (!settings.show) return json({ hidden: true }, 200, 'public, max-age=60, s-maxage=60');

		const key = (process.env.OPENWEATHER_API_KEY || '').trim();
		if (!key) return json({ error: 'Weather API key not configured' }, 500);

		const url = new URL('https://api.openweathermap.org/data/2.5/weather');
		url.searchParams.set('q', settings.city);
		url.searchParams.set('appid', key);
		url.searchParams.set('units', settings.units === 'f' ? 'imperial' : 'metric');

		const response = await fetch(url.toString());
		if (!response.ok) return json({ error: 'OpenWeather error', status: response.status }, 502);
		const data = await response.json();

		return json(
			{
				temp: Math.round(data.main.temp),
				unit: settings.units === 'f' ? 'F' : 'C',
				feels_like: Math.round(data.main.feels_like),
				description: data.weather[0].description,
				icon: data.weather[0].icon,
				humidity: data.main.humidity,
				city: data.name || settings.city,
				label: settings.label || data.name || settings.city,
				country: data.sys?.country || ''
			},
			200,
			'public, max-age=600, s-maxage=900'
		);
	} catch (error) {
		console.error('Weather API Error:', error);
		return json({ error: 'Failed to fetch weather data' }, 500);
	}
}
