import type { Category, DialogueEntry, TimeOfDay, WeatherKind } from './types';

// Picks what Ryo says: only lines whose category fits what just happened and whose conditions fit
// the moment (time, page, music, weather, visitor), weighted, skipping ones said recently or still
// cooling down, and only lines whose {placeholders} can be filled.

export type Trigger = 'talk' | 'greet' | 'headpat' | 'money' | 'purchase' | 'grass' | 'song' | 'sleepy' | 'annoyed' | 'ambient' | 'wake' | 'page' | 'weather';

export interface DialogueContext {
	now: Date;
	page: string;
	visitor: 'first' | 'returning';
	song: { title: string; artist: string; album: string } | null;
	weather: { kind: WeatherKind; description: string; temperature: string } | null;
	money: number;
	visits: number | null;
	headpats: number | null;
	/** Extra values for this one line, like the {item} she just bought. */
	extra?: Record<string, string>;
}

export interface DialogueMemory {
	/** Ids said lately, newest last. */
	recent: string[];
	/** id → when it was last said (ms). */
	last: Record<string, number>;
}

const TRIGGER_CATEGORIES: Record<Trigger, Category[]> = {
	talk: ['general', 'morning', 'afternoon', 'evening', 'late_night', 'music', 'no_music', 'artist', 'song', 'weather', 'page', 'rare', 'canon', 'event', 'money'],
	greet: ['first_visit', 'returning', 'event'],
	headpat: ['headpat'],
	money: ['money'],
	purchase: ['purchase'],
	grass: ['grass', 'hungry'],
	song: ['artist', 'song', 'music', 'no_music'],
	sleepy: ['sleepy'],
	annoyed: ['annoyed'],
	ambient: ['idle', 'general', 'morning', 'afternoon', 'evening', 'late_night', 'music', 'artist', 'weather', 'page', 'money', 'grass', 'rare', 'canon', 'event'],
	wake: ['sleepy'],
	page: ['page'],
	weather: ['weather']
};

export function timeOfDay(d: Date): TimeOfDay {
	const h = d.getHours();
	return h >= 5 && h < 12 ? 'morning' : h >= 12 && h < 18 ? 'afternoon' : h >= 18 && h < 22 ? 'evening' : 'night';
}

/** OpenWeather icon code (like "10d") → a kind of weather. */
export function weatherKind(icon: string): WeatherKind {
	const n = icon.slice(0, 2);
	return n === '01' ? 'clear' : n === '09' || n === '10' ? 'rain' : n === '11' ? 'storm' : n === '13' ? 'snow' : n === '50' ? 'mist' : 'clouds';
}

const PAGE_NAMES: Record<string, string> = { '/': 'the home page', '/osu': 'the osu! page', '/music': 'the music page', '/blog': 'the blog', '/guestbook': 'the guestbook', '/tournaments': 'the tournaments page', '/about': 'the about page', '/gallery': 'the gallery', '/scrapbook': 'the scrapbook', '/passport': 'the passport' };
export const pageName = (path: string) => PAGE_NAMES[path] ?? PAGE_NAMES['/' + path.split('/')[1]] ?? 'this page';

function values(ctx: DialogueContext): Record<string, string | null> {
	return {
		song: ctx.song?.title || null,
		artist: ctx.song?.artist || null,
		album: ctx.song?.album || null,
		weather: ctx.weather?.description || null,
		temperature: ctx.weather?.temperature || null,
		page: pageName(ctx.page),
		money: `¥${ctx.money.toLocaleString('en-US')}`,
		visits: ctx.visits !== null ? ctx.visits.toLocaleString('en-US') : null,
		headpats: ctx.headpats !== null ? ctx.headpats.toLocaleString('en-US') : null,
		time: ctx.now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
		...(ctx.extra ?? {})
	};
}

/** Fills {placeholders}; null if one of them has nothing to fill it with. */
export function fill(text: string, ctx: DialogueContext): string | null {
	const v = values(ctx);
	let ok = true;
	const out = text.replace(/\{(\w+)\}/g, (_, key) => {
		const value = v[key];
		if (value == null || value === '') ok = false;
		return value ?? '';
	});
	return ok ? out : null;
}

