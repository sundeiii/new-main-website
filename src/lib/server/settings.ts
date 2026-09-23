import { pool } from '$lib/server/db';
import { once } from '$lib/server/migrate';
import { settingDefaults, type SiteSettings } from '$lib/siteSettings';

export const ensureSettingsTable = once(() =>
	pool.query(
		`CREATE TABLE IF NOT EXISTS site_settings (
			k VARCHAR(50) PRIMARY KEY,
			v MEDIUMTEXT NOT NULL,
			updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
	)
);

/**
 * Saved value merged over the defaults (so new fields get their default). Public pages pass
 * createTable: false; if nothing was saved yet, or the database is unreachable, they get defaults.
 */
export async function getSetting<K extends keyof SiteSettings>(key: K, { createTable = false } = {}): Promise<SiteSettings[K]> {
	const defaults = settingDefaults[key];
	try {
		if (createTable) await ensureSettingsTable();
		const [rows]: any = await pool.query('SELECT v FROM site_settings WHERE k = ?', [key]);
		if (!rows[0]) return defaults;
		return { ...defaults, ...JSON.parse(rows[0].v) };
	} catch (error: any) {
		if (error?.code !== 'ER_NO_SUCH_TABLE') console.error(`Failed to load setting ${key}:`, error);
		return defaults;
	}
}

export async function setSetting<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
	await ensureSettingsTable();
	await pool.query('INSERT INTO site_settings (k, v) VALUES (?, ?) ON DUPLICATE KEY UPDATE v = VALUES(v)', [key, JSON.stringify(value)]);
}
