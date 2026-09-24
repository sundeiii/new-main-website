import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
	const TITANIC_USER_ID = 3505;
	
	try {
		const response = await fetch(`https://api.titanic.sh/users/${TITANIC_USER_ID}`);
		
		if (!response.ok) {
			return new Response(JSON.stringify({ error: 'Failed to fetch Titanic user stats' }), {
				status: response.status,
				headers: { 'Content-Type': 'application/json' }
			});
		}
		
		const data = await response.json();
		
		return new Response(JSON.stringify(data), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		console.error('Error fetching Titanic user stats:', error);
		return new Response(JSON.stringify({ error: 'Internal server error' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
