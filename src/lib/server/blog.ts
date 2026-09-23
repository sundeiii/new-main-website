import { marked } from 'marked';
import { pool } from '$lib/server/db';

export interface BlogPost {
	id?: number;
	slug: string;
	title: string;
	excerpt: string;
	banner: string | null;
	content: string;
	published: boolean;
	date: string; // YYYY-MM-DD
}

// Posts that are hand-written Svelte pages under src/routes/blog/ rather than database rows.
export const builtInPosts = [
	{
		slug: 'welcome',
		title: 'welcome to my corner of the internet',
		date: '2026-02-10',
		excerpt: "hey, i'm sundei. welcome to my little space on the web where i dump thoughts, projects, and whatever else feels worth remembering.",
		banner: 'https://cdn.sundei.eu/banner1.png'
	}
];

let tableReady: Promise<unknown> | null = null;

export function ensureTable() {
	tableReady ??= pool
		.query(
			`CREATE TABLE IF NOT EXISTS blog_posts (
				id INT AUTO_INCREMENT PRIMARY KEY,
				slug VARCHAR(100) NOT NULL UNIQUE,
				title VARCHAR(200) NOT NULL,
				excerpt VARCHAR(500) NOT NULL DEFAULT '',
				banner VARCHAR(500) NULL,
				content MEDIUMTEXT NOT NULL,
				published TINYINT(1) NOT NULL DEFAULT 0,
				date DATE NOT NULL,
				created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
		)
		.catch((e) => {
			tableReady = null;
			throw e;
		});
	return tableReady;
}

const toDate = (d: unknown) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10));

function fromRow(row: any): BlogPost {
	return {
		id: row.id,
		slug: row.slug,
		title: row.title,
		excerpt: row.excerpt,
		banner: row.banner,
		content: row.content,
		published: !!row.published,
		date: toDate(row.date)
	};
}

/** Posts newest first. Public callers pass createTable: false so they never create the table. */
export async function listPosts({ includeDrafts = false, createTable = true } = {}): Promise<BlogPost[]> {
	if (createTable) await ensureTable();
	const [rows]: any = await pool.query(
		`SELECT * FROM blog_posts ${includeDrafts ? '' : 'WHERE published = 1'} ORDER BY date DESC, id DESC`
	);
	return rows.map(fromRow);
}

export async function getPost(slug: string, { includeDrafts = false } = {}): Promise<BlogPost | null> {
	const [rows]: any = await pool.query(`SELECT * FROM blog_posts WHERE slug = ? ${includeDrafts ? '' : 'AND published = 1'}`, [slug]);
	return rows[0] ? fromRow(rows[0]) : null;
}

// Only the admin writes posts, so raw HTML in the markdown is allowed on purpose.
export const renderMarkdown = (md: string) => marked.parse(md, { async: false, gfm: true, breaks: true }) as string;

export const slugify = (s: string) =>
	s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100);

/** Validates admin input, returning a clean post or an error message. */
export function cleanPost(input: any): BlogPost | string {
	const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
	const post: BlogPost = {
		slug: slugify(str(input?.slug) || str(input?.title)),
		title: str(input?.title),
		excerpt: str(input?.excerpt),
		banner: str(input?.banner) || null,
		content: typeof input?.content === 'string' ? input.content : '',
		published: !!input?.published,
		date: str(input?.date) || new Date().toISOString().slice(0, 10)
	};
	if (!post.title || !post.slug) return 'a title is required';
	if (!post.content.trim()) return 'the post is empty';
	if (post.title.length > 200 || post.excerpt.length > 500) return 'title (max 200) or excerpt (max 500) is too long';
	if (!/^\d{4}-\d{2}-\d{2}$/.test(post.date)) return 'date must be YYYY-MM-DD';
	if (post.banner && (post.banner.length > 500 || !/^https?:\/\//.test(post.banner))) return 'banner must be an http(s) url';
	if (builtInPosts.some((p) => p.slug === post.slug)) return `"${post.slug}" is already used by a built-in post`;
	return post;
}
