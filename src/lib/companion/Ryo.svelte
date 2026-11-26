<script lang="ts">
	// Ryo, the site companion. Lives in the layout (so she keeps her state across page changes)
	// and shows on the home page or everywhere, per /admin → ryo.
	//
	// Click her head for a headpat, the rest of her to talk; right-click or ⋯ for the menu. She has
	// moods (sprites per state, falling back to the default picture), says things that fit the
	// moment (see ./dialogue), keeps fictional money, eats grass, falls asleep when nobody's around,
	// and can be dragged somewhere else. What she remembers stays in this browser (./memory).
	//
	// `preview` is the admin's test version: no saving, no network, no passport stamps, and the
	// moment (time, page, song, weather) comes from `sim`.
	import { createEventDispatcher, onDestroy, onMount, tick } from 'svelte';
	import { fade, fly, scale } from 'svelte/transition';
	import { nowPlaying } from '$lib/components/site/presence';
	import { collect } from '$lib/components/cozy/collect';
	import { companionClosed, setCompanionClosed, themeName, TRANS_LINES } from '$lib/components/cozy/cozy';
	import Pixels from '$lib/components/cozy/Pixels.svelte';
	import { COLLECTIBLES } from '$lib/collectibles';
	import { passport } from '$lib/components/cozy/collect';
	import { companionSettings, visitsNow, weatherNow } from './store';
	import { pickLine, weatherKind, type DialogueContext, type Trigger } from './dialogue';
	import { blankMemory, forgetMemory, loadMemory, saveMemory, todayKey, type CompanionMemory } from './memory';
	import { EXPRESSION_STATE, STATE_EXPRESSION, type CompanionSettings, type CompanionState, type DialogueEntry, type Expression, type WeatherKind } from './types';

	export let path = '/';
	export let preview = false;
	/** Admin preview: the settings being edited. */
	export let config: CompanionSettings | null = null;
	/** Admin preview: the moment to pretend it is. */
	export let sim: { hour: number; page: string; song: { title: string; artist: string; album: string } | null; weather: { kind: WeatherKind; description: string; temperature: string } | null; visitor: 'first' | 'returning' } | null = null;

	$: s = (preview ? config : $companionSettings) as CompanionSettings | null;

	// ── where she shows ──
	let mounted = false;
	let wide = true;
	let reduced = false;
	$: here = preview || (s && s.enabled && (s.pages === 'all' ? !path.startsWith('/admin') : path === '/') && (wide ? s.desktop : s.mobile));
	$: closed = !preview && $companionClosed;
	$: amp = reduced ? 0 : (s?.animation ?? 70) / 100;

	// ── state ──
	let state: CompanionState = 'idle';
	let memory: CompanionMemory = blankMemory();
	let line = '';
	let shown = '';
	let lineTimer: ReturnType<typeof setTimeout>;
	let typeTimer: ReturnType<typeof setInterval>;
	let moodTimer: ReturnType<typeof setTimeout>;
	let sleepingUntil = 0;
	let menuOpen = false;
	let statsOpen = false;
	let lastAction = 0;
	let clicks: number[] = [];
	let autoSaid = 0;
	let globalPats: number | null = null;
	let pendingPats = 0;
	let patTimer: ReturnType<typeof setTimeout>;

	$: song = preview
		? sim?.song ?? null
		: $nowPlaying?.track && $nowPlaying.isPlayingNow && !$nowPlaying.isPaused
			? { title: $nowPlaying.title ?? $nowPlaying.track.name, artist: $nowPlaying.artistLine ?? $nowPlaying.track.artists?.[0]?.name ?? '', album: $nowPlaying.track.album?.name ?? '' }
			: null;
	$: weather = preview
		? sim?.weather ?? null
		: $weatherNow?.icon
			? { kind: weatherKind($weatherNow.icon), description: $weatherNow.description, temperature: `${$weatherNow.temp}°${$weatherNow.unit ?? 'C'}` }
			: null;
	$: sleeping = state === 'sleeping';
	$: expression = STATE_EXPRESSION[state] as Expression;
	$: sprite = (s && (s.sprites[expression] || s.sprites.default)) || '/companion/ryo/default.png';
	$: trans = $themeName === 'trans';

	function context(extra?: Record<string, string>): DialogueContext {
		const now = new Date();
		if (preview && sim) now.setHours(sim.hour, 0, 0, 0);
		return {
			now,
			page: preview ? sim?.page ?? '/' : path,
			visitor: preview ? sim?.visitor ?? 'first' : memory.days.length <= 1 ? 'first' : 'returning',
			song,
			weather,
			money: memory.money,
			visits: preview ? 1234 : $visitsNow,
			headpats: preview ? memory.headpats : globalPats,
			extra
		};
	}

	function persist() {
		if (!preview) saveMemory(memory);
	}
	const dispatch = createEventDispatcher<{ stamp: string; said: string }>();
	/** A passport stamp; the admin preview only reports it. */
	function stamp(id: string) {
		if (!s?.achievements.enabled) return;
		if (preview) dispatch('stamp', id);
		else collect(id);
	}

	// ── talking ──
	function show(text: string, expr: Expression = 'default', hold = 0) {
		line = text;
		clearInterval(typeTimer);
		if (s?.typewriter && !reduced) {
			shown = '';
			let i = 0;
			typeTimer = setInterval(() => {
				i += 2;
				shown = text.slice(0, i);
				if (i >= text.length) clearInterval(typeTimer);
			}, 28);
		} else shown = text;
		if (!sleeping || expr === 'sleeping') mood(EXPRESSION_STATE[expr] ?? 'talking', hold || Math.max(3500, text.length * 70));
		clearTimeout(lineTimer);
		lineTimer = setTimeout(() => (line = ''), Math.max(3500, text.length * 70) + 1200);
		memory.talks++;
		persist();
		tick().then(placeBubble);
	}
	function say(trigger: Trigger, extra?: Record<string, string>) {
		if (!s) return null;
		const pool = trans ? [...s.dialogue, ...TRANS_LINES.map((text, i) => transEntry(text, i))] : s.dialogue;
		const picked = pickLine(pool, trigger, context(extra), memory, s.behaviour.rareChance);
		if (!picked) return null;
		show(picked.text, picked.entry.expression);
		if (preview) dispatch('said', picked.entry.id);
		if (picked.entry.category === 'rare') stamp('ryo-sincere');
		return picked;
	}
	const transEntry = (text: string, i: number): DialogueEntry => ({ id: `trans-${i}`, text, category: 'general', expression: 'default', weight: 14, rarity: 'common', conditions: {}, cooldown: 300, source: null, enabled: true });

	/** A mood for a while, then back to idle (or asleep). */
	function mood(next: CompanionState, ms = 4000) {
		state = next;
		clearTimeout(moodTimer);
		if (next !== 'sleeping') moodTimer = setTimeout(() => (state = 'idle'), ms);
	}

	// ── particles ──
	type Particle = { id: number; kind: 'heart' | 'note' | 'yen' | 'leaf' | 'z' | 'question' | 'sparkle' | 'mark'; x: number; delay: number };
	let particles: Particle[] = [];
	let pid = 0;
	function burst(kind: Particle['kind'], n = 3) {
		if (amp === 0) return;
		const fresh = Array.from({ length: n }, (_, i) => ({ id: ++pid, kind, x: 20 + Math.random() * 60, delay: i * 140 }));
		particles = [...particles.slice(-12), ...fresh];
		setTimeout(() => (particles = particles.filter((p) => !fresh.includes(p))), 2200 + n * 140);
	}
	const glyphs: Record<Particle['kind'], string> = { heart: '♡', note: '♪', yen: '¥', leaf: '', z: 'z', question: '?', sparkle: '✦', mark: '!' };

	/** A picture that won't load: show the default one instead (or the built-in one if that's the broken one). */
	function missing(e: Event) {
		const el = e.currentTarget as HTMLImageElement;
		const fallback = s?.sprites.default && !el.src.endsWith(s.sprites.default) ? s.sprites.default : '/companion/ryo/default.png';
		if (!el.src.endsWith(fallback)) el.src = fallback;
	}

	// ── actions (also what the menu and the admin preview call) ──
	type Action = 'talk' | 'headpat' | 'money' | 'grass' | 'song' | 'sleep' | 'wake' | 'stats' | 'hide' | 'purchase' | 'corner';
	export function perform(action: Action) {
		if (!s) return;
		const now = Date.now();
		if (!preview && !['stats', 'hide', 'corner'].includes(action) && now - lastAction < s.interactions.cooldown * 1000) return;
		lastAction = now;
		menuOpen = false;
		if (sleeping && action !== 'sleep' && action !== 'stats' && action !== 'hide') return wake();
		switch (action) {
			case 'talk':
				if (!say('talk')) show('...');
				break;
			case 'headpat':
				headpat();
				break;
			case 'money':
				donate();
				break;
			case 'purchase':
				if (!buySomething(true)) show(`${yen(memory.money)}. i can't afford anything. as usual.`, 'money');
				break;
			case 'grass':
				memory.grass++;
				persist();
				burst('leaf', 4);
				mood('eating_grass', 5000);
				say('grass') ?? show('grass. thank you.', 'hungry');
				if (memory.grass >= (s.achievements.grass ?? 10)) stamp('ryo-grass');
				break;
			case 'song':
				burst('note', 3);
				if (!say('song')) show(song ? `${song.title}. noted.` : 'nothing is playing.', song ? 'listening' : 'thinking');
				if (song) mood('listening', 6000);
				break;
			case 'sleep':
				sleepingUntil = Date.now() + s.behaviour.sleepFor * 60_000;
				fallAsleep(true);
				break;
			case 'wake':
				wake();
				break;
			case 'stats':
				statsOpen = !statsOpen;
				break;
			case 'hide':
				if (!preview) setCompanionClosed(true);
				break;
			case 'corner':
				memory.position = null;
				persist();
				tick().then(placeBubble);
				break;
		}
	}

	function headpat() {
		if (!s?.interactions.headpats) return say('talk');
		memory.headpats++;
		persist();
		burst('heart', 3);
		mood('receiving_headpat', 3000);
		if (Math.random() < 0.85) say('headpat') ?? show('hm.', 'headpat');
		stamp('headpat');
		if (memory.headpats >= s.achievements.headpats) stamp('ryo-pats');
		if (!preview) {
			pendingPats++;
			globalPats = (globalPats ?? 0) + 1;
			clearTimeout(patTimer);
			patTimer = setTimeout(sendPats, 1200);
		}
	}
	function sendPats() {
		const pats = Math.min(10, pendingPats);
		if (!pats) return;
		pendingPats -= pats;
		fetch('/api/headpats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pats }) })
			.then((r) => (r.ok ? r.json() : null))
			.then((d) => d && typeof d.total === 'number' && (globalPats = Math.max(globalPats ?? 0, d.total + pendingPats)))
			.catch(() => null); // offline: the count just stays local
		if (pendingPats) patTimer = setTimeout(sendPats, 1200);
	}

	function donate() {
		if (!s?.interactions.money) return;
		memory.money += s.interactions.donation;
		memory.donated += s.interactions.donation;
		persist();
		burst('yen', 3);
		if (memory.donated >= s.achievements.donated) stamp('ryo-broke');
		if (!buySomething(false)) {
			mood('receiving_money', 3500);
			say('money') ?? show(`¥${memory.money.toLocaleString('en-US')}. thank you.`, 'money');
		}
	}

	/** She spends it on the most expensive thing she can afford (food only rarely). */
	function buySomething(always: boolean) {
		if (!s) return false;
		const affordable = s.purchases.filter((p) => p.price <= memory.money && (p.kind !== 'food' || Math.random() < 0.1)).sort((a, b) => b.price - a.price);
		if (!affordable.length || (!always && Math.random() > 0.45)) return false;
		const item = affordable[0];
		memory.money -= item.price;
		memory.purchases = [...memory.purchases, item.id].slice(-50);
		if (item.kind === 'bass') {
			memory.basses++;
			stamp('ryo-bass');
		}
		persist();
		burst('sparkle', 3);
		if (item.line) show(item.line, 'happy');
		else say('purchase', { item: item.item }) ?? show(`i bought ${item.item}.`, 'happy');
		return true;
	}

	function fallAsleep(manual = false) {
		state = 'sleeping';
		clearTimeout(moodTimer);
		menuOpen = statsOpen = false;
		if (manual) show(Math.random() < 0.5 ? 'goodnight.' : 'zzz...', 'sleeping');
		burst('z', 3);
	}
	function wake() {
		sleepingUntil = 0;
		state = 'idle';
		burst('question', 1);
		say('wake') ?? show('...i was asleep.', 'sleepy');
	}

	// ── clicking, dragging ──
	let box: HTMLDivElement;
	let img: HTMLImageElement;
	/** The shown picture's height (updates once it has loaded), for placing the bubble and menu above her. */
	let imgH = 0;
	let drag: { dx: number; dy: number; x0: number; y0: number; moved: boolean } | null = null;
	let suppressClick = false;

	function pointerDown(e: PointerEvent) {
		if (e.button !== 0) return;
		const r = box.getBoundingClientRect();
		drag = { dx: e.clientX - r.left, dy: e.clientY - r.top, x0: e.clientX, y0: e.clientY, moved: false };
	}
	function pointerMove(e: PointerEvent) {
		if (!drag || preview || !s?.draggable) return;
		if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 6) return;
		drag.moved = true;
		menuOpen = statsOpen = false;
		memory.position = clampPos(e.clientX - drag.dx, e.clientY - drag.dy);
	}
	function pointerUp() {
		if (drag?.moved) {
			suppressClick = true;
			persist();
			tick().then(placeBubble);
		}
		drag = null;
	}
	const clampPos = (x: number, y: number) => {
		const r = box?.getBoundingClientRect();
		const w = r?.width ?? 120;
		const h = r?.height ?? 160;
		return { x: Math.round(Math.min(innerWidth - w - 4, Math.max(4, x))), y: Math.round(Math.min(innerHeight - h - 4, Math.max(60, y))) };
	};

	function click(e: MouseEvent) {
		if (suppressClick) return (suppressClick = false);
		if (!s) return;
		// Annoyance: lots of clicks in a short while.
		const now = Date.now();
		clicks = [...clicks.filter((t) => now - t < 30_000), now];
		const recent = clicks.filter((t) => now - t < 8000).length;
		if (clicks.length >= s.achievements.clicks) stamp('ryo-space');
		if (sleeping) return wake();
		if (recent >= s.behaviour.annoyAfter) {
			burst('mark', 1);
			mood('annoyed', 4000);
			return say('annoyed') ?? show('what.', 'annoyed');
		}
		// The top of her (the head) is a headpat; anywhere else, she talks.
		const r = img?.getBoundingClientRect();
		const onHead = r && e.clientY - r.top < r.height * 0.42;
		perform(onHead && e.detail ? 'headpat' : 'talk');
	}
	function keydown(e: KeyboardEvent) {
		if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
			e.preventDefault();
			menuOpen = true;
		}
	}

	// ── keeping the bubble on screen ──
	let bubble: HTMLDivElement;
	let bubbleSide: 'left' | 'right' = 'right';
	let bubbleBelow = false;
	function placeBubble() {
		if (!box) return;
		const r = box.getBoundingClientRect();
		const mid = r.left + r.width / 2;
		bubbleSide = s?.bubble === 'left' ? 'left' : s?.bubble === 'right' ? 'right' : mid > (preview ? box.parentElement?.getBoundingClientRect().left ?? 0 : 0) + (preview ? (box.parentElement?.clientWidth ?? 600) : innerWidth) / 2 ? 'right' : 'left';
		const imgTop = img?.getBoundingClientRect().top ?? r.top;
		bubbleBelow = !preview && imgTop < 150;
	}

	// ── footer: sit above it, not on the visit counter ──
	let lift = 0;
	let onScroll: (() => void) | null = null;

	// ── timers: ambient life, sleep, minutes, song changes ──
	let ambientTimer: ReturnType<typeof setTimeout>;
	let clock: ReturnType<typeof setInterval>;
	let lastActivity = Date.now();
	let lastSongKey = '';
	let lastSongComment = 0;
	let weatherDone = false;
	let lastPath = '';
	let pageTimer: ReturnType<typeof setTimeout>;

	function scheduleAmbient() {
		clearTimeout(ambientTimer);
		if (!s || s.behaviour.autoTalk === 'off') return;
		const [min, max] = s.behaviour.autoTalk === 'normal' ? [50, 110] : [120, 240];
		ambientTimer = setTimeout(ambient, (min + Math.random() * (max - min)) * 1000);
	}
	function ambient() {
		scheduleAmbient();
		if (!s || !here || closed || line || menuOpen || statsOpen || autoSaid >= 8 || (!preview && document.hidden)) return;
		if (sleeping) return Math.random() < 0.3 && burst('z', 2);
		autoSaid++;
		const roll = Math.random();
		if (s.behaviour.idle && roll < 0.12 && s.interactions.grass) {
			mood('eating_grass', 6000);
			burst('leaf', 2);
			return say('grass');
		}
		if (s.behaviour.idle && roll < 0.24 && song && s.behaviour.music) {
			mood('playing_bass', 8000);
			burst('note', 3);
			return say('song');
		}
		if (roll < 0.34) {
			mood('thinking', 5000);
			burst('question', 1);
			return;
		}
		if (roll < 0.42 && memory.money > 0 && buySomething(false)) return;
		say('ambient');
	}

	function everyMinute() {
		if (!s || preview) return;
		const now = Date.now();
		// Asleep when nobody's been around for a while; awake again when a nap runs out.
		if (s.behaviour.sleepAfter > 0 && !sleeping && now - lastActivity > s.behaviour.sleepAfter * 60_000) fallAsleep();
		if (sleeping && sleepingUntil && now > sleepingUntil) {
			sleepingUntil = 0;
			state = 'idle';
		}
		if (here && !closed && !document.hidden) {
			memory.minutes++;
			persist();
			if (memory.minutes >= s.achievements.minutes) stamp('ryo-company');
		}
	}
	const active = () => (lastActivity = Date.now());

	// A new song: sometimes she says something about it.
	$: songKey = song ? `${song.artist}|${song.title}` : '';
	$: if (mounted && s && !preview && songKey !== lastSongKey) {
		const first = lastSongKey === '';
		lastSongKey = songKey;
		if (song && /kessoku/i.test(song.artist) && here) stamp('ryo-taste');
		if (!first && song && here && !closed && !sleeping && s.behaviour.music && Date.now() - lastSongComment > 180_000 && Math.random() < 0.45) {
			lastSongComment = Date.now();
			setTimeout(() => !line && (burst('note', 2), say('song')), 2500);
		}
	}
	// A new page: sometimes she has an opinion about it.
	$: if (mounted && s && !preview && path !== lastPath) {
		const first = lastPath === '';
		lastPath = path;
		clearTimeout(pageTimer);
		if (!first && here && !closed && !sleeping && s.behaviour.pageReactions && Math.random() < 0.35) pageTimer = setTimeout(() => !line && say('page'), 1500);
		tick().then(placeBubble);
	}

	onMount(() => {
		reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
		const mq = matchMedia('(min-width: 768px)');
		wide = mq.matches;
		mq.addEventListener('change', (e) => (wide = e.matches));
		if (!preview) {
			memory = loadMemory();
			const today = todayKey();
			if (!memory.days.includes(today)) memory.days = [...memory.days, today].slice(-60);
			persist();
			const h = new Date().getHours();
			if (h < 5) state = 'sleeping';
			if (h >= 3 && h < 6) setTimeout(() => here && !closed && stamp('ryo-night'), 3000);
			fetch('/api/headpats')
				.then((r) => (r.ok ? r.json() : null))
				.then((d) => d && (globalPats = d.total))
				.catch(() => null); // offline: the count just stays local
			addEventListener('pointermove', active, { passive: true });
			addEventListener('keydown', active, { passive: true });
			addEventListener('scroll', active, { passive: true });
			const footer = document.querySelector('footer');
			if (footer) {
				let queued = false;
				onScroll = () => {
					if (queued) return;
					queued = true;
					requestAnimationFrame(() => ((queued = false), (lift = Math.max(0, innerHeight - footer.getBoundingClientRect().top))));
				};
				onScroll();
				addEventListener('scroll', onScroll, { passive: true });
				addEventListener('resize', onScroll, { passive: true });
			}
			clock = setInterval(everyMinute, 60_000);
			// A quiet hello, once a day.
			setTimeout(() => {
				if (!s || !here || closed || sleeping || memory.lastGreet === todayKey()) return;
				if (memory.days.length >= s.achievements.days) stamp('ryo-familiar');
				memory.lastGreet = todayKey();
				persist();
				say('greet');
			}, 2500);
			// The weather, once a visit.
			setTimeout(() => {
				if (weatherDone || !s?.behaviour.weather || !weather || !here || closed || line || sleeping) return;
				weatherDone = true;
				say('weather');
			}, 45_000);
		}
		mounted = true;
		scheduleAmbient();
	});
	onDestroy(() => {
		clearTimeout(lineTimer);
		clearInterval(typeTimer);
		clearTimeout(moodTimer);
		clearTimeout(ambientTimer);
		clearTimeout(pageTimer);
		clearInterval(clock);
		clearTimeout(patTimer);
		if (!preview && typeof window !== 'undefined') {
			sendPats();
			removeEventListener('pointermove', active);
			removeEventListener('keydown', active);
			removeEventListener('scroll', active);
			if (onScroll) removeEventListener('scroll', onScroll), removeEventListener('resize', onScroll);
		}
	});

	// ── for the admin preview ──
	export function testLine(entry: DialogueEntry) {
		show(entry.text.replace(/\{(\w+)\}/g, (_, k) => `{${k}}`), entry.expression);
	}
	export function setMood(next: CompanionState) {
		if (next === 'sleeping') return fallAsleep();
		mood(next, 6000);
	}
	export function resetPreview() {
		memory = blankMemory();
		state = 'idle';
		line = '';
		statsOpen = menuOpen = false;
	}
	export function forget() {
		memory = { ...blankMemory(), days: [todayKey()] };
		if (!preview) forgetMemory(), persist();
		statsOpen = false;
		show('...who are you again?', 'surprised');
	}

	// ── stats ──
	$: ryoStamps = COLLECTIBLES.filter((c) => c.group === 'ryo');
	$: ryoFound = mounted && !preview ? ryoStamps.filter((c) => $passport.stamps[c.id]).length : 0;
	$: moodWord = { idle: 'indifferent', talking: 'talkative (rare)', happy: 'pleased', sleepy: 'sleepy', sleeping: 'asleep', hungry: 'hungry', annoyed: 'annoyed', thinking: 'thinking', listening: 'listening', playing_bass: 'in the zone', embarrassed: 'embarrassed', surprised: 'surprised', receiving_headpat: 'tolerating it', receiving_money: 'suspiciously happy', eating_grass: 'eating' }[state];
	$: activity = sleeping ? 'sleeping' : song ? `listening to ${song.title}` : state === 'eating_grass' ? 'eating grass' : 'doing nothing, professionally';

	type MenuItem = { key: Action; label: string; on: boolean };
	const item = (key: Action, label: string, on: boolean): MenuItem => ({ key, label, on });
	let menu: MenuItem[] = [];
	$: menu = s
		? [
				item('talk', 'talk', true),
				item('headpat', 'headpat', s.interactions.headpats),
				item('money', `give ¥${s.interactions.donation.toLocaleString('en-US')}`, s.interactions.money),
				item('grass', 'give grass', s.interactions.grass),
				item('song', 'ask about the song', s.interactions.song),
				item(sleeping ? 'wake' : 'sleep', sleeping ? 'wake her up' : 'let her sleep', s.interactions.sleep),
				item('stats', 'stats', s.interactions.stats),
				item('corner', 'back to the corner', !!memory.position && !preview),
				item('hide', 'hide', !preview)
		  ].filter((m) => m.on)
		: [];
	const yen = (n: number) => `¥${n.toLocaleString('en-US')}`;
	$: name = s?.name || 'ryo';
	$: posStyle = preview
		? `position: absolute; right: 16px; bottom: 8px;`
		: memory.position
			? `position: fixed; left: ${memory.position.x}px; top: ${memory.position.y}px;`
			: `position: fixed; ${s?.position === 'bottom-left' ? 'left' : 'right'}: 20px; bottom: ${20 + lift}px;`;
	const flag = { rows: ['p......', 'pbbbbbb', 'prrrrrr', 'pwwwwww', 'prrrrrr', 'pbbbbbb', 'p......', 'p......', 'p......'], palette: { p: '#d8d2c4', b: '#5BCEFA', r: '#F5A9B8', w: '#FFFFFF' } };
