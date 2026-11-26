import type { RequestHandler } from '@sveltejs/kit';
import { json, requireAdmin } from '$lib/server/adminAuth';
import { getSetting, setSetting } from '$lib/server/settings';
import { isSettingKey, type SiteSettings } from '$lib/siteSettings';
import { isSafeGradient, themeDefaults, type Theme } from '$lib/themes';

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

const hex = (v: unknown, fallback: string) => (/^#[0-9a-f]{3,8}$/i.test(str(v, 9)) ? str(v, 9) : fallback);
const num = (v: unknown, min: number, max: number, fallback: number) => (typeof v === 'number' && isFinite(v) ? Math.round(Math.min(max, Math.max(min, v))) : fallback);
const pick = <T extends string>(v: unknown, options: readonly T[], fallback: T): T => (options.includes(v as T) ? (v as T) : fallback);
const gradient = (v: unknown) => {
	const s = str(v, 400);
	return isSafeGradient(s) ? s : '';
};

function cleanTheme(t: any, used: Set<string>): Theme | null {
	const name = str(t?.name, 30);
	if (!name) return null;
	let id = (str(t?.id, 30) || name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'theme';
	while (used.has(id)) id += '-2';
	used.add(id);
	const meshColours = list(t?.mesh, 6, (c) => (/^#[0-9a-f]{3,8}$/i.test(str(c, 9)) ? str(c, 9) : null));
	return {
		id,
		name,
		hidden: !!t?.hidden,
		secret: !!t?.secret,
		mode: pick(t?.mode, ['both', 'light', 'dark'] as const, 'both'),
		light: hex(t?.light, '#f0f3f9'),
		dark: hex(t?.dark, '#1c2128'),
		accent: hex(t?.accent, '#8FA1B3'),
		swatch: gradient(t?.swatch),
		background: pick(t?.background, ['mesh', 'solid', 'gradient', 'image'] as const, 'mesh'),
		mesh: meshColours.length >= 2 ? meshColours : themeDefaults.items[0].mesh,
		meshStrength: num(t?.meshStrength, 0, 60, 15),
		gradient: gradient(t?.gradient),
		image: urlOrPath(t?.image),
		fit: pick(t?.fit, ['cover', 'tile', 'contain'] as const, 'cover'),
		blur: num(t?.blur, 0, 40, 0),
		dim: num(t?.dim, 0, 90, 30),
		glass: num(t?.glass, 0, 100, 65),
		glassBlur: num(t?.glassBlur, 0, 40, 16),
		stripe: gradient(t?.stripe),
		trail: list(t?.trail, 2, (c) => (/^#[0-9a-f]{3,8}$/i.test(str(c, 9)) ? str(c, 9) : null))
	};
}

// Coerces admin input into the exact shape each page expects, with length limits.
const clean: { [K in keyof SiteSettings]: (v: any) => SiteSettings[K] } = {
	themes: (v) => {
		const used = new Set<string>();
		const items = list(v?.items, 30, (t) => cleanTheme(t, used));
		// Never save an empty list: the site needs at least one theme.
		const all = items.length ? items : themeDefaults.items;
		// The default must be a theme everyone can see; otherwise fall back to ryo, then the first.
		const ok = (id: unknown) => all.some((t) => t.id === id && !t.hidden && !t.secret);
		const def = ok(v?.default) ? v.default : ok(themeDefaults.default) ? themeDefaults.default : all.find((t) => !t.hidden && !t.secret)?.id ?? all[0].id;
		return { items: all, default: def };
	},
	home: (v) => {
		// Site-relative (/projects/x), http(s) or mailto links.
		const homeLinks = (items: unknown) =>
			list(items, 30, (l: any) => {
				const href = str(l?.href, 300);
				return str(l?.name, 60) && /^(https?:\/\/|mailto:|\/(?!\/))/.test(href) ? { name: str(l.name, 60), href, description: str(l?.description, 150) } : null;
			});
		const title = (t: unknown, fallback: string) => str(t, 40) || fallback;
		return {
			intro: str(v?.intro, 1000),
			wip: homeLinks(v?.wip),
			projects: homeLinks(v?.projects),
			links: homeLinks(v?.links),
			titles: {
				wip: title(v?.titles?.wip, 'wip'),
				projects: title(v?.titles?.projects, 'projects'),
				links: title(v?.titles?.links, 'links'),
				friends: title(v?.titles?.friends, 'friends')
			},
			showCurrently: v?.showCurrently !== false,
			showLatest: v?.showLatest !== false
		};
	},
	now: (v) => ({
		status: str(v?.status, 140),
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
	live: (v) => {
		const score = (x: unknown) => (typeof x === 'number' && isFinite(x) ? Math.max(0, Math.min(99, Math.round(x))) : null);
		const time = (x: unknown) => {
			const d = new Date(str(x, 40));
			return isNaN(d.getTime()) ? '' : d.toISOString();
		};
		return {
			show: !!v?.show,
			name: str(v?.name, 120),
			link: url(v?.link),
			banner: urlOrPath(v?.banner),
			stage: str(v?.stage, 60),
			twitch: str(v?.twitch, 120)
				.replace(/^https?:\/\/(www\.)?twitch\.tv\//i, '')
				.replace(/[^a-z0-9_]/gi, '')
				.slice(0, 40),
			role: str(v?.role, 60),
			note: str(v?.note, 500),
			matches: list(v?.matches, 80, (m: any) =>
				time(m?.time) && (str(m?.red, 60) || str(m?.blue, 60))
					? { time: time(m.time), stage: str(m?.stage, 60), red: str(m?.red, 60), blue: str(m?.blue, 60), redScore: score(m?.redScore), blueScore: score(m?.blueScore), mp: url(m?.mp) }
					: null
			).sort((a, b) => a.time.localeCompare(b.time))
		};
	},
	scrapbook: (v) => ({
		intro: str(v?.intro, 400),
		pages: list(v?.pages, 60, (p: any) => {
			const items = list(p?.items, 40, (i: any) => {
				const kind = pick(i?.kind, ['photo', 'note', 'ticket', 'sticker'] as const, 'note');
				const item = {
					kind,
					image: urlOrPath(i?.image),
					text: str(i?.text, 400),
					sub: str(i?.sub, 120),
					date: str(i?.date, 30),
					color: pick(i?.color, ['cream', 'blue', 'gold', 'mint', 'lavender'] as const, 'cream'),
					tilt: typeof i?.tilt === 'number' && isFinite(i.tilt) ? Math.max(-15, Math.min(15, Math.round(i.tilt))) : null,
					tape: pick(i?.tape, ['auto', 'none', 'top', 'corners', 'side'] as const, 'auto'),
					size: pick(i?.size, ['s', 'm', 'l'] as const, 'm')
				};
				// Photos need a picture; notes, tickets and built-in stickers need text.
				return kind === 'photo' ? (item.image ? item : null) : item.image || item.text ? item : null;
			});
			return str(p?.title, 80) || items.length ? { title: str(p?.title, 80), date: str(p?.date, 30), note: str(p?.note, 200), items } : null;
		})
	}),
	cozy: (v) => ({
		greeting: v?.greeting !== false,
		thoughts: list(v?.thoughts, 60, (t) => str(t, 160) || null),
		cat: v?.cat !== false,
		catName: str(v?.catName, 30) || 'mochi',
		companion: v?.companion !== false,
		companionName: str(v?.companionName, 30) || 'ryo',
		companionImage: urlOrPath(v?.companionImage),
		companionLines: list(v?.companionLines, 60, (t) => str(t, 200) || null),
		headpats: v?.headpats !== false,
		letters: [0, 1, 2].map((i) => str(v?.letters?.[i], 600)),
		nightSky: v?.nightSky !== false,
		musicBox: v?.musicBox !== false,
		seasonalTouches: v?.seasonalTouches !== false
	}),
	seasonal: (v) => ({
		snow: pick(v?.snow, ['auto', 'on', 'off'] as const, 'auto'),
		birthday: /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(str(v?.birthday, 5)) ? str(v.birthday, 5) : '',
		birthdayText: str(v?.birthdayText, 120),
		newYear: v?.newYear !== false
	}),
	links: (v) => ({
		intro: str(v?.intro, 300),
		groups: list(v?.groups, 12, (g: any) => {
			const items = list(g?.items, 30, (l: any) => {
				const href = str(l?.href, 500);
				return str(l?.label, 60) && /^(https?:\/\/|mailto:|\/(?!\/))/.test(href)
					? { label: str(l.label, 60), href, handle: str(l?.handle, 80), note: str(l?.note, 150) }
					: null;
			});
			return str(g?.title, 60) || items.length ? { title: str(g?.title, 60), items } : null;
		})
	}),
	status: (v) => ({
		show: v?.show !== false,
		title: str(v?.title, 60) || 'running right now',
		items: list(v?.items, 12, (s: any) =>
			str(s?.name, 60) && url(s?.check)
				? { name: str(s.name, 60), link: url(s?.link), check: url(s.check), players: url(s?.players), note: str(s?.note, 150) }
				: null
		)
	}),
	weather: (v) => ({
		show: v?.show !== false,
		city: str(v?.city, 80) || 'Tartu',
		label: str(v?.label, 30),
		units: v?.units === 'f' ? 'f' : 'c'
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
		mine: { image: urlOrPath(v?.mine?.image), alt: str(v?.mine?.alt, 100) },
		webring: { name: str(v?.webring?.name, 60), home: url(v?.webring?.home), prev: url(v?.webring?.prev), next: url(v?.webring?.next) }
	}),
	about: (v) => {
		const spec = (s: any) =>
			str(s?.label, 50) || str(s?.value, 100) ? { label: str(s?.label, 50), value: str(s?.value, 100), sub: str(s?.sub, 150), image: urlOrPath(s?.image) } : null;
		return {
			bio: str(v?.bio, 5000),
			affiliations: list(v?.affiliations, 20, (a) => {
				const u = str(a?.url, 300);
				return str(a?.name, 80)
					? { name: str(a.name, 80), role: str(a?.role, 80), note: str(a?.note, 200), url: /^https?:\/\//.test(u) ? u : '', since: str(a?.since, 40) }
					: null;
			}),
			pcBuild: list(v?.pcBuild, 30, spec),
			peripherals: list(v?.peripherals, 30, spec),
			languages: list(v?.languages, 30, (l) =>
				str(l?.name, 40) ? { name: str(l.name, 40), color: /^#[0-9a-f]{3,8}$/i.test(str(l?.color, 9)) ? str(l.color, 9) : '#888888' } : null
			),
			interestsTitle: str(v?.interestsTitle, 40) || 'things i like',
			interests: list(v?.interests, 30, (i) => str(i, 60) || null),
			software: list(v?.software, 40, (s) => (str(s?.label, 40) && str(s?.value, 100) ? { label: str(s.label, 40), value: str(s.value, 100), sub: str(s?.sub, 150) } : null)),
			links: list(v?.links, 20, (l) => {
				const u = str(l?.url, 300);
				return str(l?.label, 40) && /^(https?:\/\/|mailto:)/.test(u) ? { label: str(l.label, 40), url: u } : null;
			})
		};
	},
	aboutAlt: (v) => ({ bio: str(v?.bio, 5000) }),
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