const pathMatches = (page: string, want: string) => (want === '/' ? page === '/' : page === want || page.startsWith(want + '/'));
const includes = (have: string | undefined, want: string) => !!have && have.toLowerCase().includes(want.toLowerCase());

/** Whether a line fits right now: its own conditions, plus what its category implies. */
export function fits(entry: DialogueEntry, ctx: DialogueContext): boolean {
	const c = entry.conditions;
	const time = timeOfDay(ctx.now);
	const md = `${String(ctx.now.getMonth() + 1).padStart(2, '0')}-${String(ctx.now.getDate()).padStart(2, '0')}`;
	const implied: Partial<Record<Category, boolean>> = {
		morning: time === 'morning',
		afternoon: time === 'afternoon',
		evening: time === 'evening',
		late_night: time === 'night',
		music: !!ctx.song,
		artist: !!ctx.song,
		song: !!ctx.song,
		no_music: !ctx.song,
		first_visit: ctx.visitor === 'first',
		returning: ctx.visitor === 'returning',
		weather: !!ctx.weather,
		event: !!c.date
	};
	if (implied[entry.category] === false) return false;
	if (c.time?.length && !c.time.includes(time)) return false;
	if (c.pages?.length && !c.pages.some((p) => pathMatches(ctx.page, p))) return false;
	if (c.music === 'playing' && !ctx.song) return false;
	if (c.music === 'silent' && ctx.song) return false;
	if (c.artist && !includes(ctx.song?.artist, c.artist)) return false;
	if (c.song && !includes(ctx.song?.title, c.song)) return false;
	if (c.weather?.length && (!ctx.weather || !c.weather.includes(ctx.weather.kind))) return false;
	if (c.visitor && c.visitor !== ctx.visitor) return false;
	if (c.date && c.date !== md) return false;
	return true;
}

export interface Picked {
	entry: DialogueEntry;
	text: string;
}

/**
 * One line for this trigger, or null if nothing fits. `rareChance` (0–20) is how likely rare
 * lines are; the memory is updated with what was said.
 */
export function pickLine(entries: DialogueEntry[], trigger: Trigger, ctx: DialogueContext, memory: DialogueMemory, rareChance: number, random = Math.random): Picked | null {
	const cats = TRIGGER_CATEGORIES[trigger];
	const now = ctx.now.getTime();
	const candidates: { entry: DialogueEntry; text: string; weight: number }[] = [];
	for (const entry of entries) {
		if (!entry.enabled || !cats.includes(entry.category) || !fits(entry, ctx)) continue;
		const text = fill(entry.text, ctx);
		if (text === null) continue;
		const rarity = entry.rarity === 'rare' ? rareChance / 100 : entry.rarity === 'uncommon' ? 0.35 : 1;
		// Lines made for this exact moment (page, artist, weather, a special day) win more often.
		const specific = entry.category === 'event' ? 6 : ['artist', 'song', 'page', 'weather'].includes(entry.category) ? 2.5 : 1;
		candidates.push({ entry, text, weight: Math.max(0.01, entry.weight) * rarity * specific });
	}
	if (!candidates.length) return null;
	// Not something said lately, or still cooling down, unless that's all there is.
	const fresh = candidates.filter((c) => !memory.recent.includes(c.entry.id) && now - (memory.last[c.entry.id] ?? 0) > c.entry.cooldown * 1000);
	const pool = fresh.length ? fresh : candidates.filter((c) => memory.recent[memory.recent.length - 1] !== c.entry.id);
	if (!pool.length) return null;
	let roll = random() * pool.reduce((n, c) => n + c.weight, 0);
	const chosen = pool.find((c) => (roll -= c.weight) <= 0) ?? pool[pool.length - 1];
	memory.recent = [...memory.recent.filter((id) => id !== chosen.entry.id), chosen.entry.id].slice(-10);
	memory.last = { ...memory.last, [chosen.entry.id]: now };
	return { entry: chosen.entry, text: chosen.text };
}
