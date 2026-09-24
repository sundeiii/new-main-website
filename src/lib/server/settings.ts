import { ensureSchema, isMissingTable, run, sql } from '$lib/server/db';
import { settingDefaults, type SiteSettings } from '$lib/siteSettings';

export const ensureSettingsTable = ensureSchema;

/**
 * Saved value merged over the defaults (so new fields get their default). Public pages pass
 * createTable: false; if nothing was saved yet, or the database is unreachable, they get defaults.
 */
export async function getSetting<K extends keyof SiteSettings>(key: K, { createTable = false } = {}): Promise<SiteSettings[K]> {
	const defaults = settingDefaults[key];
	try {
		if (createTable) await ensureSettingsTable();
		const rows = await sql('SELECT v FROM site_settings WHERE k = ?', [key]);
		if (!rows[0]) return defaults;
		return { ...defaults, ...JSON.parse(rows[0].v) };
	} catch (error: any) {
		if (!isMissingTable(error)) console.error(`Failed to load setting ${key}:`, error);
		return defaults;
	}
}

export async function setSetting<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
	await ensureSettingsTable();
	await run(
		`INSERT INTO site_settings (k, v, updated_at) VALUES (?, ?, ?)
		ON CONFLICT (k) DO UPDATE SET v = excluded.v, updated_at = excluded.updated_at`,
		[key, JSON.stringify(value), new Date()]
	);
}
