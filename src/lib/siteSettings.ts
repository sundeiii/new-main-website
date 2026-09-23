// Editable page content, stored as JSON in the site_settings table and edited in /admin → pages.
// Each key has defaults, so pages work before anything is saved.

export interface HomeLink {
	name: string;
	href: string;
	description: string;
}
export interface HomeSettings {
	/** Short intro shown at the top of the home page. */
	intro: string;
	wip: HomeLink[];
	/** If empty, the home page lists your /projects pages instead. */
	projects: HomeLink[];
	links: HomeLink[];
	/** Section headings on the home page. */
	titles: { wip: string; projects: string; links: string; friends: string };
	/** The "currently" box (listening / working on / playing / next event). */
	showCurrently: boolean;
	/** The "latest" card with your newest post or event. */
	showLatest: boolean;
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

export interface GalleryPhoto {
	src: string;
	caption: string;
	date: string;
}
export interface GalleryAlbum {
	slug: string;
	title: string;
	description: string;
	photos: GalleryPhoto[];
}
export interface GallerySettings {
	albums: GalleryAlbum[];
}

export interface Button88x31 {
	image: string;
	href: string;
	alt: string;
	/** Pixel-art buttons look best with image-rendering: pixelated. */
	pixelated: boolean;
}
export interface ButtonsSettings {
	/** Friends' / other sites' buttons shown on the home page. */
	items: Button88x31[];
	/** Your own button, with a "copy embed code" click. */
	mine: { image: string; alt: string };
}

export interface AboutSpec {
	label: string;
	value: string;
	sub: string;
	image: string;
}
export interface AboutSettings {
	/** Markdown. */
	bio: string;
	pcBuild: AboutSpec[];
	peripherals: AboutSpec[];
	languages: { name: string; color: string }[];
	interests: string[];
	links: { label: string; url: string }[];
	/** Software & setup for /uses (label e.g. "editor", value e.g. "VS Code"). */
	software: { label: string; value: string; sub: string }[];
}

/** Alternative "who?" text for visitors with the secret theme unlocked (empty = normal text). */
export interface AboutAltSettings {
	bio: string;
}

export interface SiteSettings {
	home: HomeSettings;
	now: NowSettings;
	osu: OsuSettings;
	music: MusicSettings;
	skins: SkinsSettings;
	gallery: GallerySettings;
	buttons: ButtonsSettings;
	about: AboutSettings;
	aboutAlt: AboutAltSettings;
}

export const settingDefaults: SiteSettings = {
	home: {
		intro: 'my corner of the internet — osu! tournaments, IT garbage, music & whatever else i feel like putting here.',
		wip: [
			{ name: 'scripts', href: 'https://github.com/rayuii/winpowershell', description: 'powershell scripts (school)' },
			{ name: 'titanic wiki', href: 'https://github.com/rayuii/Titanic-Wiki', description: 'contributions in estonian and dutch' },
			{ name: 'old portfolio', href: 'https://github.com/rayuii/portfolio', description: 'buh' }
		],
		projects: [
			{ name: 'linux scripts', href: 'https://github.com/rayuii/skriptlinux', description: 'school forces me to suffer' },
			{ name: 'where is my bus lol', href: 'https://www.tartulinnaliin.ee', description: 'tartu bussiajad, but website' },
			{ name: 'fonoteek', href: 'https://github.com/rayuii/fonoteek', description: 'object-oriented programming stuff' }
		],
		links: [
			{ name: 'twitter', href: 'https://twitter.com/deprivedsundei', description: '' },
			{ name: 'github', href: 'https://github.com/rayuii', description: '' },
			{ name: 'email', href: 'mailto:sundei@sundei.ee', description: '' }
		],
		titles: { wip: 'wip', projects: 'projects', links: 'links', friends: 'friends' },
		showCurrently: true,
		showLatest: true
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
	},
	gallery: {
		albums: [
			{
				slug: 'random',
				title: 'random',
				description: '',
				photos: [
					{ src: 'https://cdn.sundei.eu/temp_gallery/IMG_2469.jpg', caption: 'rain and spring', date: '2026-02-09' },
					{ src: 'https://cdn.sundei.eu/temp_gallery/IMG_2481.jpg', caption: 'the sunset after the rain', date: '2026-02-08' }
				]
			}
		]
	},
	buttons: {
		items: [
			{ image: '/advelosbutton.gif', href: 'https://advelos.moe', alt: 'advelos!!', pixelated: false },
			{ image: 'https://nyoemii.dev/media/img/button.png', href: 'https://nyoemii.dev/', alt: "noemi's puppyhouse", pixelated: true },
			{ image: '/centaurea.gif', href: 'https://centaurea.ee/', alt: 'centaurea', pixelated: false }
		],
		mine: { image: 'https://sundei.ee/sfa.gif', alt: 'the house of kwanmendments' }
	},
	about: {
		bio: "hey, i'm sundei. i'm a student and developer from Estonia. i enjoy building things for the web, playing osu!, and listening to way too much music.\n\ni mostly work with TypeScript and Svelte these days. this portfolio is built with SvelteKit, Tailwind CSS, and a bunch of APIs stitched together.\n\nwhen i'm not coding, i'm probably watching streams, staffing osu! tournaments, or contributing to random wikis.",
		pcBuild: [
			{ label: 'processor', value: 'i5-13400F', sub: '10c / 16t • up to 4.6 GHz', image: '/images/pcbuild/13400f.webp' },
			{ label: 'graphics card', value: 'GeForce RTX 3060 12GB', sub: 'asus • 12GB gddr6', image: '/images/pcbuild/rtx3060.webp' },
			{ label: 'memory', value: '4x16GB DDR4', sub: 'xmp certified • 3200 MT/s', image: '/images/pcbuild/memory.webp' },
			{ label: 'main nvme', value: 'Samsung 990 PRO 1TB', sub: 'gen4 • ~7,000 MB/s', image: '/images/pcbuild/samsung.webp' },
			{ label: 'additional storage', value: 'Seagate Barracuda', sub: '2tb • 7200 rpm hdd', image: '/images/pcbuild/barracuda.webp' },
			{ label: 'backup storage', value: 'Western Digital Blue', sub: '2x500GB • sata', image: '/images/pcbuild/wd.webp' },
			{ label: 'motherboard', value: 'ASRock B760M Pro RS/D4 WiFi', sub: 'lga1700 • matx • wi-fi', image: '/images/pcbuild/b760m.webp' },
			{ label: 'cooling', value: 'NZXT Kraken 240', sub: '240mm aio • customizable screen', image: '/images/pcbuild/kraken.webp' },
			{ label: 'chassis', value: 'NZXT H5 Elite', sub: 'matx • tempered glass', image: '/images/pcbuild/h5-elite.webp' }
		],
		peripherals: [
			{ label: 'monitor', value: 'Lenovo Legion 24-10', sub: '1080p • 240 Hz', image: '/images/peripherals/main-lenovo.webp' },
			{ label: 'keyboard', value: 'Wooting 60HE', sub: 'hall effect • analog • rapid trigger', image: '/images/peripherals/wooting.webp' },
			{ label: 'mouse', value: 'Logitech PRO 2 LIGHTSPEED', sub: '25k sensor • wireless', image: '/images/peripherals/mouse.webp' },
			{ label: 'tablet', value: 'Wacom CTL-472', sub: 'the osu tablet • stan full area', image: '/images/peripherals/ctl472.webp' },
			{ label: 'headphones', value: 'Sony WH-1000XM4', sub: 'active noise cancellation • wireless', image: '/images/peripherals/xm4.webp' }
		],
		languages: [
			{ name: 'TypeScript', color: '#3178c6' },
			{ name: 'Svelte', color: '#ff3e00' },
			{ name: 'Python', color: '#3776ab' },
			{ name: 'HTML/CSS', color: '#e34c26' },
			{ name: 'PowerShell', color: '#012456' },
			{ name: 'Bash', color: '#4eaa25' }
		],
		interests: ['osu!', 'web development', 'music', 'graphic design', 'editing'],
		links: [
			{ label: 'twitter', url: 'https://twitter.com/deprivedsundei' },
			{ label: 'github', url: 'https://github.com/rayuii' },
			{ label: 'email', url: 'mailto:sundei@sundei.ee' }
		],
		software: [
			{ label: 'os', value: 'Windows 11', sub: '' },
			{ label: 'editor', value: 'VS Code', sub: '' },
			{ label: 'design', value: 'Figma', sub: '' }
		]
	},
	aboutAlt: { bio: '' }
};

export const SETTING_KEYS = Object.keys(settingDefaults) as (keyof SiteSettings)[];
export const isSettingKey = (k: string): k is keyof SiteSettings => (SETTING_KEYS as string[]).includes(k);
