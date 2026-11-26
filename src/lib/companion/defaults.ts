import type { Category, CompanionSettings, DialogueConditions, DialogueEntry, DialogueSource, Expression, Rarity } from './types';

// Ryo's default settings and dialogue. Lines in lowercase are original, written for this site in
// her voice. Lines in the "canon" category are quoted from the anime's English subtitles and carry
// their source; nothing original is marked as canon.

const SCRIPT = 'https://github.com/Gorzkun/Bocchi-The-Rock-Script-Analysis/blob/main/Script_Bocchi_The_Rock_S1.txt';
const TRANSLATION = 'english subtitles as transcribed in the Gorzkun/Bocchi-The-Rock-Script-Analysis script (translation origin not stated there)';

type Extra = Partial<Pick<DialogueEntry, 'weight' | 'rarity' | 'cooldown'>> & { conditions?: DialogueConditions };

function lines(category: Category, expression: Expression, texts: string[], extra: Extra = {}): DialogueEntry[] {
	return texts.map((text, i) => ({
		id: `${category}-${(extra.conditions?.artist ?? extra.conditions?.pages?.[0] ?? extra.conditions?.weather?.[0] ?? extra.conditions?.date ?? '').replace(/[^a-z0-9]+/gi, '') || 'x'}-${i + 1}`,
		text,
		category,
		expression,
		weight: extra.weight ?? 10,
		rarity: extra.rarity ?? 'common',
		conditions: extra.conditions ?? {},
		cooldown: extra.cooldown ?? 300,
		source: null,
		enabled: true
	}));
}

function canon(id: string, text: string, episode: number, row: number, expression: Expression, rarity: Rarity = 'uncommon'): DialogueEntry {
	const source: DialogueSource = { anime: 'Bocchi the Rock!', episode, speaker: 'Ryo Yamada', url: `${SCRIPT}#row-${row}`, translation: TRANSLATION };
	return { id: `canon-${id}`, text, category: 'canon', expression, weight: 8, rarity, conditions: {}, cooldown: 1800, source, enabled: true };
}

