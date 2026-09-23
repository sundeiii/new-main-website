// Event dates are plain YYYY-MM-DD strings (no time zone), compared as strings.

export const today = () => {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const parse = (d: string) => new Date(d + 'T00:00:00');

export const formatDate = (d: string) => parse(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

/** "September 11 – 13, 2026", "Aug 30 – Sep 2, 2026", or a single date. */
export function formatRange(start: string, end?: string | null) {
	if (!end || end === start) return formatDate(start);
	const a = parse(start);
	const b = parse(end);
	if (a.getFullYear() !== b.getFullYear()) return `${formatDate(start)} – ${formatDate(end)}`;
	if (a.getMonth() === b.getMonth()) {
		return `${a.toLocaleDateString('en-US', { month: 'long' })} ${a.getDate()} – ${b.getDate()}, ${b.getFullYear()}`;
	}
	const short = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	return `${short(a)} – ${short(b)}, ${b.getFullYear()}`;
}

export const daysBetween = (from: string, to: string) => Math.round((parse(to).getTime() - parse(from).getTime()) / 864e5);

export type EventTiming = 'upcoming' | 'now' | 'past';

export function eventTiming(e: { date: string; endDate?: string | null }, on = today()): EventTiming {
	if (on < e.date) return 'upcoming';
	if (on <= (e.endDate || e.date)) return 'now';
	return 'past';
}
