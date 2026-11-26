import { writable } from 'svelte/store';
import { collectibleById, LETTER_PAGES, STAR_PAGES, type Collectible } from '$lib/collectibles';

// The visitor's passport: which stamps (and hidden stars / letters) they've found, kept in this
// browser. collect() adds one, shows the toast, and tells /api/found once.

const KEY = 'passport';
type Saved = { stamps: Record<string, string>; stars: string[]; letters: string[] };

function read(): Saved {
	try {
		const s = JSON.parse(localStorage.getItem(KEY) ?? '');
		return { stamps: s.stamps ?? {}, stars: s.stars ?? [], letters: s.letters ?? [] };
	} catch {
		return { stamps: {}, stars: [], letters: [] };
	}
}

export const passport = writable<Saved>({ stamps: {}, stars: [], letters: [] });
/** The stamp just found, for the toast. */
export const justFound = writable<Collectible | null>(null);

let loaded = false;
function current() {
	if (!loaded && typeof localStorage !== 'undefined') {
		passport.set(read());
		loaded = true;
	}
	let value!: Saved;
	passport.subscribe((v) => (value = v))();
	return value;
}
function save(value: Saved) {
	passport.set(value);
	try {
		localStorage.setItem(KEY, JSON.stringify(value));
	} catch {}
}

export function loadPassport() {
	current();
}

let toastTimer: ReturnType<typeof setTimeout>;
export function collect(id: string) {
	if (typeof window === 'undefined') return;
	const p = current();
	const stamp = collectibleById(id);
	if (!stamp || p.stamps[id]) return;
	save({ ...p, stamps: { ...p.stamps, [id]: new Date().toISOString() } });
	fetch('/api/found', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }).catch(() => {});
	justFound.set(stamp);
	clearTimeout(toastTimer);
	toastTimer = setTimeout(() => justFound.set(null), 5000);
}

export function findStar(path: string) {
	const p = current();
	if (p.stars.includes(path)) return;
	const stars = [...p.stars, path];
	save({ ...p, stars });
	collect('stargazer');
	if (STAR_PAGES.every((s) => stars.includes(s))) setTimeout(() => collect('constellation'), 5200);
}

export function openLetter(path: string) {
	const p = current();
	if (!p.letters.includes(path)) {
		const letters = [...p.letters, path];
		save({ ...p, letters });
		collect('letter');
		if (LETTER_PAGES.every((l) => letters.includes(l))) setTimeout(() => collect('postman'), 5200);
	}
}

export function forgetPassport() {
	save({ stamps: {}, stars: [], letters: [] });
}
