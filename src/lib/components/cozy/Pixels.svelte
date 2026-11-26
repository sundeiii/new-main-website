<script lang="ts">
	// Draws pixel art from rows of characters (see pixelRects in ./cozy). `scale` is CSS px per pixel.
	import { pixelRects } from './cozy';

	export let rows: string[];
	export let palette: Record<string, string>;
	export let scale = 3;
	export let flip = false;

	$: width = Math.max(...rows.map((r) => r.length));
	$: rects = pixelRects(rows, palette);
</script>

<svg
	viewBox="0 0 {width} {rows.length}"
	width={width * scale}
	height={rows.length * scale}
	shape-rendering="crispEdges"
	aria-hidden="true"
	class="block"
	style={flip ? 'transform: scaleX(-1)' : ''}
>
	<!-- style, not the fill attribute, so colours can be CSS variables (like the cat's --bell) -->
	{#each rects as r}<rect x={r.x} y={r.y} width={r.w} height="1" style="fill: {r.fill}" />{/each}
</svg>