export const DEFAULT_DIALOGUE: DialogueEntry[] = [
	...lines('general', 'default', [
		'oh. a visitor.',
		'sundei made this place. i just live here.',
		'being called weird is a compliment.',
		"i'm conserving energy.",
		'silence is underrated.',
		'i was busy doing nothing.',
		'what an interesting little website.',
		'social interaction is expensive.',
		"i'm not ignoring you. probably.",
		'i have absolutely no plans today.',
		'doing nothing is an art form.',
		'i live in your browser rent-free.',
		'i wonder if this website accepts bass guitars as payment.',
		'you found me. congratulations, i guess.'
	]),
	// Quietly sad (the sad picture). Rare, so she doesn't get gloomy.
	...lines('general', 'sad', ['i found a really nice bass today. unfortunately, money exists.', 'the bass i wanted got sold.', 'my wallet and i are no longer on speaking terms.'], { weight: 6 }),
	...lines('first_visit', 'default', [
		'oh. someone new.',
		'welcome, i suppose.',
		"you can look around. i won't stop you.",
		"this is sundei's website. i'm just the resident bassist.",
		'have you brought money?'
	]),
	...lines('returning', 'default', ["oh. you're back.", 'missed me? unfortunate.', 'welcome back, i guess.', "it's been a while.", "you again. interesting.", 'i was starting to enjoy the silence.']),
	...lines('music', 'listening', [
		'{song}... decent bassline.',
		'is this {artist}? interesting.',
		'needs more bass.',
		'the bassist is clearly the most important member.',
		'finally. something worth listening to.',
		'i approve of this one.',
		'turn it up. maybe.',
		'i could probably play this.',
		'the bass deserves more appreciation.',
		'interesting arrangement.',
		"i'm listening. don't interrupt."
	]),
	...lines('no_music', 'thinking', ['the silence is nice, actually.', 'where did the music go?', 'even silence has its own rhythm.', 'put something interesting on.', "it's unusually quiet."]),
	...lines('artist', 'listening', ['hm. sounds familiar.', 'the bassist is pretty good.', 'i wonder who played that bassline.', 'nijika would probably recognize this.'], {
		conditions: { artist: 'kessoku band' },
		weight: 20
	}),
	...lines('artist', 'listening', ['sundei is feeling sentimental again.', 'this one feels nostalgic.', 'interesting. emotionally devastating, but interesting.'], {
		conditions: { artist: 'porter robinson' },
		weight: 20
	}),
	...lines('artist', 'music', ['a little loud. i approve.', 'that bassist must be exhausted.', 'subtlety is apparently optional.'], {
		conditions: { artist: 'imperial circus dead decadence' },
		weight: 20
	}),
	...lines('page', 'default', ['this is my corner.', 'make yourself comfortable. quietly.'], { conditions: { pages: ['/'] } }),
	...lines('page', 'default', ['leave something interesting. or money.', "i won't read it. probably."], { conditions: { pages: ['/guestbook'] } }),
	...lines('page', 'thinking', ['clicking circles for several hours. fascinating.', 'sounds like a rhythm game. acceptable.', 'another attempt? impressive dedication.'], {
		conditions: { pages: ['/osu'] }
	}),
	...lines('page', 'default', ["sounds exhausting. i'll watch.", 'sundei seems to be busy again.', "i'd participate, but that sounds like effort."], {
		conditions: { pages: ['/tournaments'] }
	}),
	...lines('page', 'thinking', ['sundei has been thinking again.', 'sometimes words are easier than conversations.', 'quite a lot of thoughts.'], { conditions: { pages: ['/blog'] } }),
	...lines('page', 'listening', ['the most important page on this website.', 'finally, somewhere i belong.', 'let me judge your music taste.'], { conditions: { pages: ['/music'] } }),
	...lines('page', 'thinking', ["you're curious about sundei? understandable.", 'people are more complicated than they look.'], { conditions: { pages: ['/about'] } }),
	...lines('page', 'default', ['pictures. how revolutionary.', 'this one has a nice atmosphere.'], { conditions: { pages: ['/gallery'] } }),
	...lines('morning', 'sleepy', ["it's too early to exist.", 'good morning. unfortunately.', 'breakfast would be nice.', 'five more minutes.']),
	...lines('evening', 'default', ['the day went by surprisingly quickly.', 'a good time to listen to music.', 'finally, things are getting quieter.']),
	...lines('late_night', 'sleepy', [
		"you're still awake?",
		'even i have a sleep schedule. occasionally.',
		'the internet is quieter at this hour.',
		"go to sleep. i'll still be here tomorrow.",
		'the night is nice.',
		"it's peaceful when everyone's asleep.",
		'another sleepless night?'
	]),
	...lines('weather', 'thinking', ['free water from the sky.', 'good weather for staying inside.', 'rain makes everything sound better.'], { conditions: { weather: ['rain', 'storm'] } }),
	...lines('weather', 'sleepy', ['cold.', 'grass is going to be difficult to find.', 'everything looks quieter.'], { conditions: { weather: ['snow'] } }),
	...lines('weather', 'annoyed', ['too bright.', 'the outside world exists, apparently.', 'good weather for avoiding responsibilities.'], { conditions: { weather: ['clear'] } }),
	...lines('money', 'money', [
		'can you lend me 1000 yen?',
		'i bought another bass.',
		'financial stability is temporary. bass guitars are forever.',
		'i accept donations. refunds are not supported.',
		"i'm experiencing a temporary financial inconvenience.",
		'i regret nothing.',
		'another bass would solve my problems.',
		'my wallet is a concept, not a reality.',
		'{money}. almost a bass.',
		'{money}. this changes nothing. thank you anyway.'
	]),
	...lines('purchase', 'happy', ["i bought a new bass. don't ask how much.", 'my financial situation has changed.', 'i appear to be broke again.', 'i spent it on {item}. worth it.'], { cooldown: 0 }),
	...lines('grass', 'eating', ['grass is surprisingly versatile.', 'this grass has a surprisingly complex flavour.', "unfortunately, bass guitars aren't edible.", 'i spent my food money again.']),
	...lines('headpat', 'headpat', ['what are you doing.', 'acceptable.', "i'll allow it.", "don't tell nijika.", 'hm.', 'this is surprisingly tolerable.', 'headpats are accepted. money is preferred.'], {
		cooldown: 60
	}),
	...lines('annoyed', 'annoyed', [
		'what.',
		'personal space.',
		'i heard you the first seven times.',
		"you're not going to unlock a legendary item.",
		'please find a hobby.',
		"i'm beginning to understand bocchi.",
		'do you need something?',
		'you are unusually persistent.',
		"i'm going back to sleep."
	], { cooldown: 60 }),
	...lines('sleepy', 'sleepy', ['five more minutes.', 'nap time is a state of mind.', 'i was having a dream about bass guitars.', "wake me up when there's food.", 'not now.', 'zzz...'], { cooldown: 120 }),
	...lines(
		'rare',
		'thinking',
		[
			"you don't have to be like everyone else.",
			"being alone isn't always a bad thing.",
			'make things because you like making them.',
			'not everyone has to understand you.',
			"it's nice here.",
			"i don't mind if you stay a little longer.",
			'you have your own rhythm. keep it.',
			"being different isn't something you need to fix.",
			'sometimes the quiet moments are the best ones.',
			"there's no point in pretending to be someone else.",
			'you can take your time.',
			'i like this little corner of the internet.',
			"you don't need an audience to make something meaningful.",
			"i'm glad sundei made this place."
		],
		{ rarity: 'rare', cooldown: 3600 }
	),
	// Verified word for word in the script (row numbers in each source link).
	canon('uniqueness', 'Abandoning your uniqueness is equivalent to dying.', 4, 931, 'thinking', 'rare'),
	canon('lyrics', "So don't write generic lyrics based on other concerns. Write what you want to write.", 4, 933, 'thinking'),
	canon('color', "Bringing a wide variety of individuals together into one sound... That's the color that Kessoku Band will have.", 4, 937, 'thinking', 'rare'),
	canon('broke', "Sorry, I'm broke. Treat me?", 4, 941, 'money'),
	canon('weeds', "I just couldn't take another day of eating weeds.", 4, 943, 'hungry'),
	canon('payback', "I really am sorry. I'll pay you back next month.", 4, 947, 'money'),
	canon('bonk', "It's okay. If they boo you, I'll give them a bonk with my bass. Bonk.", 1, 129, 'music'),
	canon('moneypit', "So until you get popular, it's a money pit.", 2, 290, 'money'),
	canon('dog', "Sorry, my dog Pe'z has to have surgery.", 7, 1441, 'default'),
	canon('borrow', "I'll never borrow money from anyone again.", 10, 2444, 'money'),
	canon('lessons', "My lessons don't come cheap.", 10, 2466, 'money'),
	// Special days. Ryo's birthday is 18 september (official character profile).
	...lines('event', 'happy', ["it's my birthday. gifts are accepted. especially basses."], { conditions: { date: '09-18' }, weight: 60, cooldown: 3600 }),
	...lines('event', 'sad', ['another year. i still have no money.'], { conditions: { date: '12-31' }, weight: 60, cooldown: 3600 }),
	...lines('event', 'happy', ['merry christmas. i asked for a bass. again.'], { conditions: { date: '12-25' }, weight: 60, cooldown: 3600 }),
	...lines('event', 'default', ["i'm quitting music to become an accountant. ...april fools. obviously."], { conditions: { date: '04-01' }, weight: 60, cooldown: 3600 }),
	...lines('event', 'default', ["i'm dressed up as someone with money. scary, right?"], { conditions: { date: '10-31' }, weight: 60, cooldown: 3600 })
];

