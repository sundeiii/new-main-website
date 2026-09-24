<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/env';

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null;
	let animFrame = 0;

	interface TrailPoint {
		x: number;
		y: number;
		time: number;
	}

	let points: TrailPoint[] = [];
	const trailLife = 300; // how long trail stays (ms)

	function addPoint(x: number, y: number, time: number) {
		const last = points[points.length - 1];
		if (!last || Math.hypot(x - last.x, y - last.y) > 1) points.push({ x, y, time });
	}

	function handleMouseMove(e: PointerEvent) {
		if (e.pointerType === 'touch') return;
		// Browsers merge fast mouse movement into one event per frame. The merged-away positions
		// are still available, and without them quick flicks turn into long straight segments.
		const events = e.getCoalescedEvents?.() ?? [];
		if (events.length) for (const ev of events) addPoint(ev.clientX, ev.clientY, performance.now());
		else addPoint(e.clientX, e.clientY, performance.now());

		// The loop sleeps while the mouse is still; wake it up.
		if (!animFrame) animFrame = requestAnimationFrame(animate);
	}

	/** Catmull-Rom spline through every point, sampled every few pixels. */
	function smooth(pts: TrailPoint[]) {
		const out: { x: number; y: number }[] = [{ x: pts[0].x, y: pts[0].y }];
		for (let i = 0; i < pts.length - 1; i++) {
			const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(i + 2, pts.length - 1)];
			const n = Math.max(1, Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) / 4));
			for (let k = 1; k <= n; k++) {
				const t = k / n, t2 = t * t, t3 = t2 * t;
				out.push({
					x: 0.5 * (2 * p1.x + (p2.x - p0.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (3 * p1.x - p0.x - 3 * p2.x + p3.x) * t3),
					y: 0.5 * (2 * p1.y + (p2.y - p0.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (3 * p1.y - p0.y - 3 * p2.y + p3.y) * t3)
				});
			}
		}
		return out;
	}

	function animate() {
		animFrame = 0;
		if (!ctx || !canvas) return;
		const now = performance.now();

		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Remove expired points (oldest are at the front)
		let expired = 0;
		while (expired < points.length && now - points[expired].time >= trailLife) expired++;
		if (expired) points.splice(0, expired);

		// Draw trail with smooth fade from tail to head: progressively shorter sub-paths stack
		// their opacity near the head. All of them follow the same smoothed line, so the layers
		// line up exactly instead of leaving little stubs where each one starts.
		if (points.length >= 3) {
			const path = smooth(points);
			const steps = 20;
			const alpha = 0.07;

			// Single trail layer — clean, no glow. Blue/pink stripes in the secret trans theme.
			const trans = document.documentElement.classList.contains('trans');
			ctx.lineWidth = 5;
			ctx.lineCap = 'round';
			ctx.lineJoin = 'round';
			for (let s = 0; s < steps; s++) {
				const startIdx = Math.floor((s / steps) * (path.length - 2));
				ctx.beginPath();
				ctx.moveTo(path[startIdx].x, path[startIdx].y);
				for (let i = startIdx + 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
				ctx.strokeStyle = trans
					? (s % 2 ? `rgba(245, 169, 184, ${alpha * 1.4})` : `rgba(91, 206, 250, ${alpha * 1.4})`)
					: `rgba(0, 240, 255, ${alpha})`;
				ctx.stroke();
			}
		}

		// Once the trail has faded there is nothing changing on screen, so stop
		// redrawing until the mouse moves again instead of repainting every frame.
		animFrame = points.length ? requestAnimationFrame(animate) : 0;
	}

	function resize() {
		if (!canvas) return;
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
	}

	onMount(() => {
		if (!browser) return;

		ctx = canvas.getContext('2d');
		resize();

		window.addEventListener('pointermove', handleMouseMove, { passive: true });
		window.addEventListener('resize', resize);

		animate();
	});

	onDestroy(() => {
		if (!browser) return;
		cancelAnimationFrame(animFrame);
		window.removeEventListener('pointermove', handleMouseMove);
		window.removeEventListener('resize', resize);
	});
</script>

<canvas
	bind:this={canvas}
	class="fixed inset-0 pointer-events-none z-[999]"
/>
