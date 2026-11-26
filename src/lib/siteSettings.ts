import { themeDefaults, type ThemesSettings } from '$lib/themes';

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
	/** One-line status shown at the top of the home "currently" box and on /now. */
	status: string;
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
	/** A webring you are a member of: "← prev · name · next →" under the buttons. Hidden until set. */
	webring: { name: string; home: string; prev: string; next: string };
}

/** A community, team or organisation you're part of, shown under "who?" on /about. */
export interface Affiliation {
	name: string;
	role: string;
	/** Optional extra line, e.g. what you worked on there. */
	note: string;
	url: string;
	/** Free text, e.g. "since nov 2026". */
	since: string;
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
	affiliations: Affiliation[];
	pcBuild: AboutSpec[];
	peripherals: AboutSpec[];
	languages: { name: string; color: string }[];
	/** Heading above the interests list. */
	interestsTitle: string;
	interests: string[];
	links: { label: string; url: string }[];
	/** Software & setup for /uses (label e.g. "editor", value e.g. "VS Code"). */
	software: { label: string; value: string; sub: string }[];
}

/** Alternative "who?" text for visitors with the secret theme unlocked (empty = normal text). */
export interface AboutAltSettings {
	bio: string;
}

/** A server or site shown with a live up/down check on /projects. */
export interface StatusService {
	name: string;
	/** Where the card links. */
	link: string;
	/** Address that's checked: up if it answers with a 2xx. */
	check: string;
	/** Optional JSON address with an "online" player count, like Reprise's /web/launcher/status. */
	players: string;
	note: string;
}
export interface StatusSettings {
	show: boolean;
	title: string;
	items: StatusService[];
}

/** One match on the live tournament's schedule. */
export interface LiveMatch {
	/** ISO time (UTC); shown in each visitor's own time zone. */
	time: string;
	stage: string;
	red: string;
	blue: string;
	/** Both null until it's played. */
	redScore: number | null;
	blueScore: number | null;
	/** osu! multiplayer link, once there is one. */
	mp: string;
}
/** A tournament happening now, shown at the top of /tournaments while "show" is on. */
export interface LiveTournamentSettings {
	show: boolean;
	name: string;
	/** Forum post or website. */
	link: string;
	banner: string;
	/** e.g. "quarterfinals". */
	stage: string;
	/** Twitch channel name (or full twitch.tv link). */
	twitch: string;
	/** Your role this time, e.g. "referee / streamer". */
	role: string;
	note: string;
	matches: LiveMatch[];
}

/** Little seasonal touches. */
export interface SeasonalSettings {
	/** Snow in december and the first week of january ('auto'), always, or never. */
	snow: 'auto' | 'on' | 'off';
	/** MM-DD; on that day a small note and some confetti. Empty = off. */
	birthday: string;
	birthdayText: string;
	/** Confetti and a note on new year's day. */
	newYear: boolean;
}

/** The weather in the nav. */
export interface WeatherSettings {
	show: boolean;
	/** What OpenWeather looks up, e.g. "Tartu" or "Tartu,EE". */
	city: string;
	/** Name shown next to the temperature (empty = the city OpenWeather returns). */
	label: string;
	units: 'c' | 'f';
}

/** One link on /links. */
export interface LinkItem {
	label: string;
	href: string;
	/** Username or short address shown next to the label, like @sundeiii. */
	handle: string;
	note: string;
}
/** The /links page: all my profiles in one place, in groups. */
export interface LinksSettings {
	intro: string;
	groups: { title: string; items: LinkItem[] }[];
}

