import { readable } from 'svelte/store';

// sk-lanyard never closes its websocket or clears its heartbeat, so every visit to a page
// using it leaked a live connection. This is a single shared connection that closes once
// nothing is subscribed.

const WS_URL = 'wss://api.lanyard.rest/socket';

export const DISCORD_ID = '1113690068113170484';

export const lanyard = readable<any>(undefined, (set) => {
	if (typeof window === 'undefined') return;

	let ws: WebSocket;
	let heartbeat: ReturnType<typeof setInterval> | undefined;
	let reconnect: ReturnType<typeof setTimeout> | undefined;
	let stopped = false;

	function connect() {
		ws = new WebSocket(WS_URL);
		ws.onopen = () => ws.send(JSON.stringify({ op: 2, d: { subscribe_to_id: DISCORD_ID } }));
		ws.onmessage = (e) => {
			const msg = JSON.parse(e.data);
			if (msg.op === 1) {
				heartbeat = setInterval(() => ws.send(JSON.stringify({ op: 3 })), msg.d.heartbeat_interval);
			} else if (msg.op === 0) {
				set(msg.d);
			}
		};
		ws.onclose = () => {
			clearInterval(heartbeat);
			if (!stopped) reconnect = setTimeout(connect, 5000);
		};
	}

	connect();

	return () => {
		stopped = true;
		clearInterval(heartbeat);
		clearTimeout(reconnect);
		ws.close();
	};
});
