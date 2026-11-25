<script lang="ts">
	import { createEventDispatcher, onDestroy, onMount, tick } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { presence } from './presence';

	interface Theme {
		id: string;
		name: string;
		accent: string;
		swatch?: string;
	}

	export let links: { href: string; label: string }[];
	export let pathname: string;
	export let isDarkMode: boolean;
	export let themes: Theme[];
	export let currentTheme: Theme;
	export let weather: { temp: number; description: string; icon: string; city: string } | null;

	const dispatch = createEventDispatcher<{ toggleDark: void; setTheme: Theme; logoClick: void; openPalette: void }>();

	// Live status next to the name; the card with details opens on hover, focus or tap.
	let statusOpen = false;
	let statusTimer: ReturnType<typeof setTimeout>;
	const openStatus = () => (clearTimeout(statusTimer), (statusOpen = true));
	const closeStatus = () => (statusTimer = setTimeout(() => (statusOpen = false), 150));
	const dotColor = { online: 'bg-green-500', idle: 'bg-yellow-500', dnd: 'bg-red-500', offline: 'bg-ocean-400 dark:bg-ocean-600' };
	const isMac = typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform);

	let menuOpen = false;
	let themeOpen = false;
	let scrolled = false;

	$: isActive = (href: string) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/'));
	const swatch = (t: Theme) => `background: ${t.swatch ?? t.accent}`;

	// The pill behind the active link slides to it instead of jumping. It's measured again
	// whenever the links change size (e.g. once the web font has loaded and the text gets wider),
	// and only animates after it has been placed once, so it never slides in from a wrong spot.
	let linkEls: HTMLAnchorElement[] = [];
	let linksEl: HTMLDivElement;
	let indicator = { left: 0, width: 0, visible: false };
	let animate = false;
	async function moveIndicator() {
		await tick();
		const i = links.findIndex((l) => isActive(l.href));
		const el = linkEls[i];
		indicator = el ? { left: el.offsetLeft, width: el.offsetWidth, visible: true } : { ...indicator, visible: false };
		if (indicator.visible && !animate) requestAnimationFrame(() => requestAnimationFrame(() => (animate = true)));
	}
	$: pathname, links, isActive, moveIndicator();

	let observer: ResizeObserver | undefined;
	onMount(() => {
		observer = new ResizeObserver(() => moveIndicator());
		observer.observe(linksEl);
		linkEls.forEach((el) => el && observer?.observe(el));
		document.fonts?.ready.then(moveIndicator);
	});
	onDestroy(() => observer?.disconnect());

	$: if (pathname) {
		menuOpen = false;
		themeOpen = false;
	}

	function outside(e: MouseEvent) {
		if (themeOpen && !(e.target as HTMLElement).closest('.theme-menu')) themeOpen = false;
		if (statusOpen && !(e.target as HTMLElement).closest('.status-menu')) statusOpen = false;
	}
</script>

<svelte:window on:scroll={() => (scrolled = window.scrollY > 8)} on:click={outside} />

