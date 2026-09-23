import type { RequestHandler } from '@sveltejs/kit';
import { builtInPosts, listPosts } from '$lib/server/blog';

// Published posts for the /blog list (no content), merged with the hand-written built-in posts.
export const GET: RequestHandler = async () => {
	let posts: { slug: string; title: string; date: string; excerpt: string; banner: string | null }[] = [];
	try {
		posts = (await listPosts({ createTable: false })).map(({ slug, title, date, excerpt, banner }) => ({ slug, title, date, excerpt, banner }));
	} catch (error) {
		// Table not created yet (nothing written in the admin panel), or the database is down.
		console.error('Failed to load blog posts:', error);
	}
	const all = [...posts, ...builtInPosts].sort((a, b) => b.date.localeCompare(a.date));
	return new Response(JSON.stringify(all), { headers: { 'Content-Type': 'application/json' } });
};
