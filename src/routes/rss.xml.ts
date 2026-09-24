import type { RequestHandler } from '@sveltejs/kit';
import { isMissingTable } from '$lib/server/db';
import { builtInPosts, listPosts, postPath } from '$lib/server/blog';

const SITE = 'https://sundei.ee';

const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!));

// RSS feed of blog posts and events, for feed readers (and old-web vibes).
export const GET: RequestHandler = async () => {
	let items: { kind: 'post' | 'event' | 'project'; slug: string; title: string; excerpt: string; date: string }[] = [...builtInPosts];
	try {
		const posts = await listPosts({ createTable: false });
		items.push(...posts.filter((p) => p.kind !== 'project'));
	} catch (error: any) {
		if (!isMissingTable(error)) console.error('RSS: failed to load posts:', error);
	}
	items = items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 50);

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
	<title>sundei</title>
	<link>${SITE}</link>
	<description>blog posts and events from sundei.ee</description>
	<language>en</language>
	<atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml" />
${items
	.map((p) => {
		const link = SITE + postPath(p);
		return `	<item>
		<title>${esc(p.kind === 'event' ? `📍 ${p.title}` : p.title)}</title>
		<link>${link}</link>
		<guid>${link}</guid>
		<pubDate>${new Date(p.date + 'T12:00:00Z').toUTCString()}</pubDate>
		<description>${esc(p.excerpt || '')}</description>
		<category>${p.kind === 'event' ? 'event' : 'blog'}</category>
	</item>`;
	})
	.join('\n')}
</channel>
</rss>`;

	return new Response(xml, {
		headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=600' }
	});
};
