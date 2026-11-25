// The site's themes, edited in /admin → pages → themes. Each one is a whole look:
// page colours, an accent, a background (moving mesh, solid, gradient or picture) and how the
// see-through "glass" parts (nav, cards, menus) sit on top of it.

export type ThemeBackground = 'mesh' | 'solid' | 'gradient' | 'image';

export interface Theme {
	id: string;
	name: string;
	/** Left out of the picker entirely. */
	hidden: boolean;
	/** Only in the picker once unlocked: with ?theme=<id>, or `tf` for the trans one. */
	secret: boolean;
	/** "both" follows the dark mode switch; "light"/"dark" always uses that one. */
	mode: 'both' | 'light' | 'dark';
	/** Page background colour, behind everything else. */
	light: string;
	dark: string;
	/** Links, the active nav pill, timeline dots, text selection, progress bars. */
	accent: string;
	/** Optional CSS background for the theme's dot in the picker (defaults to the accent). */
	swatch: string;
	background: ThemeBackground;
	/** Mesh: 2–6 colours that drift slowly behind the page. */
	mesh: string[];
	/** Mesh: how strongly it shows, 0–60 (%). */
	meshStrength: number;
	/** Gradient: a CSS gradient, e.g. linear-gradient(135deg, #1e2b45, #3b5584). */
	gradient: string;
	/** Picture: an uploaded image. */
	image: string;
	/** Picture: cover fills the screen, tile repeats it, contain shows all of it. */
	fit: 'cover' | 'tile' | 'contain';
	/** Picture or gradient: blur in px (0–40). */
	blur: number;
	/** Picture or gradient: darkens (dark mode) or lightens (light mode) it so text stays readable, 0–90 (%). */
	dim: number;
	/** Nav, cards and menus: how solid they are (0 = clear, 100 = solid) and their blur in px. */
	glass: number;
	glassBlur: number;
	/** Optional CSS gradient for a thin stripe along the top of the page. */
	stripe: string;
	/** Cursor trail: one colour, or two (body, then tip). */
	trail: string[];
}

export interface ThemesSettings {
	items: Theme[];
	/** The theme new visitors start in (the id of one of the items). */
	default: string;
}

const MESH = ['#8FA1B3', '#96B5B4', '#B48EAD', '#A3BE8C', '#EBCB8B', '#AB7967'];

const base = (id: string, name: string, light: string, dark: string, accent: string): Theme => ({
	id,
	name,
	hidden: false,
	secret: false,
	mode: 'both',
	light,
	dark,
	accent,
	swatch: '',
	background: 'mesh',
	mesh: MESH,
	meshStrength: 15,
	gradient: '',
	image: '',
	fit: 'cover',
	blur: 0,
	dim: 30,
	glass: 65,
	glassBlur: 16,
	stripe: '',
	trail: ['#00F0FF']
});

export const blankTheme = (): Theme => base('', '', '#f0f3f9', '#1c2128', '#8FA1B3');

export const themeDefaults: ThemesSettings = {
	default: 'ryo',
	items: [
		base('rose', 'rose', '#f9f0f5', '#281c21', '#B48EAD'),
		base('ocean', 'ocean', '#f0f3f9', '#1c2128', '#8FA1B3'),
		base('forest', 'forest', '#f0f5f1', '#1c2820', '#A3BE8C'),
		base('sunset', 'sunset', '#f5f2f0', '#28211c', '#EBCB8B'),
		base('lavender', 'lavender', '#f3f0f9', '#221c28', '#9B8EC4'),
		base('mono', 'mono', '#f5f5f5', '#1a1a1a', '#888888'),
		{
			...base('ryo', 'ryo', '#eef1f7', '#141824', '#4A6A9C'),
			swatch: 'linear-gradient(135deg, #3B5584 0 62%, #E6C255 62%)',
			mesh: ['#3B5584', '#6F8FBF', '#2A3A5C', '#6F8FBF', '#E6C255', '#4A6A9C'],
			meshStrength: 22,
			trail: ['#6F8FBF', '#E6C255']
		},
		{
			...base('trans', 'trans', '#fdf1f5', '#1f1c2a', '#F5A9B8'),
			secret: true,
			swatch: 'linear-gradient(#5BCEFA 0 20%, #F5A9B8 20% 40%, #FFFFFF 40% 60%, #F5A9B8 60% 80%, #5BCEFA 80%)',
			mesh: ['#5BCEFA', '#F5A9B8', '#5BCEFA', '#F5A9B8', '#FFFFFF', '#5BCEFA'],
			meshStrength: 28,
			stripe: 'linear-gradient(90deg, #5bcefa 0 20%, #f5a9b8 20% 40%, #ffffff 40% 60%, #f5a9b8 60% 80%, #5bcefa 80%)',
			trail: ['#5BCEFA', '#F5A9B8']
		}
	]
};

/** A CSS gradient that's safe to put in a style attribute (no url(), no breaking out of the value). */
export const isSafeGradient = (s: string) => /^(repeating-)?(linear|radial|conic)-gradient\([^;{}<>"'\\]*\)$/i.test(s) && !/url\s*\(/i.test(s);

/** #rrggbb(aa) or #rgb → rgba() with the given opacity (0–1). */
export function withAlpha(hex: string, alpha: number) {
	let h = hex.replace('#', '');
	if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
	const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) || 0);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Black or white, whichever reads better on the given colour. */
export function textOn(hex: string) {
	let h = hex.replace('#', '');
	if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
	const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
	const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
	return lum > 0.55 ? '#111111' : '#ffffff';
}
