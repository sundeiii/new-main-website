// Editable page content, stored as JSON in the site_settings table and edited in /admin → pages.
// Each key has defaults, so pages work before anything is saved.

export interface HomeSettings {
	/** Short intro shown at the top of the home page (markdown). */
	intro: string;
}

export interface NowSection {
	icon: string;
	title: string;
	items: string[];
}
export interface NowSettings {
	updated: string;
	sections: NowSection[];
}

export interface OsuMap {
	title: string;
	url: string;
	note: string;
	// Filled in by the "fetch" button in the admin editor.
	cover?: string;
	mapper?: string;
	stars?: number | null;
}
export interface OsuAchievement {
	date: string;
	text: string;
}
export interface OsuSettings {
	username: string;
	/** Intro text (markdown). */
	intro: string;
	showStats: boolean;
	maps: OsuMap[];
	achievements: OsuAchievement[];
}

export interface SongOfTheMonth {
	title: string;
	artist: string;
	url: string;
	image: string;
	note: string;
}
export interface MusicSettings {
	/** 'list' is the original design, 'cards' the album-art one. */
	design: 'list' | 'cards';
	songOfTheMonth: SongOfTheMonth | null;
	/** Free text above the lists (markdown), e.g. what you're obsessed with lately. */
	notes: string;
	/** Tracks by these artists are left out everywhere (music page and home now playing). */
	hiddenArtists: string[];
}

export interface Skin {
	name: string;
	author: string;
	description: string;
	/** Cover image for the card. */
	preview: string;
	screenshots: string[];
	/** The .osk file (usually uploaded to the CDN from the admin panel). */
	download: string;
}
export interface SkinsSettings {
	items: Skin[];
}

export interface SiteSettings {
	home: HomeSettings;
	now: NowSettings;
	osu: OsuSettings;
	music: MusicSettings;
	skins: SkinsSettings;
}

export const settingDefaults: SiteSettings = {
	home: {
		intro: 'my corner of the internet — osu! tournaments, IT garbage, music & whatever else i feel like putting here.'
	},
	now: {
		updated: 'February 2026',
		sections: [
			{ icon: '🔨', title: 'working on', items: ['this portfolio site', 'school projects (powershell, linux)'] },
			{ icon: '📚', title: 'learning', items: ['SvelteKit + TypeScript', 'UI/UX design', 'linux administration'] },
			{ icon: '🎮', title: 'playing', items: ['osu! (as always)'] },
			{ icon: '🎵', title: 'listening to', items: ['check /music for live updates'] },
			{ icon: '📖', title: 'reading', items: ['nothing at the moment'] },
			{ icon: '🛠️', title: 'using', items: ['VS Code', 'Figma', 'Cloudflare'] }
		]
	},
	osu: {
		username: 'sodanator',
		intro: "rank isn't really the point. tournaments, maps i love, and whatever i've been up to in osu!.",
		showStats: true,
		maps: [],
		achievements: []
	},
	music: {
		design: 'list',
		songOfTheMonth: null,
		notes: '',
		hiddenArtists: ['ALIKA']
	},
	skins: {
		items: [
			{
				name: 'BlooXoo (sundei edit)',
				author: '-Sc4rYSaiyajin-',
				description: '',
				preview: '/skins/BlooXoo/preview.jpg',
				screenshots: [],
				download: '/skins/- 『BlooXoo』 - (sundei edit).osk'
			}
		]
	}
};

export const SETTING_KEYS = Object.keys(settingDefaults) as (keyof SiteSettings)[];
export const isSettingKey = (k: string): k is keyof SiteSettings => (SETTING_KEYS as string[]).includes(k);
