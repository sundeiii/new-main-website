<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { page, navigating } from '$app/stores';
	import { cubicOut } from 'svelte/easing';
	import { browser } from '$app/env';
	import { goto, prefetch } from '$app/navigation';
	import CursorTrail from '$lib/components/CursorTrail.svelte';
	import Nav from '$lib/components/site/Nav.svelte';
	import Footer from '$lib/components/site/Footer.svelte';
	import CommandPalette from '$lib/components/site/CommandPalette.svelte';
	import Backdrop from '$lib/components/site/Backdrop.svelte';
	import { app } from '$lib/components/site/app';
	import { textOn, themeDefaults, withAlpha, type Theme } from '$lib/themes';
	import { BUILD_TIMESTAMP } from '$lib/buildtime';

	import '../app.css';

	// "updated 3 days ago" in the footer, from when the site was last built (i.e. deployed).
	function ago(ts: number) {
		const mins = Math.floor((Date.now() - ts) / 60000);
		if (mins < 60) return mins <= 1 ? 'just now' : `${mins} minutes ago`;
		const hours = Math.floor(mins / 60);
		if (hours < 24) return hours === 1 ? 'an hour ago' : `${hours} hours ago`;
		const days = Math.floor(hours / 24);
		if (days < 60) return days === 1 ? 'yesterday' : `${days} days ago`;
		return `${Math.floor(days / 30)} months ago`;
	}
	const updatedAgo = ago(BUILD_TIMESTAMP);

	let ready = false;

	const navLinks = [
		{ href: '/', label: 'home' },
		{ href: '/about', label: 'about' },
		{ href: '/blog', label: 'blog' },
		{ href: '/tournaments', label: 'tournaments' },
		{ href: '/osu', label: 'osu!' },
		{ href: '/events', label: 'events' },
		{ href: '/gallery', label: 'gallery' },
		{ href: '/music', label: 'music' },
		{ href: '/guestbook', label: 'guestbook' }
	];
	// Smaller pages that only get a spot in the footer (and the command palette).
	const footerLinks = [
		...navLinks,
		{ href: '/now', label: 'now' },
		{ href: '/projects', label: 'projects' },
		{ href: '/uses', label: 'uses' },
		{ href: '/changelog', label: 'changelog' },
		{ href: '/rss.xml', label: 'rss' }
	];

	// ── dark mode: saved choice, or the system setting ──
	let darkMode: boolean | null = null;
	let systemDark = false;
	$: isDarkMode = darkMode ?? systemDark;
	function toggleDarkMode() {
		darkMode = !isDarkMode;
		localStorage.setItem('dark-mode', darkMode ? 'dark' : 'light');
	}

	// ── themes, edited in /admin → pages → themes (see $lib/themes) ──
	let themes: Theme[] = themeDefaults.items;
	let defaultTheme = themeDefaults.default;
	let themeId = '';
	let unlocked: string[] = [];
	let transUnlocked = false;
	const isUnlocked = (t: Theme) => !t.secret || unlocked.includes(t.id) || (t.id === 'trans' && transUnlocked);
	$: visibleThemes = themes.filter((t) => !t.hidden && isUnlocked(t));
	$: theme = themes.find((t) => t.id === themeId && isUnlocked(t)) ?? visibleThemes.find((t) => t.id === defaultTheme) ?? visibleThemes[0] ?? themes[0];
	$: dark = theme.mode === 'both' ? isDarkMode : theme.mode === 'dark';
	// What the nav's picker and the command palette show.
	$: pickerThemes = visibleThemes.map((t) => ({ id: t.id, name: t.name, accent: t.accent, swatch: t.swatch || undefined }));
	$: pickerCurrent = { id: theme.id, name: theme.name, accent: theme.accent, swatch: theme.swatch || undefined };

	function setTheme(id: string) {
		themeId = id;
		localStorage.setItem('site-theme', id);
	}

	// The theme as CSS variables, used by the nav, cards, menus, text selection and cursor trail.
	function applyTheme(t: Theme, dark: boolean, ready: boolean) {
		const root = document.documentElement;
		const bg = dark ? t.dark : t.light;
		root.classList.toggle('dark', dark);
		root.style.setProperty('--accent', t.accent);
		root.style.setProperty('--accent-fg', textOn(t.accent));
		root.style.setProperty('--glass', withAlpha(bg, t.glass / 100));
		root.style.setProperty('--glass-blur', `${t.glassBlur}px`);
		// Menus and the command palette: never see-through enough to make their text hard to read.
		root.style.setProperty('--glass-strong', withAlpha(bg, Math.max(t.glass, 88) / 100));
		root.style.setProperty('--trail-1', t.trail[0] ?? t.accent);
		root.style.setProperty('--trail-2', t.trail[1] ?? t.trail[0] ?? t.accent);
		document.body.style.backgroundColor = bg;
		if (!ready) return;
		// For the next refresh's first paint (see app.html), then let the real theme show.
		try {
			localStorage.setItem(
				'theme-page',
				JSON.stringify({
					light: t.light,
					dark: t.dark,
					image: t.background === 'image' ? t.image : '',
					gradient: t.background === 'gradient' ? t.gradient : '',
					fit: t.fit,
					blur: t.blur,
					dim: t.dim
				})
			);
		} catch {}
		root.classList.remove('theme-preload');
	}
	$: if (browser) applyTheme(theme, dark, ready);

	// ?theme=<id> switches to (and unlocks) that theme, so secret ones can be shared by link.
	$: themeParam = $page.url.searchParams.get('theme');
	$: if (browser && themeParam && themes.some((t) => t.id === themeParam)) {
		if (!unlocked.includes(themeParam)) {
			unlocked = [...unlocked, themeParam];
			localStorage.setItem('themes-unlocked', JSON.stringify(unlocked));
		}
		if (themeId !== themeParam) setTheme(themeParam);
	}

	// `tf` (home page terminal, or the browser console) unlocks the trans theme.
	let transToast = false;
	function unlockTrans() {
		transUnlocked = true;
		localStorage.setItem('trans-unlocked', '1');
		if (themes.some((t) => t.id === 'trans')) setTheme('trans');
		transToast = true;
		setTimeout(() => (transToast = false), 4000);
	}

	// ── progress bar while a page loads ──
	let progressWidth = 0;
	let progressVisible = false;
	let progressInterval: ReturnType<typeof setInterval>;
	$: if ($navigating) {
		progressWidth = 0;
		progressVisible = true;
		progressInterval = setInterval(() => {
			progressWidth = Math.min(progressWidth + (90 - progressWidth) * 0.1, 90);
		}, 50);
	} else if (progressVisible) {
		clearInterval(progressInterval);
		progressWidth = 100;
		setTimeout(() => {
			progressVisible = false;
			progressWidth = 0;
		}, 300);
	}

	// ── page changes ──
	// They use the browser's View Transitions where it has them: the old page fades out as the
	// new one rises in, and a post's card grows into its page. Elsewhere, or with reduced motion
	// on, the Svelte transitions on <main> run instead.
	let viewTransition = false;
	const canTransition = () => !!(document as any).startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches;
	const internal = (href: string | null | undefined): href is string =>
		!!href && href.startsWith('/') && !href.startsWith('//') && !/^\/(api|admin)(\/|$)|\.(xml|txt|json)$/.test(href);

	// A banner only travels between a post/event/project page and a page that shows the same
	// banner (the blog list, events, home's "latest"). Banners carry their name in data-vt and get
	// it as a real view-transition-name only for that one transition, so a banner on a page that
	// has nothing to match it doesn't animate on its own while the rest of the page fades.
	const detailSlug = (path: string) => path.match(/^\/(?:blog|events|projects)\/([^/?#]+)/)?.[1] ?? null;
	const nameBanners = (name: string | null, scope: ParentNode = document) =>
		name &&
		scope.querySelectorAll<HTMLElement>(`[data-vt="${CSS.escape(name)}"]`).forEach((el) => {
			el.style.setProperty('view-transition-name', name);
			el.style.setProperty('view-transition-class', 'banner');
		});
	const clearBanners = () =>
		document.querySelectorAll<HTMLElement>('[data-vt]').forEach((el) => {
			el.style.removeProperty('view-transition-name');
			el.style.removeProperty('view-transition-class');
		});

	let running: any = null;
	function transition(from: string, to: string, change: () => Promise<unknown>) {
		// A quick second navigation cuts the first transition short instead of failing.
		running?.skipTransition();
		clearBanners();
		const slug = detailSlug(to) ?? detailSlug(from);
		const shared = slug ? `banner-${slug}` : null;
		nameBanners(shared);
		viewTransition = true;
		document.documentElement.classList.add('vt-running');
		const t = (running = (document as any).startViewTransition(async () => {
			const old = document.querySelector('main');
			await change();
			// Svelte removes the old page a frame later; hide it now so it isn't in the snapshot
			// (and a shared banner name isn't on the page twice, which cancels the transition).
			if (old?.isConnected && document.querySelectorAll('main').length > 1) old.style.display = 'none';
			const now = [...document.querySelectorAll('main')].find((m) => m !== old);
			if (now) nameBanners(shared, now);
		}));
		t.finished.finally(() => {
			if (running !== t) return;
			running = null;
			clearBanners();
			viewTransition = false;
			// Page entrance animations are skipped during the transition; let them finish first.
			setTimeout(() => document.documentElement.classList.remove('vt-running'), 900);
		});
	}

	// Load the next page's data first (with the progress bar showing), then switch: a transition
	// freezes the screen until the new page is ready, so it should only start once it is.
	// Hovering a link starts that loading early, so usually it's instant. SvelteKit keeps only the
	// last prefetched page, so this asks again rather than assuming an earlier one is still there.
	let lastPrefetch = { href: '', at: 0, done: Promise.resolve() as Promise<unknown> };
	function preload(href: string) {
		if (lastPrefetch.href !== href || Date.now() - lastPrefetch.at > 10000) {
			lastPrefetch = { href, at: Date.now(), done: prefetch(href).catch(() => {}) };
		}
		return lastPrefetch.done;
	}
	let navToken = 0;
	async function navigate(href: string) {
		if (!canTransition()) return goto(href);
		const token = ++navToken;
		const slow = setTimeout(() => ((progressVisible = true), (progressWidth = 30)), 120);
		await Promise.race([preload(href), new Promise((r) => setTimeout(r, 4000))]);
		clearTimeout(slow);
		if (token !== navToken) return; // clicked something else meanwhile
		transition($page.url.pathname, href.split(/[?#]/)[0], () => goto(href));
	}
	function onHover(e: Event) {
		const href = (e.target as HTMLElement)?.closest?.('a')?.getAttribute('href');
		if (internal(href) && href.split(/[?#]/)[0] !== $page.url.pathname) preload(href);
	}
	// Every link to a page on this site goes through navigate(), for the transition. Runs in the
	// capture phase, before SvelteKit's own link handling. Back/forward use the regular crossfade:
	// their page can't be loaded ahead, and a transition would freeze the screen while it loads.
	function onLinkClick(e: MouseEvent) {
		if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		const a = (e.target as HTMLElement).closest('a');
		const href = a?.getAttribute('href');
		if (!a || !internal(href) || a.target === '_blank' || a.hasAttribute('download')) return;
		if (href.split(/[?#]/)[0] === $page.url.pathname && href.includes('#')) return; // same-page anchors
		e.preventDefault();
		navigate(href);
	}

	// Crossfade without a jump when there's no View Transition: the old page leaves the layout
	// (absolutely positioned where it was) while it fades, so the new one doesn't stack below it.
	function leave(node: HTMLElement, { duration }: { duration: number }) {
		if (duration) {
			const { offsetTop, offsetLeft, offsetWidth } = node;
			Object.assign(node.style, { position: 'absolute', top: `${offsetTop}px`, left: `${offsetLeft}px`, width: `${offsetWidth}px` });
		}
		return { duration, css: (t: number) => `opacity: ${t}` };
	}

	// ── keyboard: command palette (ctrl/⌘+K, or "/"), and the konami code ──
	let paletteOpen = false;
	const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
	let konamiIndex = 0;
	let konamiActivated = false;
	function handleKeydown(e: KeyboardEvent) {
		const typing = (e.target as HTMLElement)?.closest?.('input, textarea, [contenteditable="true"]');
		if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			paletteOpen = !paletteOpen;
			return;
		}
		if (e.key === '/' && !typing && !paletteOpen) {
			e.preventDefault();
			paletteOpen = true;
			return;
		}
		if (e.key === konamiCode[konamiIndex]) {
			konamiIndex++;
			if (konamiIndex === konamiCode.length) {
				konamiActivated = true;
				konamiIndex = 0;
				setTimeout(() => (konamiActivated = false), 4000);
			}
		} else {
			konamiIndex = 0;
		}
	}

	// Clicking the name ten times.
	let clickCount = 0;
	let clickEgg = false;
	function handleLogoClick() {
		if (++clickCount >= 10) {
			clickEgg = true;
			clickCount = 0;
			setTimeout(() => (clickEgg = false), 3000);
		}
	}

	let weather: { temp: number; unit?: string; description: string; icon: string; city: string; label?: string; feels_like?: number; humidity?: number } | null = null;

	onMount(() => {
		ready = true;
		app.hydrated = true;

		transUnlocked = localStorage.getItem('trans-unlocked') === '1';
		themeId = localStorage.getItem('site-theme') ?? '';
		// Last known theme list first, so a saved custom theme shows straight away.
		try {
			const cached = JSON.parse(localStorage.getItem('themes-cache') ?? 'null');
			if (Array.isArray(cached?.items) && cached.items.length) {
				themes = cached.items;
				if (cached.default) defaultTheme = cached.default;
			}
			unlocked = JSON.parse(localStorage.getItem('themes-unlocked') ?? '[]');
		} catch {}
		fetch('/api/site/themes')
			.then((r) => (r.ok ? r.json() : null))
			.then((d) => {
				if (!d?.items?.length) return;
				themes = d.items;
				if (d.default) defaultTheme = d.default;
				localStorage.setItem('themes-cache', JSON.stringify(d));
			})
			.catch(() => {});

		const savedDarkMode = localStorage.getItem('dark-mode');
		if (savedDarkMode === 'dark') darkMode = true;
		else if (savedDarkMode === 'light') darkMode = false;
		// Follow the system setting when nothing's saved.
		const system = window.matchMedia('(prefers-color-scheme: dark)');
		systemDark = system.matches;
		system.addEventListener('change', (e) => (systemDark = e.matches));

		// `tf` in the home page terminal toggles the trans theme.
		window.addEventListener('trans-theme', (e) => {
			if ((e as CustomEvent<boolean>).detail) unlockTrans();
			else setTheme(visibleThemes.find((t) => t.id !== 'trans')?.id ?? '');
		});
		// …and typing `tf` in the browser devtools console does it too.
		Object.defineProperty(window, 'tf', {
			configurable: true,
			get() {
				unlockTrans();
				console.log('%c trans rights are human rights ', 'background: linear-gradient(90deg, #5BCEFA, #F5A9B8, #FFFFFF, #F5A9B8, #5BCEFA); color: #1f1c2a; font-weight: bold; padding: 4px 8px; border-radius: 4px;');
				return 'trans theme unlocked :3 (find it in the theme picker)';
			}
		});

		fetch('/api/weather')
			.then((r) => (r.ok ? r.json() : null))
			.then((w) => w?.city && (weather = w))
			.catch(() => {});
	});
</script>

<svelte:window on:click|capture={onLinkClick} on:keydown={handleKeydown} on:mouseover={onHover} on:touchstart|passive={onHover} on:focusin={onHover} />

<!-- Link preview defaults (Discord, Twitter, …). Pages add their own og:title/description,
     and posts/events/projects their banner as og:image. There's deliberately no default image,
     and "summary" makes Discord show a page's image as a small thumbnail instead of a big one. -->
<svelte:head>
	<meta property="og:site_name" content="sundei" />
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://sundei.ee{$page.url.pathname}" />
	<meta name="twitter:card" content="summary" />
	<link rel="alternate" type="application/rss+xml" title="sundei" href="/rss.xml" />
</svelte:head>

<Backdrop {theme} {dark} />
<CursorTrail />

{#if progressVisible}
	<div class="fixed top-0 left-0 right-0 z-[100] h-[2px]">
		<div class="h-full accent-bg transition-all duration-100 ease-out" style="width: {progressWidth}%" />
	</div>
{/if}

{#if theme.stripe}
	<div class="fixed top-0 left-0 right-0 h-[3px] z-[60] pointer-events-none" style="background: {theme.stripe}" aria-hidden="true" />
{/if}

{#if konamiActivated}
	<div class="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none" in:fade={{ duration: 300 }} out:fade={{ duration: 300 }}>
		<div class="text-center">
			<p class="text-6xl mb-4">🎮</p>
			<p class="text-ocean-900 dark:text-ocean-100 text-2xl font-cascadia font-bold">+30 lives</p>
			<p class="text-ocean-600 dark:text-ocean-400 font-cascadia text-sm mt-1">↑↑↓↓←→←→BA</p>
		</div>
	</div>
{/if}

{#if clickEgg}
	<div
		class="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] bg-ocean-900 dark:bg-ocean-100 text-ocean-100 dark:text-ocean-900 px-4 py-2 rounded-full font-cascadia text-sm shadow-lg"
		in:fly={{ y: 20, duration: 200 }}
		out:fade={{ duration: 300 }}
	>
		you found a secret! 🥚
	</div>
{/if}

{#if transToast}
	<div
		class="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-4 py-2 rounded-full font-cascadia text-sm shadow-lg text-[#1f1c2a]"
		style="background: linear-gradient(90deg, #5BCEFA, #F5A9B8, #FFFFFF, #F5A9B8, #5BCEFA)"
		in:fly={{ y: 20, duration: 200 }}
		out:fade={{ duration: 300 }}
	>
		🏳️‍⚧️ trans rights! theme unlocked :3
	</div>
{/if}

<Nav
	links={navLinks}
	pathname={$page.url.pathname}
	{isDarkMode}
	themes={pickerThemes}
	currentTheme={pickerCurrent}
	{weather}
	on:toggleDark={toggleDarkMode}
	on:setTheme={(e) => setTheme(e.detail.id)}
	on:logoClick={handleLogoClick}
	on:openPalette={() => (paletteOpen = true)}
/>
<CommandPalette
	open={paletteOpen}
	pages={footerLinks.filter((l) => !l.href.endsWith('.xml'))}
	themes={pickerThemes}
	on:close={() => (paletteOpen = false)}
	on:navigate={(e) => navigate(e.detail)}
	on:toggleDark={toggleDarkMode}
	on:setTheme={(e) => setTheme(e.detail)}
/>

{#key $page.url.pathname}
	<!-- flex-1: fills the leftover height so the footer stays at the bottom of short pages -->
	<main
		class="flex-1"
		in:fly={{ y: 12, duration: ready && !viewTransition ? 450 : 0, delay: ready && !viewTransition ? 100 : 0, easing: cubicOut }}
		out:leave={{ duration: ready && !viewTransition ? 150 : 0 }}
	>
		<slot />
	</main>
{/key}

<Footer links={footerLinks} {updatedAgo} updatedFull={new Date(BUILD_TIMESTAMP).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' })} />

<style>
	/* Page changes (View Transitions): a crossfade (both pages overlap, so there's never an empty
	   moment) where the old page drifts up and the new one rises in. The nav and the background
	   have their own names, so they stay put. */
	:global(::view-transition-old(root)) {
		animation: 260ms cubic-bezier(0.4, 0, 0.6, 1) both page-out;
	}
	:global(::view-transition-new(root)) {
		animation: 380ms cubic-bezier(0.2, 0.8, 0.2, 1) both page-in;
	}
	:global(::view-transition-group(*)) {
		animation-duration: 450ms;
		animation-timing-function: cubic-bezier(0.2, 0.8, 0.2, 1);
	}
	@keyframes -global-page-out {
		to {
			opacity: 0;
			transform: translateY(-6px);
		}
	}
	@keyframes -global-page-in {
		from {
			opacity: 0;
			transform: translateY(14px);
		}
	}
	/* A travelling banner stays a rounded box, and both snapshots fill it (cropped, not
	   stretched) while it changes shape; the card and the post header crossfade inside. */
	:global(::view-transition-image-pair(*.banner)) {
		overflow: hidden;
		border-radius: 1rem;
	}
	:global(::view-transition-old(*.banner)),
	:global(::view-transition-new(*.banner)) {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center;
	}
	:global(::view-transition-old(*.banner)) {
		animation: 300ms ease both fade-out;
	}
	:global(::view-transition-new(*.banner)) {
		animation: 300ms ease 80ms both fade-in;
	}
	@keyframes -global-fade-out {
		to {
			opacity: 0;
		}
	}
	@keyframes -global-fade-in {
		from {
			opacity: 0;
		}
	}
	/* Page entrance animations would play twice on top of the transition; skip them meanwhile. */
	:global(html.vt-running main *) {
		animation-duration: 0s !important;
		animation-delay: 0s !important;
	}
	@media (prefers-reduced-motion: reduce) {
		:global(::view-transition-group(*)),
		:global(::view-transition-old(*)),
		:global(::view-transition-new(*)) {
			animation: none !important;
		}
	}

	/* Theme parts (colours come from the theme as CSS variables, see applyTheme) */
	:global(::selection) {
		background: var(--accent);
		color: var(--accent-fg);
	}
	:global(.glass) {
		background: var(--glass);
		-webkit-backdrop-filter: blur(var(--glass-blur));
		backdrop-filter: blur(var(--glass-blur));
	}
	:global(.glass-strong) {
		background: var(--glass-strong);
		-webkit-backdrop-filter: blur(max(var(--glass-blur), 12px));
		backdrop-filter: blur(max(var(--glass-blur), 12px));
	}
	:global(.accent-bg) {
		background: var(--accent);
	}
	:global(.accent-soft) {
		background: color-mix(in srgb, var(--accent) 22%, transparent);
	}
</style>
