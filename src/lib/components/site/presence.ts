import { derived, writable } from 'svelte/store';
import { lanyard } from '$lib/lanyard';
import { getCodeData } from '$lib/rpcUtils';

// What I'm up to right now, boiled down for the nav: one short line plus the details for
// its hover card. Built from Discord (games, VS Code, status) and Spotify (/api/now-playing,
// which already leaves out hidden artists).

export interface PresenceItem {
	label: string; // "playing", "listening", …
	title: string;
	sub?: string;
	image?: string;
	href?: string;
	live: boolean; // happening right now (vs paused / idle)
}

export interface Presence {
	status: 'online' | 'idle' | 'dnd' | 'offline';
	short: string;
	live: boolean;
	items: PresenceItem[];
}

const VSCODE_APP = '782685898163617802';
const OSU_APPS = new Set(['1216669957799018608', '367827983903490050']);

// Japanese titles shown in romaji, same as the home page.
const romaji = new Map<string, Promise<string>>();
function romanize(text: string): Promise<string> {
	if (!text || !/[぀-ヿ㐀-䶿一-龯＀-ﾟ]/.test(text)) return Promise.resolve(text);
	if (!romaji.has(text)) {
		romaji.set(
			text,
			fetch('/api/romanize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) })
				.then((r) => (r.ok ? r.json() : null))
				.then((d) => d?.romanized || text)
				.catch(() => text)
		);
	}
	return romaji.get(text)!;
}

// Spotify (/api/now-playing), polled every 5 s while anything is subscribed: the nav on every
// page and the home page share it, so the home page has it the moment you open it.
async function withRomaji(d: any, set: (v: any) => void, stopped: () => boolean) {
	const artists = (d?.track?.artists ?? []).map((x: any) => x.name).join(', ');
	// Show it straight away, then again with romaji once that's back.
	set(d && { ...d, artistLine: artists });
	if (d?.track) {
		const [title, artistLine] = await Promise.all([romanize(d.track.name), romanize(artists)]);
		if (!stopped()) set({ ...d, title, artistLine });
	}
}

export const nowPlaying = writable<any>(null, (set) => {
	if (typeof window === 'undefined') return;
	let stopped = false;
	const load = () =>
		fetch('/api/now-playing')
			.then((r) => (r.ok ? r.json() : null))
			.then((d) => !stopped && withRomaji(d, set, () => stopped))
			.catch(() => {});
	load();
	const id = setInterval(load, 5000);
	return () => {
		stopped = true;
		clearInterval(id);
	};
});


// Discord activity pictures: "mp:external/…" is proxied through Discord's media server, a bare
// number is one of the app's uploaded assets.
export function activityImage(image: string | undefined, appId: string | undefined): string | undefined {
	if (!image) return undefined;
	if (image.startsWith('mp:')) return `https://media.discordapp.net/${image.slice(3)}`;
	if (/^\d+$/.test(image) && appId) return `https://cdn.discordapp.com/app-assets/${appId}/${image}.png?size=128`;
	return undefined;
}

const statusWords = { online: 'online', idle: 'away', dnd: 'busy', offline: 'offline' } as const;

export const presence = derived([lanyard, nowPlaying], ([$l, $np]): Presence | null => {
	if (!$l) return null;
	const items: PresenceItem[] = [];

	for (const a of ($l.activities ?? []) as any[]) {
		if ((a.type !== 0 && a.type !== 3) || a.application_id === VSCODE_APP || a.name?.toLowerCase().includes('spotify')) continue;
		const paused = a.assets?.small_image?.includes('pause') || a.assets?.small_text?.toLowerCase() === 'paused';
		const osu = OSU_APPS.has(a.application_id ?? '') || a.name === 'osu!';
		items.push({
			label: a.type === 3 ? 'watching' : 'playing',
			title: a.name,
			sub: osu ? [a.details, a.state].filter(Boolean).join(' · ') : a.details || a.state,
			image: activityImage(a.assets?.large_image, a.application_id),
			live: !paused
		});
	}

	if ($np?.track && $np.isPlayingNow) {
		items.push({
			label: 'listening',
			title: $np.title ?? $np.track.name,
			sub: $np.artistLine,
			image: $np.track.album?.images?.[2]?.url ?? $np.track.album?.images?.[0]?.url,
			href: $np.track.external_urls?.spotify,
			live: !$np.isPaused
		});
	}

	const code = getCodeData($l);
	if (code) {
		items.push({
			label: 'coding',
			title: code.idling ? 'vs code' : code.workspace ?? 'vs code',
			sub: code.idling ? 'idling' : code.lang ? `writing ${code.lang}` : undefined,
			live: !code.idling
		});
	}

	const status = ($l.discord_status ?? 'offline') as Presence['status'];
	// Prefer something happening right now; games beat music beat code.
	const first = items.find((i) => i.live) ?? items[0];
	const short = !first
		? statusWords[status]
		: first.live
			? `${first.label} ${first.label === 'listening' ? 'to ' : ''}${first.title}`
			: `paused · ${first.title}`;
	return { status, short, live: !!first?.live, items };
});
