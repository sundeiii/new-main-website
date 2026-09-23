/** osu!'s old-style country flag, e.g. EE → https://assets.ppy.sh/old-flags/EE.png */
export const flagUrl = (countryCode: string | null | undefined) =>
	`https://assets.ppy.sh/old-flags/${(countryCode ?? '').toUpperCase()}.png`;

/** English country name from its code, e.g. EE → Estonia (falls back to the code). */
export function countryName(countryCode: string | null | undefined) {
	if (!countryCode) return '';
	try {
		return new Intl.DisplayNames(['en'], { type: 'region' }).of(countryCode.toUpperCase()) ?? countryCode;
	} catch {
		return countryCode;
	}
}