<!-- Same side padding as the pages (p-8 sm:p-12 lg:p-24), so "sundei" lines up with their content. -->
<!-- Its own view-transition-name keeps the nav still while pages change underneath it. -->
<header class="sticky top-0 z-50 px-8 sm:px-12 lg:px-24 pt-3 font-cascadia" style="view-transition-name: site-nav">
	<nav
		class="-mx-5 grid grid-cols-[1fr_auto] lg:grid-cols-[minmax(max-content,1fr)_auto_minmax(max-content,1fr)] items-center gap-2 rounded-full border px-2 py-1.5 transition-all duration-300
			{scrolled
			? 'glass-strong border-ocean-300/60 dark:border-ocean-700/60 shadow-lg shadow-black/10'
			: 'border-transparent bg-transparent'}"
	>
		<!-- Three columns (left, links, right) so the links stay dead centre whatever loads on
		     either side (the live status, the weather). -->
		<div class="flex items-center gap-2 min-w-0">
		<a href="/" class="pl-3 py-1.5 font-medium text-ocean-900 dark:text-ocean-100 shrink-0" on:click={() => dispatch('logoClick')}>sundei</a>

		<!-- live status -->
		{#if $presence}
			<div in:fade={{ duration: 250 }} class="relative status-menu shrink min-w-0" on:mouseenter={openStatus} on:mouseleave={closeStatus} on:focusin={openStatus} on:focusout={closeStatus}>
				<button
					on:click={openStatus}
					class="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full text-xs text-ocean-600 dark:text-ocean-400 hover:bg-ocean-200/60 dark:hover:bg-ocean-800/60 transition-colors min-w-0"
					aria-expanded={statusOpen}
					aria-label="what i'm up to: {$presence.short}"
				>
					<span class="relative flex w-2 h-2 shrink-0">
						{#if $presence.live}<span class="absolute inset-0 rounded-full {dotColor[$presence.status]} animate-ping opacity-60" />{/if}
						<span class="relative w-2 h-2 rounded-full {dotColor[$presence.status]}" />
					</span>
					<span class="hidden xl:block truncate max-w-[13rem]">{$presence.short}</span>
				</button>
				{#if statusOpen}
					<div
						class="absolute left-0 top-full mt-2 w-72 rounded-2xl border border-ocean-300/60 dark:border-ocean-700/60 glass-strong p-2 shadow-xl"
						transition:fly={{ y: -4, duration: 150, easing: cubicOut }}
					>
						{#each $presence.items as item}
							<svelte:element
								this={item.href ? 'a' : 'div'}
								href={item.href}
								target={item.href ? '_blank' : undefined}
								rel={item.href ? 'noopener noreferrer' : undefined}
								class="flex items-center gap-3 rounded-xl p-2 {item.href ? 'hover:bg-ocean-200/60 dark:hover:bg-ocean-800/60' : ''}"
							>
								{#if item.image}
									<img src={item.image} alt="" class="w-9 h-9 rounded-md shrink-0" />
								{:else}
									<span class="w-9 h-9 rounded-md shrink-0 grid place-items-center bg-ocean-200/70 dark:bg-ocean-800/70 text-base">
										{item.label === 'coding' ? '⌨' : item.label === 'watching' ? '▶' : item.label === 'listening' ? '♪' : '●'}
									</span>
								{/if}
								<span class="min-w-0 text-xs">
									<span class="block text-[10px] uppercase tracking-widest text-ocean-500">{item.label}{item.live ? '' : ' · paused'}</span>
									<span class="block truncate text-ocean-900 dark:text-ocean-100">{item.title}</span>
									{#if item.sub}<span class="block truncate text-ocean-600 dark:text-ocean-400">{item.sub}</span>{/if}
								</span>
							</svelte:element>
						{:else}
							<p class="p-2 text-xs text-ocean-600 dark:text-ocean-400">nothing going on right now. i'm {$presence.short}.</p>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
		</div>

		<!-- desktop links -->
		<div bind:this={linksEl} class="relative hidden lg:flex items-center">
			<span
				class="absolute top-0 bottom-0 rounded-full accent-soft ease-out {animate ? 'transition-all duration-300' : ''}"
				style="left: {indicator.left}px; width: {indicator.width}px; opacity: {indicator.visible ? 1 : 0}"
				aria-hidden="true"
			/>
			{#each links as link, i}
				<a
					bind:this={linkEls[i]}
					href={link.href}
					class="relative px-2 xl:px-3 py-1.5 text-sm rounded-full transition-colors duration-200
						{isActive(link.href) ? 'text-ocean-900 dark:text-ocean-100' : 'text-ocean-600 dark:text-ocean-400 hover:text-ocean-900 dark:hover:text-ocean-100'}"
					aria-current={isActive(link.href) ? 'page' : undefined}>{link.label}</a
				>
			{/each}
		</div>

		<div class="flex items-center gap-1 justify-self-end">
			{#if weather?.city}
				<span in:fade={{ duration: 250 }} class="hidden 2xl:flex items-center gap-1 px-2 text-xs text-ocean-600 dark:text-ocean-400" title="{weather.description} in {weather.city}">
					{#if weather.icon}<img src="https://openweathermap.org/img/wn/{weather.icon}.png" alt="" class="w-6 h-6 -my-1" />{/if}
					{weather.temp}°
				</span>
			{/if}

			<button
				on:click={() => dispatch('openPalette')}
				class="h-8 px-2 flex items-center gap-1.5 rounded-full text-ocean-600 dark:text-ocean-400 hover:text-ocean-900 dark:hover:text-ocean-100 hover:bg-ocean-200/60 dark:hover:bg-ocean-800/60 transition-colors"
				aria-label="search and commands"
				title="search and commands ({isMac ? '⌘' : 'ctrl'}+k)"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" /></svg>
				<kbd class="hidden xl:inline text-[10px] font-cascadia">{isMac ? '⌘' : 'ctrl'} k</kbd>
			</button>
			<button
				on:click={() => dispatch('toggleDark')}
				class="w-8 h-8 grid place-items-center rounded-full text-ocean-600 dark:text-ocean-400 hover:text-ocean-900 dark:hover:text-ocean-100 hover:bg-ocean-200/60 dark:hover:bg-ocean-800/60 transition-colors"
				aria-label="toggle dark mode"
			>
				{#if isDarkMode}
					<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
				{:else}
					<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
				{/if}
			</button>

			<div class="relative theme-menu">
				<button
					on:click={() => (themeOpen = !themeOpen)}
					class="w-8 h-8 grid place-items-center rounded-full hover:bg-ocean-200/60 dark:hover:bg-ocean-800/60 transition-colors"
					aria-label="change theme"
					aria-expanded={themeOpen}
				>
					<span class="w-4 h-4 rounded-full ring-1 ring-ocean-400/50" style={swatch(currentTheme)} />
				</button>
				{#if themeOpen}
					<div
						class="absolute right-0 top-full mt-2 flex gap-1.5 rounded-full border border-ocean-300/60 dark:border-ocean-700/60 glass-strong p-1.5 shadow-lg"
						transition:fly={{ y: -4, duration: 150, easing: cubicOut }}
					>
						{#each themes as theme}
							<button
								on:click={() => dispatch('setTheme', theme)}
								class="w-6 h-6 rounded-full transition-transform duration-200 hover:scale-110
									{currentTheme.id === theme.id ? 'ring-2 ring-offset-2 ring-offset-ocean-100 dark:ring-offset-ocean-950 ring-ocean-500' : ''}"
								style={swatch(theme)}
								aria-label="{theme.name} theme"
								title={theme.name}
							/>
						{/each}
					</div>
				{/if}
			</div>

			<button
				on:click={() => (menuOpen = !menuOpen)}
				class="lg:hidden w-8 h-8 grid place-items-center rounded-full text-ocean-700 dark:text-ocean-300 hover:bg-ocean-200/60 dark:hover:bg-ocean-800/60"
				aria-label="menu"
				aria-expanded={menuOpen}
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					{#if menuOpen}<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />{:else}<path stroke-linecap="round" stroke-linejoin="round" d="M4 8h16M4 16h16" />{/if}
				</svg>
			</button>
		</div>
	</nav>

	<!-- mobile menu -->
	{#if menuOpen}
		<div
			class="lg:hidden -mx-5 mt-2 rounded-3xl border border-ocean-300/60 dark:border-ocean-700/60 glass-strong p-2 shadow-lg"
			in:fly={{ y: -6, duration: 200, easing: cubicOut }}
			out:fade={{ duration: 120 }}
		>
			<div class="grid grid-cols-2 gap-1">
				{#each links as link}
					<a
						href={link.href}
						class="px-4 py-2.5 rounded-2xl text-sm transition-colors
							{isActive(link.href) ? 'accent-soft text-ocean-900 dark:text-ocean-100' : 'text-ocean-700 dark:text-ocean-300 hover:bg-ocean-200/50 dark:hover:bg-ocean-800/50'}"
						>{link.label}</a
					>
				{/each}
			</div>
			{#if weather?.city}
				<p class="px-4 pt-2 pb-1 text-xs text-ocean-500">{weather.description} in {weather.city} · {weather.temp}°C</p>
			{/if}
		</div>
	{/if}
</header>
