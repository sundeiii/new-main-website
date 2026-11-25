// Shared Tailwind class strings for the admin panel.
export const field =
	'w-full px-3 py-2 rounded-xl border border-ocean-300/70 dark:border-ocean-700/70 bg-white/60 dark:bg-black/20 text-ocean-900 dark:text-ocean-100 text-sm placeholder:text-ocean-400 dark:placeholder:text-ocean-600 focus:outline-none focus:border-ocean-500 focus:ring-2 focus:ring-ocean-400/30 transition';
const button = 'px-3.5 py-1.5 text-sm rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed';
export const primary = `${button} accent-bg text-[color:var(--accent-fg)] hover:brightness-110 active:scale-[0.97] shadow-sm`;
export const subtle = `${button} border border-ocean-300/70 dark:border-ocean-700/70 text-ocean-700 dark:text-ocean-300 hover:bg-ocean-200/60 dark:hover:bg-ocean-800/60`;
export const danger = `${button} border border-red-400/50 text-red-600 dark:text-red-400 hover:bg-red-500 hover:border-red-500 hover:text-white`;
export const fieldLabel = 'block text-[11px] uppercase tracking-widest text-ocean-500 mb-1.5';

/** fetch + JSON with the admin API's error shape. Calls onUnauthorized on 401. */
export async function adminApi(url: string, method: string, body?: unknown, onUnauthorized?: () => void) {
	const res = await fetch(url, {
		method,
		headers: body ? { 'Content-Type': 'application/json' } : undefined,
		body: body ? JSON.stringify(body) : undefined
	});
	const data = await res.json().catch(() => ({}));
	if (res.status === 401) onUnauthorized?.();
	if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
	return data;
}
