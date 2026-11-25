<script lang="ts">
	import type { Theme } from '$lib/themes';

	// The page background: the theme's colour, plus a moving mesh, a gradient or a picture.
	// `contained` keeps it inside its parent instead of filling the screen (the admin preview).
	export let theme: Theme;
	export let dark: boolean;
	export let contained = false;

	$: c = theme.mesh.length ? theme.mesh : ['#8FA1B3'];
	$: at = (i: number) => c[i % c.length];
	$: layer1 = `radial-gradient(ellipse 80% 50% at 20% 30%, ${at(0)} 0%, transparent 50%), radial-gradient(ellipse 60% 80% at 80% 20%, ${at(1)} 0%, transparent 50%), radial-gradient(ellipse 70% 60% at 70% 80%, ${at(2)} 0%, transparent 50%)`;
	$: layer2 = `radial-gradient(ellipse 50% 70% at 30% 70%, ${at(3)} 0%, transparent 50%), radial-gradient(ellipse 30% 22% at 68% 36%, ${at(4)} 0%, transparent 50%), radial-gradient(ellipse 60% 60% at 10% 50%, ${at(1)} 0%, transparent 50%)`;
	$: layer3 = `radial-gradient(ellipse 40% 80% at 50% 10%, ${at(5)} 0%, transparent 50%), radial-gradient(ellipse 70% 50% at 90% 60%, ${at(0)} 0%, transparent 50%)`;
	$: strength = theme.meshStrength / 100;

	$: picture = theme.background === 'image' && theme.image;
	$: fill = picture
		? `background-image: url("${encodeURI(theme.image)}"); background-size: ${theme.fit === 'tile' ? 'auto' : theme.fit}; background-repeat: ${theme.fit === 'tile' ? 'repeat' : 'no-repeat'}; background-position: center;`
		: theme.background === 'gradient' && theme.gradient
			? `background-image: ${theme.gradient};`
			: '';
	// Blur pulls in the transparent edge, so the blurred layer is drawn slightly larger.
	$: blurStyle = theme.blur ? `filter: blur(${theme.blur}px); inset: -${theme.blur * 2}px;` : 'inset: 0;';
</script>

<!-- Light or dark comes from the `dark` class (set before the first paint, see app.html) rather
     than from `dark` below, so a refresh doesn't flash the light version first. On the page
     itself, `dark` is only used by the admin preview, which sets its own class. -->
<div
	class="backdrop {contained ? 'absolute' : 'fixed'} inset-0 -z-10 overflow-hidden pointer-events-none"
	class:is-dark={contained && dark}
	style="--light: {theme.light}; --dark: {theme.dark}; --strength: {strength}; --dim: {theme.dim / 100}; view-transition-name: {contained ? 'none' : 'site-bg'}"
	aria-hidden="true"
>
	{#if theme.background === 'mesh'}
		<div class="layer l1" style="background: {layer1}" />
		<div class="layer l2" style="background: {layer2}" />
		<div class="layer l3" style="background: {layer3}" />
	{:else if fill}
		<div class="absolute" style="{fill} {blurStyle}" />
		{#if theme.dim}<div class="absolute inset-0 veil" />{/if}
	{/if}
</div>

<style>
	.backdrop {
		background: var(--light);
	}
	:global(html.dark) .backdrop:not(.absolute),
	.backdrop.is-dark {
		background: var(--dark);
	}
	.veil {
		background: rgba(255, 255, 255, var(--dim));
	}
	:global(html.dark) .backdrop:not(.absolute) .veil,
	.backdrop.is-dark .veil {
		background: rgba(0, 0, 0, var(--dim));
	}
	.layer {
		opacity: var(--strength);
		position: absolute;
		inset: -50%;
		width: 200%;
		height: 200%;
		will-change: transform;
		backface-visibility: hidden;
		transition: opacity 0.6s ease;
	}
	.l1 {
		animation: drift-1 30s ease-in-out infinite alternate;
	}
	.l2 {
		animation: drift-2 35s ease-in-out infinite alternate;
	}
	:global(html.dark) .backdrop:not(.absolute) .layer,
	.backdrop.is-dark .layer {
		opacity: calc(var(--strength) * 0.7);
	}
	.l3 {
		opacity: calc(var(--strength) * 0.7);
		animation: drift-3 25s ease-in-out infinite alternate;
	}
	@keyframes drift-1 {
		from { transform: translate(0, 0) rotate(0deg); }
		to { transform: translate(5%, 3%) rotate(8deg); }
	}
	@keyframes drift-2 {
		from { transform: translate(0, 0) rotate(0deg); }
		to { transform: translate(-4%, 5%) rotate(-6deg); }
	}
	@keyframes drift-3 {
		from { transform: translate(0, 0) scale(1); }
		to { transform: translate(3%, -4%) scale(1.05); }
	}
	:global(html.dark) .backdrop:not(.absolute) .l3,
	.backdrop.is-dark .l3 {
		opacity: calc(var(--strength) * 0.5);
	}
	/* Before the saved theme is known (first paint after a refresh): its colours come from
	   app.html, and the mesh waits, then fades in. */
	:global(html.theme-preload) .backdrop:not(.absolute) {
		background: var(--pre-light, var(--light));
	}
	:global(html.theme-preload.dark) .backdrop:not(.absolute) {
		background: var(--pre-dark, var(--dark));
	}
	:global(html.theme-preload) .backdrop:not(.absolute) > * {
		opacity: 0 !important;
	}
	:global(html.theme-preload) .backdrop:not(.absolute)::before {
		content: '';
		position: absolute;
		inset: calc(var(--pre-blur, 0px) * -2);
		background-image: var(--pre-image, none);
		background-size: var(--pre-size, cover);
		background-repeat: var(--pre-repeat, no-repeat);
		background-position: center;
		filter: blur(var(--pre-blur, 0px));
	}
	:global(html.theme-preload) .backdrop:not(.absolute)::after {
		content: '';
		position: absolute;
		inset: 0;
		background: rgba(255, 255, 255, var(--pre-dim, 0));
	}
	:global(html.theme-preload.dark) .backdrop:not(.absolute)::after {
		background: rgba(0, 0, 0, var(--pre-dim, 0));
	}
	@media (prefers-reduced-motion: reduce) {
		.layer {
			animation: none;
		}
	}
</style>
