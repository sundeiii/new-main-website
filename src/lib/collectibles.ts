// Passport stamps: little things visitors find around the site, collected on /passport.
// Which ones a visitor has is kept in their browser; /api/found only counts how many people
// found each one. (Not to be confused with the guestbook stamps in $lib/stamps.)

export interface Collectible {
	id: string;
	name: string;
	/** Shown while it's still undiscovered. */
	hint: string;
	/** Shown once found. */
	note: string;
	glyph: string;
	/** Stamp colour. */
	color: string;
	/** Ryo's own stamps get their own section on /passport and in her stats. */
	group?: 'ryo';
}

export const COLLECTIBLES: Collectible[] = [
	{ id: 'hello', name: 'first steps', hint: 'just show up.', note: 'you found the place. welcome in.', glyph: '⌂', color: '#4A6A9C' },
	{ id: 'passport', name: 'passport', hint: "you're holding it.", note: 'every collection starts somewhere.', glyph: '✈', color: '#5D7FC0' },
	{ id: 'headpat', name: 'headpat', hint: 'someone in a corner likes headpats.', note: 'ryo accepted your headpat. money still preferred.', glyph: '♡', color: '#D79AAA', group: 'ryo' },
	{ id: 'ryoback', name: 'she came back', hint: 'some people always come back.', note: 'you closed her and still wanted her back.', glyph: '↺', color: '#8FB3E0', group: 'ryo' },
	{ id: 'ryo-broke', name: 'financially irresponsible', hint: "she'll spend it all anyway.", note: 'you gave ryo a small fortune in fictional yen.', glyph: '¥', color: '#c9a63c', group: 'ryo' },
	{ id: 'ryo-bass', name: 'bass enthusiast', hint: 'fund her next mistake.', note: 'you paid for her first (fictional) bass.', glyph: '♩', color: '#3b5584', group: 'ryo' },
	{ id: 'ryo-grass', name: 'grass enthusiast', hint: 'someone is always hungry.', note: 'you fed ryo grass ten times. she is thriving.', glyph: '❦', color: '#79a97f', group: 'ryo' },
	{ id: 'ryo-pats', name: 'professional headpatter', hint: 'fifty is a nice round number.', note: 'fifty headpats. she has stopped protesting.', glyph: '♡', color: '#b0748a', group: 'ryo' },
	{ id: 'ryo-space', name: 'personal space violation', hint: 'there is such a thing as too many clicks.', note: 'you clicked her twenty times in a row. she remembers.', glyph: '!', color: '#c96a6a', group: 'ryo' },
	{ id: 'ryo-night', name: 'night shift', hint: 'visit her after 3am.', note: 'you kept ryo company in the middle of the night.', glyph: '☾', color: '#2A3A5C', group: 'ryo' },
	{ id: 'ryo-taste', name: 'good taste', hint: 'a certain band is playing.', note: 'kessoku band was playing. she approved, quietly.', glyph: '♫', color: '#5D7FC0', group: 'ryo' },
	{ id: 'ryo-sincere', name: 'unexpected sincerity', hint: 'sometimes she means it.', note: 'ryo said something she actually meant.', glyph: '✧', color: '#A596D6', group: 'ryo' },
	{ id: 'ryo-familiar', name: 'familiar face', hint: 'come back on a few different days.', note: "you visited on seven different days. she noticed.", glyph: '⌂', color: '#6F8FBF', group: 'ryo' },
	{ id: 'ryo-company', name: 'quiet company', hint: 'just stay a while.', note: 'you spent fifteen minutes here with ryo around.', glyph: '◷', color: '#4A6A9C', group: 'ryo' },
	{ id: 'cat', name: 'cat person', hint: 'something sleeps at the bottom of every page.', note: 'you woke the cat. it forgives you.', glyph: 'ᓚ', color: '#9fabc2' },
	{ id: 'catmad', name: 'MROW', hint: "don't poke the cat. or do.", note: 'the cat has had enough of you.', glyph: '!', color: '#E0936F' },
	{ id: 'stargazer', name: 'stargazer', hint: 'stars hide on some pages. look up.', note: 'you found a hidden star.', glyph: '✦', color: '#E6C255' },
	{ id: 'constellation', name: 'constellation', hint: 'there are five of them.', note: 'all five hidden stars. that is a constellation now.', glyph: '✧', color: '#c9a63c' },
	{ id: 'letter', name: "you've got mail", hint: 'some pages have post for you.', note: 'you opened a hidden letter.', glyph: '✉', color: '#A596D6' },
	{ id: 'postman', name: 'postman', hint: 'there are three letters out there.', note: 'every letter, delivered.', glyph: '✉', color: '#7f6fb8' },
	{ id: 'night', name: 'night owl', hint: 'come back when everyone else is asleep.', note: 'you were here between midnight and 4am.', glyph: '☾', color: '#2A3A5C' },
	{ id: 'lost', name: 'lost', hint: 'get lost. on purpose.', note: 'you found a page that does not exist.', glyph: '?', color: '#6b7895' },
	{ id: 'thinker', name: 'deep thinker', hint: 'keep thinking. at the bottom.', note: 'you read five little thoughts in a row.', glyph: '✧', color: '#8CC7AB' },
	{ id: 'artist', name: 'liner notes', hint: 'every artist has a room in the music page.', note: 'you looked someone up on an artist page.', glyph: '♪', color: '#5D7FC0' },
	{ id: 'closer', name: 'look closer', hint: 'polaroids have more to say up close.', note: 'you looked at a scrapbook photo up close.', glyph: '◫', color: '#b08f6a' },
	{ id: 'theme', name: 'new look', hint: 'try on a different outfit. ctrl+k helps.', note: 'you changed the theme.', glyph: '◐', color: '#6F8FBF' },
	{ id: 'terminal', name: 'shell user', hint: "not everything shows up in 'help'.", note: 'you ran a hidden terminal command.', glyph: '$', color: '#3b5584' },
	{ id: 'pride', name: 'trans rights', hint: 'two letters, a whole new look.', note: 'you tried the trans theme. trans rights are human rights.', glyph: '⚧', color: '#e893a8' },
	{ id: 'konami', name: 'old code', hint: 'an old cheat code still works here.', note: '↑↑↓↓←→←→ba. respect.', glyph: '↑', color: '#E6C255' }
];

export const collectibleById = (id: string) => COLLECTIBLES.find((c) => c.id === id);

/** Hidden stars and letters: where they are (path) and their own ids. */
export const STAR_PAGES = ['/about', '/music', '/tournaments', '/guestbook', '/scrapbook'] as const;
export const LETTER_PAGES = ['/projects', '/now', '/uses'] as const;
