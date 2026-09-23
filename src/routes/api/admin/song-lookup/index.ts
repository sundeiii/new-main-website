import type { RequestHandler } from '@sveltejs/kit';
import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { json, requireAdmin } from '$lib/server/adminAuth';
import { getSpotifyAccessToken } from '$lib/server/spotify';

// Fills in "song of the month" from a link: Spotify tracks/albums via the Spotify API,
// YouTube (and YouTube Music) via YouTube's public oEmbed info.
export const GET: RequestHandler = async ({ request, url, platform }) => {
	const denied = requireAdmin(request);
	if (denied) return denied;

	const q = (url.searchParams.get('q') || '').trim();
	try {
		const spotify = q.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|album)\/([A-Za-z0-9]{22})/);
		if (spotify) {
			const api = SpotifyApi.withAccessToken(process.env.SPOTIFY_CLIENT_ID || '', await getSpotifyAccessToken({ platform }));
			const [, type, id] = spotify;
			const item: any = type === 'track' ? await api.tracks.get(id) : await api.albums.get(id);
			const images = type === 'track' ? item.album?.images : item.images;
			return json({
				title: item.name,
				artist: item.artists.map((a: any) => a.name).join(', '),
				url: item.external_urls?.spotify ?? q,
				image: images?.[0]?.url ?? ''
			});
		}

		if (/^https?:\/\/(www\.|m\.|music\.)?(youtube\.com|youtu\.be)\//.test(q)) {
			const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(q.replace('music.youtube.com', 'www.youtube.com'))}`);
			if (!res.ok) return json({ error: "couldn't find that video" }, 404);
			const data = await res.json();
			// Music uploads are usually "Artist - Title"; otherwise use the channel as the artist.
			const [artist, title] = data.title.includes(' - ') ? data.title.split(/ - (.+)/) : [data.author_name.replace(/ - Topic$/, ''), data.title];
			return json({ title: title.trim(), artist: artist.trim(), url: q, image: data.thumbnail_url ?? '' });
		}

		return json({ error: 'paste a spotify track/album link or a youtube link' }, 400);
	} catch (error) {
		console.error('Song lookup failed:', error);
		return json({ error: `lookup failed: ${(error as Error).message}` }, 502);
	}
};
