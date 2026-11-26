import { writable } from 'svelte/store';
import { settingDefaults, type CozySettings } from '$lib/siteSettings';

// The little things (greeting, footer thoughts, the cat, ryo), set in /admin → cozy.
// Loaded once per visit, in the browser.

export const cozy = writable<CozySettings | null>(null);
let asked = false;
export function loadCozy() {
	if (asked) return;
	asked = true;
	fetch('/api/site/cozy')
		.then((r) => (r.ok ? r.json() : null))
		.then((s) => cozy.set(s ?? settingDefaults.cozy))
		.catch(() => cozy.set(settingDefaults.cozy));
}

/** Ryo hidden by this visitor (remembered in this browser). She peeks from the corner, and ctrl+k can bring her back. */
export const companionClosed = writable(false);
export function setCompanionClosed(closed: boolean) {
	companionClosed.set(closed);
	try {
		if (closed) localStorage.setItem('companion-closed', '1');
		else localStorage.removeItem('companion-closed');
	} catch {}
}
export function restoreCompanionClosed() {
	try {
		companionClosed.set(localStorage.getItem('companion-closed') === '1');
	} catch {}
}

export const prefersReducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The active theme's id (set by the layout), for theme-specific touches like the trans flag. */
export const themeName = writable('');

/** Extra lines and thoughts while the trans theme is on. */
export const TRANS_LINES = ['trans rights. obviously.', "you're valid. now lend me 1000 yen.", 'nice flag. it goes with my hair, kind of.', "protect trans people. that one's not a bit."];
export const TRANS_THOUGHTS = ["you're valid, exactly as you are.", 'your name is your name.', 'trans rights are human rights.', 'be gentle with yourself today.', "you're allowed to take up space."];

/** Visitors can turn the night sky off from ctrl+k. */
export const nightSkyOff = writable(false);
export function restoreNightSky() {
	try {
		nightSkyOff.set(localStorage.getItem('night-sky-off') === '1');
	} catch {}
}
export function toggleNightSky() {
	nightSkyOff.update((off) => {
		try {
			localStorage.setItem('night-sky-off', off ? '0' : '1');
		} catch {}
		return !off;
	});
}

/** The season's mark for the greeting. */
export function seasonGlyph(d = new Date()) {
	const m = d.getMonth();
	return m === 11 || m <= 1 ? '❄' : m <= 4 ? '✿' : m <= 7 ? '☀' : '❦';
}
/** The footer cat's hat right now, if any: santa (december to jan 6), witch (oct 20 – nov 2), a flower (spring). */
export function catHat(d = new Date()): 'santa' | 'witch' | 'flower' | null {
	const m = d.getMonth();
	const day = d.getDate();
	if (m === 11 || (m === 0 && day <= 6)) return 'santa';
	if ((m === 9 && day >= 20) || (m === 10 && day <= 2)) return 'witch';
	if (m >= 2 && m <= 4) return 'flower';
	return null;
}

/** Night for the visitor: 22:00 to 6:00 their time. */
export const isNight = (d = new Date()) => d.getHours() >= 22 || d.getHours() < 6;

export const pickOne = <T>(list: T[], not?: T): T => {
	const options = list.length > 1 && not !== undefined ? list.filter((x) => x !== not) : list;
	return options[Math.floor(Math.random() * options.length)];
};

/**
 * Pixel art from rows of characters: each character is one pixel, coloured from `palette`
 * ('.' or a space is see-through). Neighbouring pixels of one colour become one <rect>.
 */
export function pixelRects(rows: string[], palette: Record<string, string>) {
	const rects: { x: number; y: number; w: number; fill: string }[] = [];
	rows.forEach((row, y) => {
		let x = 0;
		while (x < row.length) {
			const c = row[x];
			let w = 1;
			while (row[x + w] === c) w++;
			if (palette[c]) rects.push({ x, y, w, fill: palette[c] });
			x += w;
		}
	});
	return rects;
}
