// Ryo, the site companion: states, expressions, dialogue entries and her settings (saved as the
// `companion` site setting, edited in /admin → ryo).

export const STATES = [
	'idle',
	'talking',
	'happy',
	'sleepy',
	'sleeping',
	'hungry',
	'annoyed',
	'thinking',
	'listening',
	'playing_bass',
	'embarrassed',
	'surprised',
	'receiving_headpat',
	'receiving_money',
	'eating_grass',
	'sad'
] as const;
export type CompanionState = (typeof STATES)[number];

/** Each expression can have its own picture; without one, the default picture is used. */
export const EXPRESSIONS = ['default', 'talking', 'happy', 'sleepy', 'sleeping', 'annoyed', 'hungry', 'eating', 'music', 'listening', 'embarrassed', 'thinking', 'surprised', 'sad', 'money', 'headpat'] as const;
export type Expression = (typeof EXPRESSIONS)[number];

/** Which picture each state shows. */
export const STATE_EXPRESSION: Record<CompanionState, Expression> = {
	idle: 'default',
	talking: 'talking',
	happy: 'happy',
	sleepy: 'sleepy',
	sleeping: 'sleeping',
	hungry: 'hungry',
	annoyed: 'annoyed',
	thinking: 'thinking',
	listening: 'listening',
	playing_bass: 'music',
	embarrassed: 'embarrassed',
	surprised: 'surprised',
	receiving_headpat: 'headpat',
	receiving_money: 'money',
	eating_grass: 'eating',
	sad: 'sad'
};
/** And the state an expression puts her in while she says a line. */
export const EXPRESSION_STATE: Record<Expression, CompanionState> = {
	default: 'talking',
	talking: 'talking',
	happy: 'happy',
	sleepy: 'sleepy',
	sleeping: 'sleeping',
	annoyed: 'annoyed',
	hungry: 'hungry',
	eating: 'eating_grass',
	music: 'playing_bass',
	listening: 'listening',
	embarrassed: 'embarrassed',
	thinking: 'thinking',
	surprised: 'surprised',
	sad: 'sad',
	money: 'receiving_money',
	headpat: 'receiving_headpat'
};

export const CATEGORIES = [
	'general',
	'first_visit',
	'returning',
	'morning',
	'afternoon',
	'evening',
	'late_night',
	'idle',
	'music',
	'no_music',
	'artist',
	'song',
	'weather',
	'page',
	'headpat',
	'money',
	'purchase',
	'grass',
	'hungry',
	'sleepy',
	'annoyed',
	'rare',
	'canon',
	'event'
] as const;
export type Category = (typeof CATEGORIES)[number];

export const RARITIES = ['common', 'uncommon', 'rare'] as const;
export type Rarity = (typeof RARITIES)[number];

export const TIMES = ['morning', 'afternoon', 'evening', 'night'] as const;
export type TimeOfDay = (typeof TIMES)[number];
export const WEATHERS = ['clear', 'clouds', 'rain', 'snow', 'storm', 'mist'] as const;
export type WeatherKind = (typeof WEATHERS)[number];

export interface DialogueConditions {
	time?: TimeOfDay[];
	/** Page paths; '/blog' also matches /blog/anything. '/' is only the home page. */
	pages?: string[];
	music?: 'playing' | 'silent';
	/** Part of the artist's name, any case. */
	artist?: string;
	/** Part of the song's name, any case. */
	song?: string;
	weather?: WeatherKind[];
	visitor?: 'first' | 'returning';
	/** MM-DD, for special days. */
	date?: string;
}

/** For lines actually said in the anime. */
export interface DialogueSource {
	anime: string;
	episode: number;
	speaker: string;
	url: string;
	translation: string;
}

export interface DialogueEntry {
	id: string;
	text: string;
	category: Category;
	expression: Expression;
	/** 1–100: how likely among the lines that fit. */
	weight: number;
	rarity: Rarity;
	conditions: DialogueConditions;
	/** Seconds before this line can come up again. */
	cooldown: number;
	source: DialogueSource | null;
	enabled: boolean;
}

export interface Purchase {
	id: string;
	item: string;
	price: number;
	kind: 'bass' | 'pedal' | 'amp' | 'strings' | 'album' | 'food';
	/** What she says after buying it. */
	line: string;
}

export interface CompanionSettings {
	enabled: boolean;
	name: string;
	subtitle: string;
	/** Picture per expression; empty = the default one. */
	sprites: Record<Expression, string>;
	/** Credit / source note per expression, shown in admin. */
	credits: Record<Expression, string>;
	/** Width in px on screen. */
	size: number;
	position: 'bottom-right' | 'bottom-left';
	draggable: boolean;
	/** 30–100 (%). */
	opacity: number;
	/** 0–100: how much she moves (breathing, bobbing, particles). */
	animation: number;
	bubble: 'auto' | 'left' | 'right';
	typewriter: boolean;
	pages: 'home' | 'all';
	desktop: boolean;
	mobile: boolean;
	behaviour: {
		idle: boolean;
		/** How often she says something on her own. */
		autoTalk: 'off' | 'rare' | 'normal';
		/** Minutes without the visitor doing anything before she falls asleep (0 = never). */
		sleepAfter: number;
		/** Minutes she stays asleep when put to sleep. */
		sleepFor: number;
		music: boolean;
		weather: boolean;
		pageReactions: boolean;
		/** Clicks in quick succession before she gets annoyed. */
		annoyAfter: number;
		/** 0–20 (%): how often a rare line can come up. */
		rareChance: number;
	};
	interactions: {
		headpats: boolean;
		money: boolean;
		grass: boolean;
		song: boolean;
		sleep: boolean;
		stats: boolean;
		/** Fictional yen per donation. */
		donation: number;
		/** Seconds between menu actions. */
		cooldown: number;
	};
	achievements: {
		enabled: boolean;
		/** Total fictional yen donated for "financially irresponsible". */
		donated: number;
		grass: number;
		clicks: number;
		headpats: number;
		days: number;
		/** Minutes on the site with her visible. */
		minutes: number;
	};
	purchases: Purchase[];
	dialogue: DialogueEntry[];
}
