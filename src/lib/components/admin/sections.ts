// The admin sidebar: everything you can edit, grouped.
export const pageSections = ['home', 'about', 'now', 'osu', 'music', 'gallery', 'buttons', 'skins', 'themes', 'weather', 'changelog'] as const;
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
	themes: { icon: '◐', label: 'themes', hint: 'colours, pictures and the default theme', view: '/' },
	weather: { icon: '☁', label: 'weather', hint: 'the city in the nav' },
	changelog: { icon: '≡', label: 'changelog', hint: 'site updates', view: '/changelog' }
};
