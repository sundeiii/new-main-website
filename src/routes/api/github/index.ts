import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
	const GITHUB_USERNAME = 'sundeiii';
	
	try {
		const [userResponse, reposResponse] = await Promise.all([
			fetch(`https://api.github.com/users/${GITHUB_USERNAME}`),
			fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100`)
		]);
		
		if (!userResponse.ok || !reposResponse.ok) {
			return new Response(JSON.stringify({ error: 'Failed to fetch GitHub stats' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			});
		}
		
		const userData = await userResponse.json();
		const reposData = await reposResponse.json();
		
		const totalStars = reposData.reduce((sum: number, repo: any) => sum + repo.stargazers_count, 0);
		const totalForks = reposData.reduce((sum: number, repo: any) => sum + repo.forks_count, 0);
		
		return new Response(JSON.stringify({
			repos: userData.public_repos,
			stars: totalStars,
			forks: totalForks,
			followers: userData.followers,
			following: userData.following
		}), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		console.error('Error fetching GitHub stats:', error);
		return new Response(JSON.stringify({ error: 'Internal server error' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