</script>

<svelte:window on:pointermove={pointerMove} on:pointerup={pointerUp} on:keydown={(e) => e.key === 'Escape' && ((menuOpen = false), (statsOpen = false))} />

{#if s && here && mounted && !closed}
	<div bind:this={box} class="ryo z-30 font-cascadia select-none {preview ? '' : 'pointer-events-none'}" style="{posStyle} width: {s.size}px; opacity: {s.opacity / 100}; --amp: {amp}" in:fly={{ y: 20, duration: preview ? 0 : 500 }}>
		<!-- speech bubble -->
		{#if line}
			<div
				bind:this={bubble}
				class="bubble absolute z-10 pointer-events-auto w-max max-w-[15rem] rounded-2xl glass-strong border border-ocean-300/40 dark:border-ocean-600/40 px-3 py-2 text-xs text-ocean-800 dark:text-ocean-100 shadow-xl {bubbleSide === 'right' ? 'right-0 rounded-br-sm' : 'left-0 rounded-bl-sm'} {bubbleBelow ? 'below' : ''}"
				style={bubbleBelow ? 'top: 100%; margin-top: 8px' : `bottom: ${(imgH || s.size) + 10}px`}
				on:click={() => (clearInterval(typeTimer), (shown = line))}
				transition:scale={{ duration: 160, start: 0.9 }}
				role="status"
			>
				<span class="block text-[9px] uppercase tracking-widest text-ocean-500 mb-0.5">{name}</span>
				<span class="whitespace-pre-line">{shown}</span>
				{#if expression === 'headpat' && s.interactions.headpats && globalPats !== null && !preview}<span class="block mt-1.5 text-[10px] text-ocean-500 tabular-nums">♡ {globalPats.toLocaleString('en-US')} {globalPats === 1 ? 'headpat' : 'headpats'} from everyone</span>{/if}
				<span class="tail absolute w-2.5 h-2.5 rotate-45 glass-strong border-ocean-300/40 dark:border-ocean-600/40 {bubbleSide === 'right' ? 'right-5' : 'left-5'}" aria-hidden="true" />
			</div>
		{/if}

		<!-- her -->
		<div class="relative group pointer-events-none" style="height: {Math.round(s.size * 1.5)}px">
			<button
				bind:clientHeight={imgH}
				class="sprite absolute inset-x-0 bottom-0 pointer-events-auto {sleeping ? 'asleep' : ''} {song && !sleeping ? 'groove' : ''} {state}"
				on:pointerdown={pointerDown}
				on:click={click}
				on:contextmenu|preventDefault={() => ((menuOpen = !menuOpen), (statsOpen = false))}
				on:keydown={keydown}
				aria-label="{name}. click her head for a headpat, the rest of her to talk. menu key or shift+f10 for more."
				title={name}
				style="cursor: {s.draggable && !preview ? 'grab' : 'pointer'}"
			>
				{#key sprite}
					<img bind:this={img} src={sprite} alt="" class="cutout block w-full h-auto" draggable="false" in:fade={{ duration: 220 }} on:error={missing} />
				{/key}
			</button>
			{#if trans && !sleeping}<span class="absolute -left-3 bottom-1 pointer-events-none flag" aria-hidden="true"><Pixels rows={flag.rows} palette={flag.palette} scale={3} /></span>{/if}
			{#each particles as p (p.id)}
				<span class="particle {p.kind} absolute pointer-events-none" style="left: {p.x}%; bottom: {(imgH || s.size) * 0.7}px; animation-delay: {p.delay}ms" aria-hidden="true">{glyphs[p.kind]}</span>
			{/each}
			<button
				on:click={() => ((menuOpen = !menuOpen), (statsOpen = false))}
				class="absolute top-auto pointer-events-auto w-6 h-6 rounded-full glass-strong border border-ocean-300/40 dark:border-ocean-600/40 text-xs text-ocean-600 dark:text-ocean-300 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity {s.position === 'bottom-left' && !memory.position ? '-right-2' : '-left-2'}"
				style="bottom: {(imgH || s.size) - 18}px"
				aria-label="{name}'s menu"
				aria-expanded={menuOpen}
				title="menu">⋯</button
			>
		</div>

		<!-- menu -->
		{#if menuOpen}
			<div class="menu absolute z-20 pointer-events-auto w-48 rounded-xl glass-strong border border-ocean-300/40 dark:border-ocean-600/40 p-1 shadow-xl text-xs {bubbleSide === 'right' ? 'right-0' : 'left-0'}" style="bottom: {(imgH || s.size) + 10}px" role="menu" transition:scale={{ duration: 140, start: 0.92 }}>
				{#each menu as m}
					<button role="menuitem" on:click={() => perform(m.key)} class="w-full text-left px-2.5 py-1.5 rounded-lg text-ocean-800 dark:text-ocean-200 hover:bg-ocean-200/60 dark:hover:bg-ocean-700/50">{m.label}</button>
				{/each}
			</div>
		{/if}

		<!-- stats -->
		{#if statsOpen}
			<div class="absolute z-20 pointer-events-auto w-60 rounded-2xl glass-strong border border-ocean-300/40 dark:border-ocean-600/40 p-3.5 shadow-xl text-xs text-ocean-800 dark:text-ocean-200 {bubbleSide === 'right' ? 'right-0' : 'left-0'}" style="bottom: {(imgH || s.size) + 10}px" transition:scale={{ duration: 160, start: 0.92 }}>
				<div class="flex items-baseline justify-between">
					<span class="text-sm text-ocean-900 dark:text-ocean-100">{name} yamada</span>
					<button on:click={() => (statsOpen = false)} class="text-ocean-500" aria-label="close">✕</button>
				</div>
				{#if s.subtitle}<p class="text-[10px] text-ocean-500 mb-2">{s.subtitle}</p>{/if}
				<dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 tabular-nums">
					<dt class="text-ocean-500">mood</dt><dd>{moodWord}</dd>
					<dt class="text-ocean-500">doing</dt><dd class="truncate">{activity}</dd>
					<dt class="text-ocean-500">money</dt><dd>{yen(memory.money)}</dd>
					<dt class="text-ocean-500">donations</dt><dd>{yen(memory.donated)}</dd>
					<dt class="text-ocean-500">headpats</dt><dd>{memory.headpats}</dd>
					<dt class="text-ocean-500">grass eaten</dt><dd>{memory.grass}</dd>
					<dt class="text-ocean-500">talks</dt><dd>{memory.talks}</dd>
					<dt class="text-ocean-500">basses bought</dt><dd>{memory.basses}</dd>
				</dl>
				{#if !preview && s.achievements.enabled}<a href="/passport#ryo" class="block mt-2 text-[11px] text-ocean-500 hover:underline">ryo's stamps · {ryoFound} / {ryoStamps.length} →</a>{/if}
				<button on:click={() => confirm('forget everything ryo remembers about you? (money, counters, where she sits)') && forget()} class="mt-2 text-[10px] text-ocean-500 hover:text-red-500">forget me</button>
			</div>
		{/if}
	</div>
{:else if s && here && mounted && closed}
	<!-- hidden: the top of her head peeks up from the bottom of the screen -->
	<button on:click={() => (setCompanionClosed(false), collect('ryoback'), setTimeout(() => show('...you missed me, huh.', 'default'), 600))} class="peek fixed bottom-0 right-10 z-30 w-16 overflow-hidden" aria-label="bring {name} back" title="bring {name} back" in:fly={{ y: 30, duration: 600, delay: 400 }}>
		<img src={s.sprites.default} alt="" class="cutout w-full h-auto" draggable="false" />
	</button>
{/if}

<style>
	.cutout {
		filter: drop-shadow(2px 0 0 #fff) drop-shadow(-2px 0 0 #fff) drop-shadow(0 2px 0 #fff) drop-shadow(0 -2px 0 #fff) drop-shadow(0 8px 12px rgb(0 0 0 / 0.35));
	}
	.sprite {
		transform-origin: bottom center;
		touch-action: none;
		animation: breathe 4.2s ease-in-out infinite;
		transition: filter 0.4s;
	}
	.sprite:active {
		cursor: grabbing;
	}
	@keyframes breathe {
		0%,
		100% {
			transform: scale(1, 1);
		}
		50% {
			transform: scale(calc(1 + 0.012 * var(--amp)), calc(1 + 0.022 * var(--amp)));
		}
	}
	.sprite.groove {
		animation: groove 0.62s ease-in-out infinite;
	}
	@keyframes groove {
		0%,
		100% {
			transform: translateY(0) rotate(0deg);
		}
		50% {
			transform: translateY(calc(-3px * var(--amp))) rotate(calc(1.5deg * var(--amp)));
		}
	}
	.sprite.asleep {
		filter: saturate(0.55) brightness(0.78);
		animation-duration: 7s;
	}
	.sprite.annoyed {
		animation: shake 0.35s ease-in-out 2;
	}
	@keyframes shake {
		25% {
			transform: translateX(calc(-3px * var(--amp)));
		}
		75% {
			transform: translateX(calc(3px * var(--amp)));
		}
	}
	.sprite.receiving_headpat {
		animation: squish 0.4s ease-out;
	}
	@keyframes squish {
		40% {
			transform: scale(calc(1 + 0.08 * var(--amp)), calc(1 - 0.1 * var(--amp)));
		}
	}
	.sprite.surprised {
		animation: hop 0.4s ease-out;
	}
	@keyframes hop {
		40% {
			transform: translateY(calc(-10px * var(--amp)));
		}
	}
	.bubble .tail {
		bottom: -5px;
		border-right-width: 1px;
		border-bottom-width: 1px;
		border-style: solid;
		border-left: 0;
		border-top: 0;
	}
	.bubble.below .tail {
		bottom: auto;
		top: -5px;
		transform: rotate(225deg);
	}
	.particle {
		font-size: 13px;
		animation: float 2.1s ease-out forwards;
		opacity: 0;
	}
	.particle.heart {
		color: #e893a8;
	}
	.particle.note,
	.particle.sparkle {
		color: var(--trail-2, #e6c255);
	}
	.particle.yen {
		color: #e6c255;
		font-weight: bold;
	}
	.particle.z,
	.particle.question {
		color: #8fb3e0;
	}
	.particle.mark {
		color: #e07a7a;
		font-weight: bold;
	}
	.particle.leaf {
		width: 8px;
		height: 12px;
		background: #79a97f;
		border-radius: 0 100% 0 100%;
	}
	@keyframes float {
		0% {
			opacity: 0;
			transform: translate(0, 0) rotate(-10deg) scale(0.7);
		}
		20% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			transform: translate(8px, -46px) rotate(18deg) scale(1.1);
		}
	}
	.flag {
		transform-origin: bottom left;
		animation: wave 2.6s ease-in-out infinite;
		filter: drop-shadow(1.5px 0 0 #fff) drop-shadow(-1.5px 0 0 #fff) drop-shadow(0 1.5px 0 #fff) drop-shadow(0 -1.5px 0 #fff);
	}
	@keyframes wave {
		0%,
		100% {
			transform: rotate(-14deg);
		}
		50% {
			transform: rotate(-6deg);
		}
	}
	.peek {
		height: 1.6rem;
		transition: height 0.25s ease-out;
	}
	.peek:hover,
	.peek:focus-visible {
		height: 2.6rem;
	}
	@media (prefers-reduced-motion: reduce) {
		.sprite,
		.sprite.groove,
		.sprite.annoyed,
		.sprite.receiving_headpat,
		.sprite.surprised,
		.flag {
			animation: none;
		}
	}
</style>