/** The little things: greetings, thoughts in the footer, the footer cat and ryo on the home page. */
export interface CozySettings {
	/** "good evening" and the time here, above my name on the home page. */
	greeting: boolean;
	/** One of these shows in the footer of every page (click it for another). */
	thoughts: string[];
	/** The pixel cat asleep in the footer. */
	cat: boolean;
	catName: string;
	/** The little companion in the corner of the home page (desktop only). */
	companion: boolean;
	companionName: string;
	/** Her picture: a see-through png/webp/gif is shown cut out with a white sticker edge, anything else as a round sticker. Without one she doesn't show. */
	companionImage: string;
	/** What she says when clicked. {song} and {artist} use the song i'm playing; lines with them only show while something plays. */
	companionLines: string[];
	/** Patting her head counts towards a total shared by every visitor. */
	headpats: boolean;
	/** The three hidden letters (in envelopes on /projects, /now and /uses, in that order). */
	letters: string[];
	/** Faint twinkling stars over the page at night (visitor's time, 22–6). Visitors can turn it off in ctrl+k. */
	nightSky: boolean;
	/** The little music box on the footer line, open while i'm listening to something. */
	musicBox: boolean;
	/** Seasonal hats on the footer cat and a seasonal mark in the greeting. */
	seasonalTouches: boolean;
}

/** One thing stuck on a scrapbook page. */
export interface ScrapItem {
	/** photo: a polaroid · note: handwritten paper · ticket: a stub · sticker: a picture or a built-in one. */
	kind: 'photo' | 'note' | 'ticket' | 'sticker';
	/** photo / sticker picture. */
	image: string;
	/** photo caption, note text, ticket title, or a built-in sticker's name (heart, star, note, moon, flower, cat, ryo). */
	text: string;
	/** note signature or ticket line under the title. */
	sub: string;
	/** YYYY-MM-DD or any short text, optional. */
	date: string;
	/** paper / ticket colour: cream, blue, gold, mint, lavender. */
	color: string;
	/** degrees; null = a little random. */
	tilt: number | null;
	tape: 'auto' | 'none' | 'top' | 'corners' | 'side';
	size: 's' | 'm' | 'l';
}
export interface ScrapPage {
	title: string;
	date: string;
	/** A line under the title. */
	note: string;
	items: ScrapItem[];
}
/** The scrapbook on /scrapbook: pages of polaroids, notes, tickets and stickers. */
export interface ScrapbookSettings {
	intro: string;
	pages: ScrapPage[];
}

export interface SiteSettings {
	cozy: CozySettings;
	scrapbook: ScrapbookSettings;
	home: HomeSettings;
	now: NowSettings;
	osu: OsuSettings;
	music: MusicSettings;
	skins: SkinsSettings;
	gallery: GallerySettings;
	buttons: ButtonsSettings;
	about: AboutSettings;
	aboutAlt: AboutAltSettings;
	/** Themes (see $lib/themes). */
	themes: ThemesSettings;
	weather: WeatherSettings;
	status: StatusSettings;
	live: LiveTournamentSettings;
	seasonal: SeasonalSettings;
	links: LinksSettings;
}

