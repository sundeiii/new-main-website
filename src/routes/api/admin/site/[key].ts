import type { RequestHandler } from '@sveltejs/kit';
import { json, requireAdmin } from '$lib/server/adminAuth';
import { getSetting, setSetting } from '$lib/server/settings';
import { isSettingKey, type SiteSettings } from '$lib/siteSettings';

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const url = (v: unknown) => {
	const s = str(v, 500);
	return /^https?:\/\//.test(s) ? s : '';
};
// Also allows files in the site's own static folder, like /skins/preview.jpg.
const urlOrPath = (v: unknown) => {
	const s = str(v, 500);
	return /^(https?:\/\/|\/(?!\/))/.test(s) ? s : '';
};
const list = <T>(v: unknown, max: number, item: (x: any) => T | null): T[] =>
	(Array.isArray(v) ? v : []).slice(0, max).map(item).filter((x): x is T => x !== null);

// Coerces admin input into the exact shape each page expects, with length limits.
const clean: { [K in keyof SiteSettings]: (v: any) => SiteSettings[K] } = {
	home: (v) => ({ intro: str(v?.intro, 1000) }),
	now: (v) => ({
		updated: str(v?.updated, 50),
		sections: list(v?.sections, 20, (s) => {
			const title = str(s?.title, 50);
			return title ? { icon: str(s?.icon, 8), title, items: list(s?.items, 30, (i) => str(i, 200) || null) } : null;
		})
	}),
	osu: (v) => ({
		username: str(v?.username, 30) || 'sodanator',
		intro: str(v?.intro, 3000),
		showStats: v?.showStats !== false,
		maps: list(v?.maps, 50, (m) =>
			str(m?.title, 200) && url(m?.url)
				? {
						title: str(m.title, 200),
						url: url(m.url),
						note: str(m?.note, 300),
						cover: url(m?.cover),
						mapper: str(m?.mapper, 50),
						stars: typeof m?.stars === 'number' && isFinite(m.stars) ? Math.round(m.stars * 100) / 100 : null
				  }
				: null
		),
		achievements: list(v?.achievements, 50, (a) => (str(a?.text, 300) ? { date: str(a?.date, 20), text: str(a.text, 300) } : null))
	}),
	music: (v) => ({
		design: v?.design === 'cards' ? 'cards' : 'list',
		songOfTheMonth:
			v?.songOfTheMonth && str(v.songOfTheMonth.title, 200)
				? {
						title: str(v.songOfTheMonth.title, 200),
						artist: str(v.songOfTheMonth.artist, 200),
						url: url(v.songOfTheMonth.url),
						image: url(v.songOfTheMonth.image),
						note: str(v.songOfTheMonth.note, 500)
				  }
				: null,
		notes: str(v?.notes, 3000),
		hiddenArtists: list(v?.hiddenArtists, 50, (a) => str(a, 100) || null)
	}),
	gallery: (v) => ({
		albums: list(v?.albums, 30, (a) => {
			const title = str(a?.title, 60);
			if (!title) return null;
			const slug = (str(a?.slug, 40) || title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'album';
			return {
				slug,
				title,
				description: str(a?.description, 500),
				photos: list(a?.photos, 300, (p) => (urlOrPath(p?.src) ? { src: urlOrPath(p.src), caption: str(p?.caption, 200), date: str(p?.date, 20) } : null))
			};
		})
	}),
	buttons: (v) => ({
		items: list(v?.items, 60, (b) =>
			urlOrPath(b?.image) ? { image: urlOrPath(b.image), href: url(b?.href), alt: str(b?.alt, 100), pixelated: !!b?.pixelated } : null
		),
		mine: { image: urlOrPath(v?.mine?.image), alt: str(v?.mine?.alt, 100) }
	}),
	about: (v) => {
		const spec = (s: any) =>
			str(s?.label, 50) || str(s?.value, 100) ? { label: str(s?.label, 50), value: str(s?.value, 100), sub: str(s?.sub, 150), image: urlOrPath(s?.image) } : null;
		return {
			bio: str(v?.bio, 5000),
			pcBuild: list(v?.pcBuild, 30, spec),
			peripherals: list(v?.peripherals, 30, spec),
			languages: list(v?.languages, 30, (l) =>
				str(l?.name, 40) ? { name: str(l.name, 40), color: /^#[0-9a-f]{3,8}$/i.test(str(l?.color, 9)) ? str(l.color, 9) : '#888888' } : null
			),
			interests: list(v?.interests, 30, (i) => str(i, 60) || null),
			links: list(v?.links, 20, (l) => {
				const u = str(l?.url, 300);
				return str(l?.label, 40) && /^(https?:\/\/|mailto:)/.test(u) ? { label: str(l.label, 40), url: u } : null;
			})
		};
	},
	skins: (v) => ({
		items: list(v?.items, 50, (s) =>
			str(s?.name, 100)
				? {
						name: str(s.name, 100),
						author: str(s?.author, 100),
						description: str(s?.description, 1000),
						preview: urlOrPath(s?.preview),
						screenshots: list(s?.screenshots, 30, (u) => urlOrPath(u) || null),
						download: urlOrPath(s?.download)
				  }
				: null
		)
	})
};

export const GET: RequestHandler = async ({ request, params }) => {
	const denied = requireAdmin(request);
	if (denied) return denied;
	if (!isSettingKey(params.key)) return json({ error: 'Unknown key' }, 404);
	return json(await getSetting(params.key, { createTable: true }));
};

export const PUT: RequestHandler = async ({ request, params }) => {
	const denied = requireAdmin(request);
	if (denied) return denied;
	const key = params.key;
	if (!isSettingKey(key)) return json({ error: 'Unknown key' }, 404);

	const value = clean[key](await request.json().catch(() => ({})));
	await setSetting(key, value as any);
	return json(value);
};
