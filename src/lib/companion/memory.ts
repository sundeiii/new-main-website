import type { DialogueMemory } from './dialogue';

// What Ryo remembers about this visitor, in this browser only: her fictional money, counters for
// the stats popup, where she was dragged to, and which lines she said lately.

export interface CompanionMemory extends DialogueMemory {
	money: number;
	donated: number;
	headpats: number;
	grass: number;
	talks: number;
	basses: number;
	purchases: string[];
	/** Days (YYYY-MM-DD) this browser visited, newest last, at most 60. */
	days: string[];
	/** Minutes on the site with her visible. */
	minutes: number;
	/** Left/top in px from the viewport's top-left, or null for the corner. */
	position: { x: number; y: number } | null;
	hidden: boolean;
	lastGreet: string;
}

const KEY = 'ryo-companion';

export const blankMemory = (): CompanionMemory => ({
	money: 0,
	donated: 0,
	headpats: 0,
	grass: 0,
	talks: 0,
	basses: 0,
	purchases: [],
	days: [],
	minutes: 0,
	position: null,
	hidden: false,
	lastGreet: '',
	recent: [],
	last: {}
});

export function loadMemory(): CompanionMemory {
	try {
		const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
		if (saved && typeof saved === 'object') return { ...blankMemory(), ...saved };
	} catch {
		// storage blocked (private mode etc.): she just forgets
	}
	return blankMemory();
}

export function saveMemory(memory: CompanionMemory) {
	try {
		localStorage.setItem(KEY, JSON.stringify(memory));
	} catch {
		// storage blocked (private mode etc.): she just forgets
	}
}

export function forgetMemory() {
	try {
		localStorage.removeItem(KEY);
	} catch {
		// storage blocked (private mode etc.): she just forgets
	}
}

export const todayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