export const settingDefaults: SiteSettings = {
	links: {
		intro: "everywhere you can find me, in one place.",
		groups: [
			{
				title: 'socials',
				items: [
					{ label: 'twitter', href: 'https://twitter.com/deprivedsundei', handle: '@deprivedsundei', note: '' },
					{ label: 'twitch', href: 'https://twitch.tv/sundeiiii_', handle: 'sundeiiii_', note: 'osu! and tournament streams' },
					{ label: 'github', href: 'https://github.com/sundeiii', handle: 'sundeiii', note: '' },
					{ label: 'email', href: 'mailto:sundei@sundei.ee', handle: 'sundei@sundei.ee', note: '' }
				]
			},
			{
				title: 'osu!',
				items: [
					{ label: 'osu! profile', href: 'https://osu.ppy.sh/users/sodanator', handle: 'sodanator', note: '' },
					{ label: 'reprise', href: 'https://osu.reprise.pw', handle: 'osu.reprise.pw', note: 'my osu! server' },
					{ label: 'centaurea', href: 'https://centaurea.ee', handle: 'centaurea.ee', note: 'estonian osu! tournaments' }
				]
			},
			{
				title: 'music',
				items: [{ label: 'last.fm', href: 'https://www.last.fm/user/sundeii', handle: 'sundeii', note: '' }]
			},
			{
				title: 'on this site',
				items: [
					{ label: 'rss feed', href: '/rss.xml', handle: '', note: 'new posts and events' },
					{ label: 'guestbook', href: '/guestbook', handle: '', note: 'leave a message' }
				]
			}
		]
	},
	themes: themeDefaults,
	weather: { show: true, city: 'Tartu', label: '', units: 'c' },
	live: { show: false, name: '', link: '', banner: '', stage: '', twitch: '', role: '', note: '', matches: [] },
	seasonal: { snow: 'auto', birthday: '', birthdayText: "it's my birthday today :)", newYear: true },
	scrapbook: {
		intro: 'bits and pieces i wanted to keep. photos, notes, tickets, little things.',
		pages: [
			{
				title: 'a few good days',
				date: '2026',
				note: "a sample page. swap it for real ones in admin → scrapbook.",
				items: [
					{ kind: 'photo', image: 'https://cdn.doitforjanice.eu/gallery/img-3599-7a75f3.webp', text: 'september', sub: '', date: '2026-09-18', color: 'cream', tilt: null, tape: 'auto', size: 'm' },
					{ kind: 'note', image: '', text: 'remember to write down the small stuff too. it ends up being the stuff you miss.', sub: '- me', date: '', color: 'cream', tilt: null, tape: 'top', size: 'm' },
					{ kind: 'sticker', image: '', text: 'ryo', sub: '', date: '', color: 'cream', tilt: null, tape: 'none', size: 's' },
					{ kind: 'photo', image: 'https://cdn.doitforjanice.eu/gallery/img-1975-cd40ec.webp', text: 'summer', sub: '', date: '2026-08-14', color: 'cream', tilt: null, tape: 'corners', size: 'l' },
					{ kind: 'ticket', image: '', text: 'estonian duo cup', sub: 'grand finals · stream booth', date: '2026', color: 'gold', tilt: null, tape: 'none', size: 'm' },
					{ kind: 'sticker', image: '', text: 'star', sub: '', date: '', color: 'cream', tilt: null, tape: 'none', size: 's' },
					{ kind: 'photo', image: 'https://cdn.doitforjanice.eu/gallery/img-2469-5fa423.webp', text: 'old one', sub: '', date: '2025-04-22', color: 'cream', tilt: null, tape: 'side', size: 's' },
					{ kind: 'note', image: '', text: 'fc on the first try. nobody saw. it still counts.', sub: '', date: '', color: 'blue', tilt: null, tape: 'auto', size: 's' },
					{ kind: 'sticker', image: '', text: 'cat', sub: '', date: '', color: 'cream', tilt: null, tape: 'none', size: 's' }
				]
			}
		]
	},
	cozy: {
		greeting: true,
		thoughts: [
			'drink some water, okay?',
			"you're doing better than you think.",
			"it's okay to log off for a bit.",
			'go stretch. your back will thank you.',
			'thanks for stopping by :)',
			"remember to eat something that isn't instant noodles.",
			'most of this site was made at 3am.',
			'be nice to the people who ref your matches.',
			'sleep is a buff. take it.',
			'somewhere, someone just got their first full combo.',
			'you can leave a note in the guestbook, if you want.',
			'the cat in the footer has no name tag. it just showed up one day.'
		],
		cat: true,
		catName: 'mochi',
		companion: true,
		companionName: 'ryo',
		companionImage: '/ryo.png',
		companionLines: [
			'...',
			'do you have money?',
			'i spent everything on a new bass.',
			"grass doesn't taste that bad.",
			'leave me alone... actually, stay.',
			"bass is the most important part of a band. don't look that up.",
			"can you lend me 1000 yen. i'll pay it back. probably.",
			'i ate some grass today. it was fine.',
			'sundei made this site. i just live here.',
			'headpats are accepted. money is preferred.',
			"i'm not lazy. i'm saving energy.",
			"i'd play a tournament, but that sounds like effort.",
			'you found me. congratulations, i guess.',
			'nap time is a state of mind.',
			"the guestbook is that way. i won't read it, though.",
			'{song}... decent bassline.',
			'is this {artist}? sundei has taste. sometimes.'
		],
		headpats: true,
		letters: [
			"hi. if you're reading this, you clicked a tiny envelope on a random website. i respect that.\nhope your day is going okay.",
			"a secret: half of these projects started as 'i'll just do it quickly'. none of them were quick.\nkeep making things anyway.",
			"thanks for poking around. the internet used to be full of little places like this.\nmake one too, if you want. i'll visit."
		],
		nightSky: true,
		musicBox: true,
		seasonalTouches: true
	},
	status: {
		show: true,
		title: 'running right now',
		items: [
			{
				name: 'Reprise',
				link: 'https://osu.reprise.pw',
				check: 'https://c.reprise.pw/health',
				players: 'https://osu.reprise.pw/web/launcher/status',
				note: 'osu! private server, stable and lazer'
			},
			{ name: 'Reprise MSN', link: 'https://msn.reprise.pw', check: 'https://msn.reprise.pw', players: '', note: 'an MSN Messenger server, for some reason' }
		]
	},
	home: {
		intro: 'my corner of the internet — osu! tournaments, IT garbage, music & whatever else i feel like putting here.',
		wip: [
			{ name: 'scripts', href: 'https://github.com/sundeiii/winpowershell', description: 'powershell scripts (school)' },
			{ name: 'titanic wiki', href: 'https://github.com/sundeiii/Titanic-Wiki', description: 'contributions in estonian and dutch' },
			{ name: 'old portfolio', href: 'https://github.com/sundeiii/portfolio', description: 'buh' }
		],
		projects: [
			{ name: 'linux scripts', href: 'https://github.com/sundeiii/skriptlinux', description: 'school forces me to suffer' },
			{ name: 'where is my bus lol', href: 'https://www.tartulinnaliin.ee', description: 'tartu bussiajad, but website' },
			{ name: 'fonoteek', href: 'https://github.com/sundeiii/fonoteek', description: 'object-oriented programming stuff' }
		],
		links: [
			{ name: 'twitter', href: 'https://twitter.com/deprivedsundei', description: '' },
			{ name: 'github', href: 'https://github.com/sundeiii', description: '' },
			{ name: 'email', href: 'mailto:sundei@sundei.ee', description: '' }
		],
		titles: { wip: 'wip', projects: 'projects', links: 'links', friends: 'friends' },
		showCurrently: true,
		showLatest: true
	},
	now: {
		status: '',
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
				photos: []
			}
		]
	},
	buttons: {
		items: [
			{ image: '/advelosbutton.gif', href: 'https://advelos.moe', alt: 'advelos!!', pixelated: false },
			{ image: 'https://nyoemii.dev/media/img/button.png', href: 'https://nyoemii.dev/', alt: "noemi's puppyhouse", pixelated: true },
			{ image: '/centaurea.gif', href: 'https://centaurea.ee/', alt: 'centaurea', pixelated: false }
		],
		mine: { image: 'https://sundei.ee/sfa.gif', alt: 'the house of kwanmendments' },
		webring: { name: '', home: '', prev: '', next: '' }
	},
	about: {
		bio: "hey, i'm sundei. i'm a student and developer from Estonia. i enjoy building things for the web, playing osu!, and listening to way too much music.\n\ni mostly work with TypeScript and Svelte these days. this portfolio is built with SvelteKit, Tailwind CSS, and a bunch of APIs stitched together.\n\nwhen i'm not coding, i'm probably watching streams, staffing osu! tournaments, or contributing to random wikis.",
		affiliations: [
			{ name: "Cavoe's osu! event (COE)", role: 'production staff', note: '', url: '', since: '' },
			{ name: 'Akatsuki', role: 'community support', note: '', url: 'https://akatsuki.gg', since: '' },
			{ name: 'osu!frlive', role: 'association member & broadcast staff', note: 'broadcast production for OFT 2026 and OWC 2026', url: '', since: 'since nov 2026' },
			{ name: 'Centaurea', role: 'Estonian osu! community', note: '', url: 'https://centaurea.ee', since: '' }
		],
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
		interestsTitle: 'things i like',
		interests: ['osu!', 'web development', 'music', 'graphic design', 'editing'],
		links: [
			{ label: 'twitter', url: 'https://twitter.com/deprivedsundei' },
			{ label: 'github', url: 'https://github.com/sundeiii' },
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
