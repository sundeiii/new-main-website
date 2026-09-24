import { marked } from 'marked';
import { ensureSchema, sql } from '$lib/server/db';

// One table holds blog posts, events (/events) and project pages (/projects), told apart by kind.
export const KINDS = ['post', 'event', 'project'] as const;
export type Kind = typeof KINDS[number];
export const isKind = (k: unknown): k is Kind => (KINDS as readonly unknown[]).includes(k);

export interface BlogPost {
	id?: number;
	kind: Kind;
	slug: string;
	title: string;
	excerpt: string;
	banner: string | null;
	content: string;
	published: boolean;
	date: string; // YYYY-MM-DD; for events, the day it starts
	endDate: string | null; // events that last several days (YYYY-MM-DD)
	location: string | null; // events
	link: string | null; // projects: repo or live site
}

// Posts that are hand-written Svelte pages under src/routes/blog/ rather than database rows.
export const builtInPosts = [
	{
		kind: 'post' as const,
		slug: 'welcome',
		title: 'welcome to my corner of the internet',
		date: '2026-02-10',
		excerpt: "hey, i'm sundei. welcome to my little space on the web where i dump thoughts, projects, and whatever else feels worth remembering.",
		banner: 'https://cdn.doitforjanice.eu/blog/banner-43f288.webp',
		endDate: null,
		location: null,
		link: null
	}
];

export const ensureTable = ensureSchema;

const toDate = (d: unknown) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10));

function fromRow(row: any): BlogPost {
	return {
		id: row.id,
		kind: isKind(row.kind) ? row.kind : 'post',
		slug: row.slug,
		title: row.title,
		excerpt: row.excerpt,
		banner: row.banner,
		content: row.content,
		published: !!row.published,
		date: toDate(row.date),
		endDate: row.end_date ? toDate(row.end_date) : null,
		location: row.location ?? null,
		link: row.link ?? null
	};
}

/**
 * Newest first. Public callers pass createTable: false so they never create or change the table;
 * if it predates the kind column, every row counts as a blog post.
 */
export async function listPosts({ kind, includeDrafts = false, createTable = true }: { kind?: Kind; includeDrafts?: boolean; createTable?: boolean } = {}) {
	if (createTable) await ensureTable();
	const rows = await sql(
		`SELECT * FROM blog_posts ${includeDrafts ? '' : 'WHERE published = 1'} ORDER BY date DESC, id DESC`
	);
	const posts: BlogPost[] = rows.map(fromRow);
	return kind ? posts.filter((p) => p.kind === kind) : posts;
}

export async function getPost(slug: string, kind: Kind, { includeDrafts = false } = {}): Promise<BlogPost | null> {
	const rows = await sql(`SELECT * FROM blog_posts WHERE slug = ? ${includeDrafts ? '' : 'AND published = 1'}`, [slug]);
	const post = rows[0] ? fromRow(rows[0]) : null;
	return post?.kind === kind ? post : null;
}

// Only the admin writes posts, so raw HTML in the markdown is allowed on purpose.
export const renderMarkdown = (md: string) => marked.parse(md, { async: false, gfm: true, breaks: true }) as string;

export const slugify = (s: string) =>
	s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100);

/** Validates admin input, returning a clean post or an error message. */
export function cleanPost(input: any): BlogPost | string {
	const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
	const post: BlogPost = {
		kind: isKind(input?.kind) ? input.kind : 'post',
		slug: slugify(str(input?.slug) || str(input?.title)),
		title: str(input?.title),
		excerpt: str(input?.excerpt),
		banner: str(input?.banner) || null,
		content: typeof input?.content === 'string' ? input.content : '',
		published: !!input?.published,
		date: str(input?.date) || new Date().toISOString().slice(0, 10),
		endDate: str(input?.endDate) || null,
		location: str(input?.location) || null,
		link: str(input?.link) || null
	};
	if (!post.title || !post.slug) return 'a title is required';
	if (!post.content.trim() && post.kind === 'post') return 'the post is empty';
	if (post.title.length > 200 || post.excerpt.length > 500) return 'title (max 200) or excerpt (max 500) is too long';
	if (!/^\d{4}-\d{2}-\d{2}$/.test(post.date)) return 'date must be YYYY-MM-DD';
	if (post.endDate && (!/^\d{4}-\d{2}-\d{2}$/.test(post.endDate) || post.endDate < post.date)) return 'end date must be on or after the start date';
	if (post.kind !== 'event') post.endDate = null;
	for (const [name, value] of [['banner', post.banner], ['link', post.link]] as const) {
		if (value && (value.length > 500 || !/^https?:\/\//.test(value))) return `${name} must be an http(s) url`;
	}
	if ((post.location?.length ?? 0) > 200) return 'location is too long';
	if (builtInPosts.some((p) => p.slug === post.slug)) return `"${post.slug}" is already used by a built-in post`;
	return post;
}

/** Public URL of a post, event or project. */
export const postPath = (p: { kind: Kind; slug: string }) => `/${p.kind === 'post' ? 'blog' : p.kind === 'event' ? 'events' : 'projects'}/${p.slug}`;
