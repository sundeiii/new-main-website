import { companionDefaults } from '$lib/companion/defaults';
import { CATEGORIES, EXPRESSIONS, RARITIES, TIMES, WEATHERS, type CompanionSettings, type DialogueEntry, type Purchase } from '$lib/companion/types';

// Cleans what /admin → ryo saves (and JSON imports): known keys only, sane lengths and ranges,
// no HTML in anything she says.

// Invisible control characters out (newlines and tabs stay).
const printable = (s: string) => [...s].filter((ch) => ch === '\n' || ch === '\t' || ch.charCodeAt(0) >= 32).join('');
const text = (v: unknown, max: number) => (typeof v === 'string' ? printable(v.replace(/<[^>]*>/g, '')).trim().slice(0, max) : '');
const num = (v: unknown, min: number, max: number, fallback: number) => (typeof v === 'number' && isFinite(v) ? Math.round(Math.min(max, Math.max(min, v))) : fallback);
const pick = <T extends string>(v: unknown, options: readonly T[], fallback: T): T => (options.includes(v as T) ? (v as T) : fallback);
const picture = (v: unknown) => {
	const s = text(v, 500);
	return /^(https?:\/\/|\/(?!\/))/.test(s) && !/["'<>\s]/.test(s) ? s : '';
};
const listOf = <T extends string>(v: unknown, options: readonly T[]) => (Array.isArray(v) ? [...new Set(v.filter((x): x is T => options.includes(x)))] : []);
const id = (v: unknown, fallback: string) => text(v, 60).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-|-$/g, '') || fallback;

function cleanEntry(e: any, i: number, used: Set<string>): DialogueEntry | null {
	const body = text(e?.text, 300);
	if (!body) return null;
	let key = id(e?.id, `line-${i + 1}`);
	while (used.has(key)) key += '-2';
	used.add(key);
	const c = e?.conditions ?? {};
	const date = text(c.date, 5);
	const s = e?.source;
	const category = pick(e?.category, CATEGORIES, 'general');
	return {
		id: key,
		text: body,
		category,
		expression: pick(e?.expression, EXPRESSIONS, 'default'),
		weight: num(e?.weight, 1, 100, 10),
		rarity: pick(e?.rarity, RARITIES, 'common'),
		conditions: {
			...(listOf(c.time, TIMES).length ? { time: listOf(c.time, TIMES) } : {}),
			...(Array.isArray(c.pages) && c.pages.length ? { pages: c.pages.map((p: unknown) => text(p, 80)).filter((p: string) => p.startsWith('/')).slice(0, 10) } : {}),
			...(c.music === 'playing' || c.music === 'silent' ? { music: c.music } : {}),
			...(text(c.artist, 80) ? { artist: text(c.artist, 80) } : {}),
			...(text(c.song, 120) ? { song: text(c.song, 120) } : {}),
			...(listOf(c.weather, WEATHERS).length ? { weather: listOf(c.weather, WEATHERS) } : {}),
			...(c.visitor === 'first' || c.visitor === 'returning' ? { visitor: c.visitor } : {}),
			...(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(date) ? { date } : {})
		},
		cooldown: num(e?.cooldown, 0, 86400, 300),
		// Only the canon category carries an anime source, so original lines can't be passed off as quotes.
		source:
			category === 'canon' && s && text(s.anime, 80)
				? { anime: text(s.anime, 80), episode: num(s.episode, 0, 999, 0), speaker: text(s.speaker, 60), url: picture(s.url), translation: text(s.translation, 200) }
				: null,
		enabled: e?.enabled !== false
	};
}

function cleanPurchase(p: any, i: number): Purchase | null {
	const item = text(p?.item, 80);
	if (!item) return null;
	return {
		id: id(p?.id, `item-${i + 1}`),
		item,
		price: num(p?.price, 1, 1_000_000, 1000),
		kind: pick(p?.kind, ['bass', 'pedal', 'amp', 'strings', 'album', 'food'] as const, 'pedal'),
		line: text(p?.line, 200)
	};
}

export function cleanCompanion(v: any): CompanionSettings {
	const d = companionDefaults;
	const used = new Set<string>();
	const b = v?.behaviour ?? {};
	const it = v?.interactions ?? {};
	const a = v?.achievements ?? {};
	return {
		enabled: v?.enabled !== false,
		name: text(v?.name, 30) || d.name,
		subtitle: text(v?.subtitle, 80),
		sprites: Object.fromEntries(EXPRESSIONS.map((e) => [e, picture(v?.sprites?.[e]) || (e === 'default' ? d.sprites.default : '')])) as CompanionSettings['sprites'],
		credits: Object.fromEntries(EXPRESSIONS.map((e) => [e, text(v?.credits?.[e], 200)])) as CompanionSettings['credits'],
		size: num(v?.size, 64, 220, d.size),
		position: pick(v?.position, ['bottom-right', 'bottom-left'] as const, d.position),
		draggable: v?.draggable !== false,
		opacity: num(v?.opacity, 30, 100, d.opacity),
		animation: num(v?.animation, 0, 100, d.animation),
		bubble: pick(v?.bubble, ['auto', 'left', 'right'] as const, 'auto'),
		typewriter: v?.typewriter !== false,
		pages: pick(v?.pages, ['home', 'all'] as const, d.pages),
		desktop: v?.desktop !== false,
		mobile: !!v?.mobile,
		behaviour: {
			idle: b.idle !== false,
			autoTalk: pick(b.autoTalk, ['off', 'rare', 'normal'] as const, d.behaviour.autoTalk),
			sleepAfter: num(b.sleepAfter, 0, 120, d.behaviour.sleepAfter),
			sleepFor: num(b.sleepFor, 1, 240, d.behaviour.sleepFor),
			music: b.music !== false,
			weather: b.weather !== false,
			pageReactions: b.pageReactions !== false,
			annoyAfter: num(b.annoyAfter, 2, 50, d.behaviour.annoyAfter),
			rareChance: num(b.rareChance, 0, 20, d.behaviour.rareChance)
		},
		interactions: {
			headpats: it.headpats !== false,
			money: it.money !== false,
			grass: it.grass !== false,
			song: it.song !== false,
			sleep: it.sleep !== false,
			stats: it.stats !== false,
			donation: num(it.donation, 1, 100_000, d.interactions.donation),
			cooldown: num(it.cooldown, 0, 60, d.interactions.cooldown)
		},
		achievements: {
			enabled: a.enabled !== false,
			donated: num(a.donated, 100, 10_000_000, d.achievements.donated),
			grass: num(a.grass, 1, 1000, d.achievements.grass),
			clicks: num(a.clicks, 3, 500, d.achievements.clicks),
			headpats: num(a.headpats, 1, 10_000, d.achievements.headpats),
			days: num(a.days, 2, 365, d.achievements.days),
			minutes: num(a.minutes, 1, 600, d.achievements.minutes)
		},
		purchases: (Array.isArray(v?.purchases) ? v.purchases : []).slice(0, 30).map(cleanPurchase).filter((p: Purchase | null): p is Purchase => !!p),
		dialogue: (Array.isArray(v?.dialogue) ? v.dialogue : []).slice(0, 1000).map((e: any, i: number) => cleanEntry(e, i, used)).filter((e: DialogueEntry | null): e is DialogueEntry => !!e)
	};
}
