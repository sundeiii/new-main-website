import type { RequestHandler } from '@sveltejs/kit';
import satori from 'satori';
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import { readFile } from 'fs/promises';
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { getPost, isKind } from '$lib/server/blog';
import { getSetting } from '$lib/server/settings';
import { themeDefaults, type Theme } from '$lib/themes';

// The link-preview picture for any page: /og?path=/now. A 1200×630 card with the page's title
// in the site's font and default theme. Posts, events and projects with a banner use the banner
// itself instead (see PostPage); this draws the card for everything else.
// No native modules (satori + resvg's WebAssembly build), so it runs anywhere.

const PAGES: Record<string, [string, string]> = {
	'/': ['sundei', 'osu! tournaments, IT garbage, music & whatever else'],
	'/about': ['about', 'a bit more about me'],
	'/blog': ['blog', 'posts, sometimes'],
	'/events': ['events', 'lans, tournaments and things i go to'],
	'/projects': ['projects', "questionable little things i've made"],
	'/tournaments': ['tournaments', "osu! tournaments i've helped staff"],
	'/osu': ['osu!', 'stats, maps i love, achievements'],
	'/music': ['music', "what i've been listening to"],
	'/now': ['now', "what i'm up to these days"],
	'/uses': ['uses', 'the stuff i use every day'],
	'/gallery': ['gallery', 'photos'],
	'/guestbook': ['guestbook', 'leave a message!'],
	'/skins': ['skins', 'osu! skins'],
	'/changelog': ['changelog', "what's new on the site"],
	'/stats': ['stats', 'numbers about this site']
};

// The font is fetched from the site itself once per server instance (it's in /static).
let font: Promise<ArrayBuffer> | null = null;
const loadFont = (origin: string) =>
	(font ??= fetch(`${origin}/CaskaydiaCoveNerdFontCompleteM-.ttf`).then((r) => {
		if (!r.ok) throw new Error(`font ${r.status}`);
		return r.arrayBuffer();
	})).catch((e) => {
		font = null;
		throw e;
	});

// The renderer's .wasm, read from its package folder (scripts/copy-resvg-wasm.cjs puts it there
// in the Vercel build).
let wasmReady: Promise<void> | null = null;
const loadWasm = () =>
	(wasmReady ??= readFile(join(dirname(createRequire(import.meta.url).resolve('@resvg/resvg-wasm')), 'index_bg.wasm')).then((bytes) => initWasm(bytes))).catch(
		(e) => {
			// "Already initialized" is fine (a second request raced the first).
			if (!/already/i.test(String(e?.message ?? e))) {
				wasmReady = null;
				throw e;
			}
		}
	);

async function describe(path: string): Promise<{ title: string; sub: string; kicker: string }> {
	const detail = path.match(/^\/(blog|events|projects)\/([^/?#]+)$/);
	if (detail) {
		const kind = ({ blog: 'post', events: 'event', projects: 'project' } as const)[detail[1] as 'blog' | 'events' | 'projects'];
		if (isKind(kind)) {
			const post = await getPost(decodeURIComponent(detail[2]), kind).catch(() => null);
			if (post) return { title: post.title, sub: post.excerpt || '', kicker: detail[1] === 'blog' ? 'blog' : detail[1] };
		}
	}
	const known = PAGES[path.replace(/\/$/, '') || '/'];
	if (known) return { title: known[0], sub: known[1], kicker: '' };
	return { title: path.split('/').filter(Boolean).pop()?.replace(/[-_]/g, ' ') || 'sundei', sub: '', kicker: '' };
}

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);

export const GET: RequestHandler = async ({ url }) => {
	const path = (url.searchParams.get('path') || '/').slice(0, 200);
	try {
		const [fontData, info, themes] = await Promise.all([loadFont(url.origin), describe(path), getSetting('themes'), loadWasm()]);
		const theme: Theme = themes.items.find((t) => t.id === themes.default) ?? themeDefaults.items.find((t) => t.id === 'ryo') ?? themes.items[0];
		const accent = theme.accent;
		const bg = theme.dark;

		// satori takes a React-like element tree; plain objects work without JSX.
		const el = (type: string, style: Record<string, unknown>, children?: unknown, extra: Record<string, unknown> = {}) => ({ type, props: { style, children, ...extra } });
		const title = clip(info.title, 70);
		const tree = el(
			'div',
			{ width: 1200, height: 630, display: 'flex', position: 'relative', background: bg, fontFamily: 'Cascadia', color: '#fff' },
			[
				// A soft glow of the accent colour in two corners.
				el('div', {
					position: 'absolute',
					top: 0,
					left: 0,
					width: 1200,
					height: 630,
					display: 'flex',
					backgroundImage: `radial-gradient(circle at 85% 15%, ${accent}66 0%, transparent 45%), radial-gradient(circle at 10% 100%, ${accent}40 0%, transparent 50%)`
				}),
				el('div', { position: 'absolute', top: 0, left: 0, width: 1200, height: 10, display: 'flex', background: accent }),
				el(
					'div',
					{ position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '70px 80px', width: '100%' },
					[
						el('div', { display: 'flex', fontSize: 28, color: accent, letterSpacing: 4, textTransform: 'uppercase' }, info.kicker),
						el('div', { display: 'flex', flexDirection: 'column', gap: 22 }, [
							el('div', { display: 'flex', fontSize: title.length > 40 ? 64 : 84, lineHeight: 1.1, maxWidth: 1000 }, title),
							info.sub ? el('div', { display: 'flex', fontSize: 30, color: 'rgba(255,255,255,0.72)', maxWidth: 950, lineHeight: 1.35 }, clip(info.sub, 140)) : null
						]),
						el('div', { display: 'flex', alignItems: 'center', gap: 16, fontSize: 28, color: 'rgba(255,255,255,0.8)' }, [
							el('div', { width: 18, height: 18, borderRadius: 9, background: accent, display: 'flex' }),
							'sundei.ee'
						])
					]
				)
			]
		);
		const svg = await satori(tree as any, { width: 1200, height: 630, fonts: [{ name: 'Cascadia', data: fontData, weight: 400, style: 'normal' }] });
		const out = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
		return new Response(out, {
			headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800' }
		});
	} catch (error) {
		console.error('Failed to make the preview image:', error);
		return new Response('Could not make the image', { status: 500 });
	}
};
