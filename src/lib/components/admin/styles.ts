// Shared Tailwind class strings for the admin panel.
export const field =
	'w-full px-3 py-2 border border-ocean-300 dark:border-ocean-600 rounded bg-white dark:bg-ocean-800 text-ocean-900 dark:text-ocean-100 text-sm';
const button = 'px-3 py-1.5 text-sm rounded transition-colors disabled:opacity-50';
export const primary = `${button} bg-ocean-600 hover:bg-ocean-700 text-white`;
export const subtle = `${button} border border-ocean-300 dark:border-ocean-600 text-ocean-700 dark:text-ocean-300 hover:bg-ocean-200 dark:hover:bg-ocean-800`;
export const danger = `${button} bg-red-600 hover:bg-red-700 text-white`;
export const fieldLabel = 'block text-xs text-ocean-600 dark:text-ocean-400 mb-1';

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
