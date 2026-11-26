import { ensureSchema, isMissingTable, run, sql } from '$lib/server/db';
import { settingDefaults, type SiteSettings } from '$lib/siteSettings';
import { migrateLegacyLines } from '$lib/companion/defaults';

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
		if (!rows[0]) return key === 'companion' ? ((await companionFromCozy()) as SiteSettings[K]) : defaults;
		const saved = JSON.parse(rows[0].v);
		// Nested groups get their new fields too.
		if (key === 'companion') {
			const d = defaults as SiteSettings['companion'];
			return { ...d, ...saved, sprites: { ...d.sprites, ...saved.sprites }, credits: { ...d.credits, ...saved.credits }, behaviour: { ...d.behaviour, ...saved.behaviour }, interactions: { ...d.interactions, ...saved.interactions }, achievements: { ...d.achievements, ...saved.achievements } };
		}
		return { ...defaults, ...saved };
	} catch (error: any) {
		if (!isMissingTable(error)) console.error(`Failed to load setting ${key}:`, error);
		return defaults;
	}
}

/**
 * Before the companion has its own saved settings: start from the defaults and carry over what
 * the old cozy settings had (on/off, name, picture, and her lines as general dialogue).
 */
async function companionFromCozy(): Promise<SiteSettings['companion']> {
	const d = settingDefaults.companion;
	const [row] = await sql("SELECT v FROM site_settings WHERE k = 'cozy'");
	if (!row) return d;
	const cozy = JSON.parse(row.v);
	const picture = typeof cozy.companionImage === 'string' && cozy.companionImage && cozy.companionImage !== '/ryo.png' ? cozy.companionImage : d.sprites.default;
	return {
		...d,
		enabled: cozy.companion !== false,
		name: cozy.companionName || d.name,
		sprites: { ...d.sprites, default: picture },
		interactions: { ...d.interactions, headpats: cozy.headpats !== false },
		dialogue: [...d.dialogue, ...migrateLegacyLines(Array.isArray(cozy.companionLines) ? cozy.companionLines : [], d.dialogue)]
	};
}

export async function setSetting<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
	await ensureSettingsTable();
	await run(
		`INSERT INTO site_settings (k, v, updated_at) VALUES (?, ?, ?)
		ON CONFLICT (k) DO UPDATE SET v = excluded.v, updated_at = excluded.updated_at`,
		[key, JSON.stringify(value), new Date()]
	);
}

/** When each of these settings was last saved (ISO strings), or null if never / unknown. */
export async function settingsUpdated(keys: (keyof SiteSettings)[]): Promise<Record<string, string | null>> {
	const out: Record<string, string | null> = Object.fromEntries(keys.map((k) => [k, null]));
	if (!keys.length) return out;
	try {
		const rows = await sql(`SELECT k, updated_at FROM site_settings WHERE k IN (${keys.map(() => '?').join(', ')})`, keys);
		for (const r of rows) out[r.k] = r.updated_at ?? null;
	} catch (error) {
		if (!isMissingTable(error)) console.error('Failed to load setting dates:', error);
	}
	return out;
}
