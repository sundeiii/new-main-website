<script lang="ts" context="module">
	import { writable } from 'svelte/store';

	// Whether this visitor turned the snow off (the command palette toggles it).
	export const snowOff = writable(false);
	export function toggleSnow() {
		snowOff.update((v) => {
			try {
				localStorage.setItem('snow-off', v ? '0' : '1');
			} catch {}
			return !v;
		});
	}
	/** True while snow would show at all (so the palette only offers the toggle then). */
	export const snowSeason = writable(false);
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import type { SeasonalSettings } from '$lib/siteSettings';

	// Little seasonal touches, set in /admin → seasonal: snow in winter, and a note plus some
	// confetti on my birthday and new year's day. All in the browser, after the page has loaded.

	let settings: SeasonalSettings | null = null;
	let note = '';
	let canvas: HTMLCanvasElement;
	let confettiCanvas: HTMLCanvasElement;
	let reduced = false;

	const pad = (n: number) => String(n).padStart(2, '0');
	const TRANS_FLAKES = ['rgba(91, 206, 250, 0.85)', 'rgba(245, 169, 184, 0.85)', 'rgba(255, 255, 255, 0.8)'];

	onMount(() => {
		reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
		try {
			snowOff.set(localStorage.getItem('snow-off') === '1');
		} catch {}
		fetch('/api/site/seasonal')
			.then((r) => (r.ok ? r.json() : null))
			.then((s: SeasonalSettings | null) => {
				if (!s) return;
				settings = s;
				const d = new Date();
				const md = `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
				const winter = d.getMonth() === 11 || (d.getMonth() === 0 && d.getDate() <= 7);
				snowSeason.set(s.snow === 'on' || (s.snow === 'auto' && winter));
				const party = s.birthday && md === s.birthday ? s.birthdayText || 'today is my birthday :)' : s.newYear && md === '01-01' ? `happy new year! welcome to ${d.getFullYear()}` : '';
				if (party) {
					const key = `seasonal-seen-${d.getFullYear()}-${md}`;
					let seen = false;
					try {
						seen = localStorage.getItem(key) === '1';
						localStorage.setItem(key, '1');
					} catch {}
					note = party;
					if (!seen && !reduced) setTimeout(confetti, 600);
				}
			})
			.catch(() => {});
	});

	// ── snow ──
	$: snowing = $snowSeason && !$snowOff && !reduced && canvas;
	$: if (snowing) startSnow();
	let stopSnow: (() => void) | null = null;
	$: if (!snowing && stopSnow) {
		stopSnow();
		stopSnow = null;
	}

	function startSnow() {
		if (stopSnow) return;
		const ctx = canvas.getContext('2d')!;
		let w = 0;
		let h = 0;
		const resize = () => {
			const dpr = Math.min(devicePixelRatio || 1, 2);
			w = innerWidth;
			h = innerHeight;
			canvas.width = w * dpr;
			canvas.height = h * dpr;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		};
		resize();
		addEventListener('resize', resize);
		// Fewer flakes on small screens.
		const count = Math.round(Math.min(90, (w * h) / 16000));
		const flakes = Array.from({ length: count }, () => ({
			x: Math.random() * w,
			y: Math.random() * h,
			r: 0.8 + Math.random() * 2.2,
			speed: 0.3 + Math.random() * 0.8,
			drift: Math.random() * Math.PI * 2
		}));
		let frame = 0;
		let last = performance.now();
		const tick = (t: number) => {
			const dt = Math.min(50, t - last) / 16.7;
			last = t;
			ctx.clearRect(0, 0, w, h);
			// With the trans theme the flakes come in the flag's colours.
			const trans = document.documentElement.dataset.theme === 'trans';
			ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
			for (const [i, f] of flakes.entries()) {
				if (trans) ctx.fillStyle = TRANS_FLAKES[i % 3];
				f.drift += 0.01 * dt;
				f.y += f.speed * dt;
				f.x += Math.sin(f.drift) * 0.35 * dt;
				if (f.y > h + 5) {
					f.y = -5;
					f.x = Math.random() * w;
				}
				ctx.globalAlpha = 0.35 + f.r / 5;
				ctx.beginPath();
				ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
				ctx.fill();
			}
			frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		stopSnow = () => {
			cancelAnimationFrame(frame);
			removeEventListener('resize', resize);
			ctx.clearRect(0, 0, w, h);
		};
	}

	// ── confetti (one burst) ──
	function confetti() {
		const c = confettiCanvas;
		if (!c) return;
		const ctx = c.getContext('2d')!;
		const w = (c.width = innerWidth);
		const h = (c.height = innerHeight);
		const colours = ['#F5A9B8', '#5BCEFA', '#EBCB8B', '#A3BE8C', '#B48EAD', getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#8FA1B3'];
		const bits = Array.from({ length: 160 }, () => ({
			x: w / 2 + (Math.random() - 0.5) * w * 0.3,
			y: h * 0.35,
			vx: (Math.random() - 0.5) * 16,
			vy: -6 - Math.random() * 12,
			size: 5 + Math.random() * 6,
			spin: Math.random() * Math.PI,
			colour: colours[Math.floor(Math.random() * colours.length)]
		}));
		const start = performance.now();
		const tick = (t: number) => {
			const age = t - start;
			ctx.clearRect(0, 0, w, h);
			for (const b of bits) {
				b.vy += 0.35;
				b.vx *= 0.99;
				b.x += b.vx;
				b.y += b.vy;
				b.spin += 0.15;
				ctx.globalAlpha = Math.max(0, 1 - age / 3500);
				ctx.fillStyle = b.colour;
				ctx.save();
				ctx.translate(b.x, b.y);
				ctx.rotate(b.spin);
				ctx.fillRect(-b.size / 2, -b.size / 4, b.size, b.size / 2);
				ctx.restore();
			}
			if (age < 3500) requestAnimationFrame(tick);
			else ctx.clearRect(0, 0, w, h);
		};
		requestAnimationFrame(tick);
	}
</script>

<canvas bind:this={canvas} class="fixed inset-0 w-full h-full pointer-events-none z-30" aria-hidden="true" />
<canvas bind:this={confettiCanvas} class="fixed inset-0 w-full h-full pointer-events-none z-[160]" aria-hidden="true" />

{#if note}
	<div
		class="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 pl-4 pr-2 py-2 rounded-full glass-strong border border-ocean-300/60 dark:border-ocean-700/60 shadow-xl font-cascadia text-sm text-ocean-900 dark:text-ocean-100"
		transition:fly={{ y: 16, duration: 300 }}
	>
		<span>{settings?.birthday && note === (settings.birthdayText || 'today is my birthday :)') ? '🎂' : '🎉'} {note}</span>
		{#if !reduced}<button on:click={confetti} class="px-2 py-0.5 rounded-full text-xs hover:bg-ocean-200/60 dark:hover:bg-ocean-800/60" title="more confetti">again</button>{/if}
		<button on:click={() => (note = '')} class="w-6 h-6 grid place-items-center rounded-full text-xs text-ocean-500 hover:bg-ocean-200/60 dark:hover:bg-ocean-800/60" aria-label="close">✕</button>
	</div>
{/if}
