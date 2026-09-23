import { getOsuToken as getToken } from '$lib/server/osuApi';

function extractTitle(query: string): string {
	const withoutArtist = query.includes(' - ') ? query.split(' - ').slice(1).join(' - ') : query;
	const withoutRemixer = withoutArtist.replace(/\s*\([^)]*\)\s*$/, '').trim();
	return withoutRemixer || withoutArtist;
}

export async function GET({ url }: any) {
	const query = url.searchParams.get('q');
	const difficulty = url.searchParams.get('difficulty') || '';

	if (!query) {
		return new Response(JSON.stringify({ url: null }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	try {
		const token = await getToken();
		const headers = {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
			Accept: 'application/json'
		};

		const title = extractTitle(query);

		const searchRes = await fetch(
			`https://osu.ppy.sh/api/v2/beatmapsets/search?q=${encodeURIComponent(title)}`,
			{ headers }
		);


		if (!searchRes.ok) {
			const errText = await searchRes.text();
			console.error('search error:', errText.slice(0, 300));
			return new Response(JSON.stringify({ url: null }), {
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const searchData = await searchRes.json();
		const beatmapsets = searchData.beatmapsets ?? [];

		if (!beatmapsets.length) {
			return new Response(JSON.stringify({ url: null }), {
				headers: { 'Content-Type': 'application/json' }
			});
		}

		let matchedSet: any = null;
		let matchedBeatmap: any = null;

		// Exact difficulty match
		for (const set of beatmapsets) {
			const found = set.beatmaps?.find(
				(b: any) => b.version?.toLowerCase() === difficulty.toLowerCase()
			);
			if (found) {
				matchedSet = set;
				matchedBeatmap = found;
				break;
			}
		}

		// Partial match
		if (!matchedSet) {
			for (const set of beatmapsets) {
				const found = set.beatmaps?.find(
					(b: any) =>
						b.version?.toLowerCase().includes(difficulty.toLowerCase()) ||
						difficulty.toLowerCase().includes(b.version?.toLowerCase())
				);
				if (found) {
					matchedSet = set;
					matchedBeatmap = found;
					break;
				}
			}
		}

		// Fallback
		if (!matchedSet) {
			matchedSet = beatmapsets[0];
			matchedBeatmap = beatmapsets[0].beatmaps?.[0];
		}

		const beatmapUrl = matchedBeatmap
			? `https://osu.ppy.sh/beatmapsets/${matchedSet.id}#osu/${matchedBeatmap.id}`
			: `https://osu.ppy.sh/beatmapsets/${matchedSet.id}`;


		return new Response(JSON.stringify({ url: beatmapUrl }), {
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=60, s-maxage=300'
			}
		});
	} catch (error) {
		console.error('osu! API error:', error);
		return new Response(JSON.stringify({ url: null }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}