export const companionDefaults: CompanionSettings = {
	enabled: true,
	name: 'ryo',
	subtitle: 'resident bassist of sundei.ee',
	// One picture per mood (see static/companion/ryo/manifest.json for where each came from).
	sprites: {
		default: '/companion/ryo/default.png',
		talking: '/companion/ryo/explaining.webp',
		happy: '/companion/ryo/approving.webp',
		sleepy: '/companion/ryo/indifferent.webp',
		sleeping: '/companion/ryo/sleeping.webp',
		annoyed: '/companion/ryo/annoyed.webp',
		hungry: '/companion/ryo/hungry.webp',
		eating: '/companion/ryo/eating.webp',
		music: '/companion/ryo/bass.webp',
		listening: '/companion/ryo/listening.webp',
		embarrassed: '/companion/ryo/embarrassed.webp',
		thinking: '/companion/ryo/thinking.webp',
		surprised: '/companion/ryo/excited.webp',
		sad: '/companion/ryo/sad.webp',
		money: '/companion/ryo/grass.webp',
		headpat: '/companion/ryo/embarrassed-2.webp'
	},
	credits: {
		default: 'pinterest (artist unknown)',
		talking: 'source not recorded',
		happy: 'source not recorded',
		sleepy: 'source not recorded',
		sleeping: 'source not recorded',
		annoyed: 'source not recorded',
		hungry: 'twitter image (artist unknown)',
		eating: 'bocchi the rock! anime clip (gif from klipy.com), background removed',
		music: 'charaon.jp acrylic stand photo',
		listening: 'cdjapan.co.jp acrylic photo',
		embarrassed: 'source not recorded',
		thinking: 'bocchi the rock! anime still, background removed',
		surprised: 'source not recorded',
		sad: 'source not recorded',
		money: 'cospa.com sticker photo',
		headpat: 'source not recorded'
	},
	size: 112,
	position: 'bottom-right',
	draggable: true,
	opacity: 100,
	animation: 70,
	bubble: 'auto',
	typewriter: true,
	pages: 'home',
	desktop: true,
	mobile: false,
	behaviour: { idle: true, autoTalk: 'rare', sleepAfter: 5, sleepFor: 10, music: true, weather: true, pageReactions: true, annoyAfter: 6, rareChance: 4 },
	interactions: { headpats: true, money: true, grass: true, song: true, sleep: true, stats: true, donation: 100, cooldown: 2 },
	achievements: { enabled: true, donated: 10000, grass: 10, clicks: 20, headpats: 50, days: 7, minutes: 15 },
	purchases: [
		{ id: 'strings', item: 'a set of bass strings', price: 800, kind: 'strings', line: 'new strings. they sound expensive. they were.' },
		{ id: 'album', item: 'an album on vinyl', price: 2800, kind: 'album', line: 'i bought an album. on vinyl. for the bass tone.' },
		{ id: 'pedal', item: 'an effect pedal', price: 4500, kind: 'pedal', line: 'this pedal was essential.' },
		{ id: 'amp', item: 'a small amp', price: 8000, kind: 'amp', line: "i bought an amp. my neighbours don't know yet." },
		{ id: 'bass', item: 'a used bass', price: 12000, kind: 'bass', line: "i bought a new bass. don't ask how much." },
		{ id: 'food', item: 'actual food', price: 500, kind: 'food', line: 'i bought food. real food. a rare event.' }
	],
	dialogue: DEFAULT_DIALOGUE
};

/** Old cozy settings (one list of lines) → general dialogue entries, skipping ones already there. */
export function migrateLegacyLines(old: string[], existing: DialogueEntry[]): DialogueEntry[] {
	const known = new Set(existing.map((e) => e.text.toLowerCase()));
	return old
		.map((t) => t.trim())
		.filter((t) => t && !known.has(t.toLowerCase()))
		.map((text, i) => ({
			id: `legacy-${i + 1}`,
			text,
			category: /\{(song|artist)\}/.test(text) ? 'music' : 'general',
			expression: /\{(song|artist)\}/.test(text) ? 'listening' : 'default',
			weight: 10,
			rarity: 'common',
			conditions: {},
			cooldown: 300,
			source: null,
			enabled: true
		}));
}
