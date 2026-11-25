import { getSetting } from '$lib/server/settings';

// Live up/down (and player counts) for the servers listed in /admin → server status.
// Checked server-side so visitors' browsers don't need CORS. Not cached by Vercel, so edits show
// straight away; each server reuses its last check for 30 seconds unless the list changed.
let last: { key: string; at: number; body: string } | null = null;
export interface ServiceStatus {
	name: string;
	link: string;
	note: string;
	up: boolean;
	ms: number | null;
	players: { online: number; stable?: number; lazer?: number } | null;
	version: string | null;
}

async function timed(url: string, ms = 4000) {
	const start = Date.now();
	const ctrl = new AbortController();
	const timer = setTimeout(() => ctrl.abort(), ms);
	try {
		const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'sundei.ee status check' } });
		return { res, ms: Date.now() - start };
	} finally {
		clearTimeout(timer);
	}
}

export async function GET() {
	const settings = await getSetting('status');
	const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
	if (!settings.show) return new Response(JSON.stringify({ show: false, items: [] }), { headers });
	const key = JSON.stringify(settings);
	if (last && last.key === key && Date.now() - last.at < 30_000) return new Response(last.body, { headers });

	const items: ServiceStatus[] = await Promise.all(
		settings.items.map(async (s) => {
			const out: ServiceStatus = { name: s.name, link: s.link, note: s.note, up: false, ms: null, players: null, version: null };
			try {
				const { res, ms } = await timed(s.check);
				out.up = res.ok;
				out.ms = ms;
				// A health endpoint may say its version, like Reprise's {"version":"0.5.0"}.
				if (res.ok && res.headers.get('content-type')?.includes('json')) {
					const d = await res.json().catch(() => null);
					if (typeof d?.version === 'string') out.version = d.version.slice(0, 20);
				}
			} catch {}
			if (s.players && out.up) {
				try {
					const { res } = await timed(s.players);
					const d = res.ok ? await res.json() : null;
					if (typeof d?.online === 'number') out.players = { online: d.online, stable: d.stable, lazer: d.lazer };
				} catch {}
			}
			return out;
		})
	);
	const body = JSON.stringify({ show: true, title: settings.title, items, checked: new Date().toISOString() });
	last = { key, at: Date.now(), body };
	return new Response(body, { headers });
}
