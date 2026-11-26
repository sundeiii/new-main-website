import { writable } from 'svelte/store';
import { settingDefaults } from '$lib/siteSettings';
import type { CompanionSettings } from './types';

// Ryo's settings for the page (loaded once per visit), and the bits of site data she reacts to,
// handed over by the layout so she doesn't fetch anything twice.

export const companionSettings = writable<CompanionSettings | null>(null);
let asked = false;
export function loadCompanion() {
	if (asked) return;
	asked = true;
	fetch('/api/site/companion')
		.then((r) => (r.ok ? r.json() : null))
		.then((s) => companionSettings.set(s ?? settingDefaults.companion))
		.catch(() => companionSettings.set(settingDefaults.companion));
}

/** The weather in the nav (from /api/weather, fetched by the layout). */
export const weatherNow = writable<{ temp: number; unit?: string; description: string; icon: string } | null>(null);
/** The site's visit total (from the hit counter, fetched by the layout). */
export const visitsNow = writable<number | null>(null);
