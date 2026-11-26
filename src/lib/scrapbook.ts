// Shared bits for /scrapbook and its admin editor: built-in stickers, paper colours, and the small
// "random" tilts and tape that make each item look stuck on by hand (the same on every visit).

/** Built-in stickers: pixel art, or a picture from the site. */
export const STICKERS: Record<string, { rows?: string[]; palette?: Record<string, string>; image?: string }> = {
	heart: {
		rows: ['.hh.hh.', 'hHhhhhh', 'hhhhhhh', '.hhhhh.', '..hhh..', '...h...'],
		palette: { h: '#D79AAA', H: '#f3d3dc' }
	},
	star: {
		rows: ['....g....', '...ggg...', 'gggGggggg', '.ggggggg.', '..ggggg..', '.ggg.ggg.', '.gg...gg.'],
		palette: { g: '#E6C255', G: '#f6e3a4' }
	},
	note: {
		rows: ['...bbbbb', '...bbbbb', '...b...b', '...b...b', '.bbb.bbb', 'bbbbbbbb', '.bb..bb.'],
		palette: { b: '#5D7FC0' }
	},
	moon: {
		rows: ['..mmm..', '.mmm...', 'mmm....', 'mmm....', 'mmm....', '.mmm...', '..mmm..'],
		palette: { m: '#E6C255' }
	},
	flower: {
		rows: ['.p.p.p.', '.ppppp.', '.pPpPp.', '.ppppp.', '..ppp..', '...s...', '.l.sll.', '.llsl..', '...s...'],
		palette: { p: '#8FB3E0', P: '#6f8fbf', s: '#5f8f6a', l: '#79a97f' }
	},
	cat: {
		rows: ['......o...o.', '.....obo.obo', '.....obbbbbo', '.....obebebo', '.....obbbnbo', '......olllo.', '.....obbgbo.', '....obbbbbbo', '...obbbbbbbo', 'o..obbbbbbbo', 'ob.obbbbblbo', 'obbobbbbblbo', '.obbbbbbblbo', '..oooooooooo'],
		palette: { o: '#2a3248', b: '#c8d0df', l: '#eef2f8', e: '#E6C255', n: '#c98b8b', g: '#E6C255' }
	},
	ryo: { image: '/ryo.png' }
};

export const PAPER: Record<string, { bg: string; line: string; ink: string }> = {
	cream: { bg: '#f6f0e1', line: 'rgb(120 140 180 / 0.25)', ink: '#2a3248' },
	blue: { bg: '#dde7f5', line: 'rgb(80 110 170 / 0.25)', ink: '#22304e' },
	gold: { bg: '#f5e5b3', line: 'rgb(150 120 60 / 0.25)', ink: '#3b3020' },
	mint: { bg: '#dcefe4', line: 'rgb(70 130 100 / 0.25)', ink: '#1f3a2c' },
	lavender: { bg: '#e7e1f5', line: 'rgb(110 90 170 / 0.25)', ink: '#2c2448' }
};

/** Washi tape: a few colours with a soft stripe or dot pattern. */
export const TAPES = [
	'repeating-linear-gradient(45deg, rgb(230 194 85 / 0.75) 0 6px, rgb(246 227 164 / 0.75) 6px 12px)',
	'repeating-linear-gradient(90deg, rgb(143 179 224 / 0.75) 0 5px, rgb(214 228 246 / 0.75) 5px 10px)',
	'radial-gradient(circle at 4px 4px, rgb(255 255 255 / 0.7) 1.5px, transparent 2px) 0 0 / 8px 8px, rgb(140 199 171 / 0.75)',
	'repeating-linear-gradient(-45deg, rgb(165 150 214 / 0.75) 0 4px, rgb(226 220 245 / 0.75) 4px 8px)'
];

/** A stable number in [0, 1) from a string, for the hand-placed look. */
export function seeded(key: string) {
	let h = 2166136261;
	for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
	return ((h >>> 0) % 10000) / 10000;
}
