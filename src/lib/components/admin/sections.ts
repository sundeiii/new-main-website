// The admin sidebar: everything you can edit, grouped.
export const pageSections = ['home', 'about', 'now', 'osu', 'music', 'gallery', 'buttons', 'skins', 'links', 'live', 'status', 'themes', 'seasonal', 'weather', 'changelog'] as const;
export type PageSection = (typeof pageSections)[number];
export const contentSections = ['blog', 'tournaments', 'guestbook', 'media'] as const;
export type Section = (typeof contentSections)[number] | PageSection;

export const sectionInfo: Record<Section, { icon: string; label: string; hint: string; view?: string }> = {
	blog: { icon: '✎', label: 'blog', hint: 'posts and drafts', view: '/blog' },
	tournaments: { icon: '◎', label: 'tournaments', hint: 'everything on /tournaments', view: '/tournaments' },
	guestbook: { icon: '✉', label: 'guestbook', hint: 'messages people left', view: '/guestbook' },
	media: { icon: '▣', label: 'media', hint: 'uploaded images and files' },
	home: { icon: '⌂', label: 'home', hint: 'intro, lists and boxes on the front page', view: '/' },
	about: { icon: '☺', label: 'about', hint: 'bio, involvement, setup', view: '/about' },
	now: { icon: '◷', label: 'now', hint: 'what you are up to', view: '/now' },
	osu: { icon: '●', label: 'osu!', hint: 'stats, maps, achievements', view: '/osu' },
	music: { icon: '♪', label: 'music', hint: 'song of the month, hidden artists', view: '/music' },
	gallery: { icon: '◫', label: 'gallery', hint: 'albums and photos', view: '/gallery' },
	buttons: { icon: '▭', label: 'buttons', hint: '88×31 buttons on the home page', view: '/' },
	skins: { icon: '◈', label: 'skins', hint: 'osu! skins and downloads', view: '/skins' },
	links: { icon: '⇗', label: 'links', hint: 'all your profiles on /links', view: '/links' },
	themes: { icon: '◐', label: 'themes', hint: 'colours, pictures and the default theme', view: '/' },
	live: { icon: '◉', label: 'live tournament', hint: 'the tournament happening now, on top of /tournaments', view: '/tournaments#live' },
	status: { icon: '◍', label: 'server status', hint: 'the up/down cards on /projects', view: '/projects' },
	seasonal: { icon: '❄', label: 'seasonal', hint: 'snow, birthday and new year' },
	weather: { icon: '☁', label: 'weather', hint: 'the city in the nav' },
	changelog: { icon: '≡', label: 'changelog', hint: 'site updates', view: '/changelog' }
};
