export async function GET() {
	const username = 'sundeiii';

	try {
		// Scrape the contributions from GitHub's public profile page
		const response = await fetch(`https://github.com/users/${username}/contributions`, {
			headers: {
				'Accept': 'text/html'
			}
		});

		if (!response.ok) {
			throw new Error('Failed to fetch GitHub contributions');
		}

		const html = await response.text();

		// Parse contribution data from the SVG/table
		const days: { date: string; count: number; level: number }[] = [];

		// Match tool-tip td elements with data-date and data-level
		const cellRegex = /data-date="(\d{4}-\d{2}-\d{2})"[^>]*data-level="(\d)"/g;
		let match;

		while ((match = cellRegex.exec(html)) !== null) {
			const date = match[1];
			const level = parseInt(match[2]);

			// Extract count from nearby text
			const countMatch = html.slice(Math.max(0, match.index - 200), match.index + 200)
				.match(/(\d+) contributions?/);
			const count = countMatch ? parseInt(countMatch[1]) : (level > 0 ? level : 0);

			days.push({ date, count, level });
		}

		// If regex didn't match, try alternative format
		if (days.length === 0) {
			const altRegex = /data-date="(\d{4}-\d{2}-\d{2})".*?data-level="(\d)".*?>([\s\S]*?)<\/td>/g;
			while ((match = altRegex.exec(html)) !== null) {
				const date = match[1];
				const level = parseInt(match[2]);
				const inner = match[3];
				const countMatch = inner.match(/(\d+)/);
				const count = countMatch ? parseInt(countMatch[1]) : (level > 0 ? level : 0);
				days.push({ date, count, level });
			}
		}

		// Calculate total
		const totalContributions = days.reduce((sum, d) => sum + d.count, 0);

		return {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=3600'
			},
			body: JSON.stringify({
				days,
				total: totalContributions
			})
		};
	} catch (error: any) {
		return {
			status: 500,
			body: JSON.stringify({ error: error.message })
		};
	}
}
