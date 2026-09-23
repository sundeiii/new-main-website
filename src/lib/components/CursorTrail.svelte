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

	function handleMouseMove(e: MouseEvent) {
		const mouseX = e.clientX;
		const mouseY = e.clientY;
		const now = performance.now();

		const last = points[points.length - 1];
		if (!last || Math.hypot(mouseX - last.x, mouseY - last.y) > 1) {
			points.push({ x: mouseX, y: mouseY, time: now });
		}

		// The loop sleeps while the mouse is still; wake it up.
		if (!animFrame) animFrame = requestAnimationFrame(animate);
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

		// Draw trail with smooth fade from tail to head
		// Strategy: draw progressively shorter sub-paths from tail→head,
		// each layer adds a little more opacity. They stack additively near the head
		// giving a smooth fade effect with no visible segment breaks.
		if (points.length >= 3) {
			const steps = 20;

			// Helper: draw a smooth bezier path from startIdx to end
			function drawSubPath(startIdx: number) {
				ctx!.beginPath();
				ctx!.moveTo(points[startIdx].x, points[startIdx].y);

				for (let i = startIdx + 1; i < points.length - 1; i++) {
					const curr = points[i];
					const next = points[i + 1];
					const mx = (curr.x + next.x) / 2;
					const my = (curr.y + next.y) / 2;
					ctx!.quadraticCurveTo(curr.x, curr.y, mx, my);
				}

				const last = points[points.length - 1];
				ctx!.lineTo(last.x, last.y);
			}

			// Single trail layer — clean, no glow. Blue/pink stripes in the secret trans theme.
			const trans = document.documentElement.classList.contains('trans');
			for (let s = 0; s < steps; s++) {
				const startFrac = s / steps;
				const startIdx = Math.floor(startFrac * (points.length - 2));
				const alpha = 0.07;

				drawSubPath(startIdx);
				ctx.strokeStyle = trans
					? (s % 2 ? `rgba(245, 169, 184, ${alpha * 1.4})` : `rgba(91, 206, 250, ${alpha * 1.4})`)
					: `rgba(0, 240, 255, ${alpha})`;
				ctx.lineWidth = 5;
				ctx.lineCap = 'round';
				ctx.lineJoin = 'round';
				ctx.stroke();
			}
		}

		// Once the trail has faded there is nothing changing on screen, so stop
		// redrawing until the next mousemove instead of repainting every frame.
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

		window.addEventListener('mousemove', handleMouseMove, { passive: true });
		window.addEventListener('resize', resize);

		animate();
	});

	onDestroy(() => {
		if (!browser) return;
		cancelAnimationFrame(animFrame);
		window.removeEventListener('mousemove', handleMouseMove);
		window.removeEventListener('resize', resize);
	});
</script>

<canvas
	bind:this={canvas}
	class="fixed inset-0 pointer-events-none z-[999]"
/>
