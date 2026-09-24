<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly, slide } from 'svelte/transition';
	import { page, navigating } from '$app/stores';
	import { cubicOut } from 'svelte/easing';
	import { browser } from '$app/env';
	import GradientMesh from '$lib/components/GradientMesh.svelte';
	import CursorTrail from '$lib/components/CursorTrail.svelte';

	import '../app.css';

	let ready = false;
	let mobileMenuOpen = false;
	let themeOpen = false;

	// Dark mode toggle
	let darkMode: boolean | null = null;

	function toggleDarkMode() {
		darkMode = !isDark();
		localStorage.setItem('dark-mode', darkMode ? 'dark' : 'light');
		applyTheme(document.hasFocus());
	}

	// Progress bar
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

	// Easter eggs
	const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
	let konamiIndex = 0;
	let konamiActivated = false;
	let clickCount = 0;
	let clickEgg = false;

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === konamiCode[konamiIndex]) {
			konamiIndex++;
			if (konamiIndex === konamiCode.length) {
				konamiActivated = true;
				konamiIndex = 0;
				setTimeout(() => konamiActivated = false, 4000);
			}
		} else {
			konamiIndex = 0;
		}
	}

	function handleLogoClick() {
		clickCount++;
		if (clickCount >= 10) {
			clickEgg = true;
			clickCount = 0;
			setTimeout(() => clickEgg = false, 3000);
		}
	}

	const themes = [
		{ name: 'rose', light: '#f9f0f5', dark: '#281c21', lightBlur: '#f3f3f3', darkBlur: '#202020', accent: '#B48EAD' },
		{ name: 'ocean', light: '#f0f3f9', dark: '#1c2128', lightBlur: '#f0f0f3', darkBlur: '#1a1e24', accent: '#8FA1B3' },
		{ name: 'forest', light: '#f0f5f1', dark: '#1c2820', lightBlur: '#f0f3f0', darkBlur: '#1e2420', accent: '#A3BE8C' },
		{ name: 'sunset', light: '#f5f2f0', dark: '#28211c', lightBlur: '#f3f2f0', darkBlur: '#242120', accent: '#EBCB8B' },
		{ name: 'lavender', light: '#f3f0f9', dark: '#221c28', lightBlur: '#f1f0f3', darkBlur: '#201e24', accent: '#9B8EC4' },
		{ name: 'mono', light: '#f5f5f5', dark: '#1a1a1a', lightBlur: '#f0f0f0', darkBlur: '#181818', accent: '#888888' }
	];

	// Secret theme: type `tf` in the browser console to unlock it.
	const transTheme = {
		name: 'trans', light: '#fdf1f5', dark: '#1f1c2a', lightBlur: '#f7f1f4', darkBlur: '#1c1a24', accent: '#F5A9B8',
		swatch: 'linear-gradient(#5BCEFA 0 20%, #F5A9B8 20% 40%, #FFFFFF 40% 60%, #F5A9B8 60% 80%, #5BCEFA 80%)'
	};
	let transUnlocked = false;
	let transToast = false;
	$: visibleThemes = transUnlocked ? [...themes, transTheme] : themes;
	const swatch = (theme: { accent: string; swatch?: string }) => `background: ${theme.swatch ?? theme.accent}`;

	function unlockTrans() {
		transUnlocked = true;
		localStorage.setItem('trans-unlocked', '1');
		setTheme(transTheme);
		transToast = true;
		setTimeout(() => (transToast = false), 4000);
	}

	let currentTheme: typeof themes[0] & { swatch?: string } = themes[0];

	function setTheme(theme: typeof currentTheme) {
		currentTheme = theme;
		localStorage.setItem('site-theme', theme.name);
		applyTheme(true);
		themeOpen = false;
	}

	function handleClickOutside(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (themeOpen && !target.closest('.theme-switcher')) {
			themeOpen = false;
		}
	}

	function isDark(): boolean {
		if (darkMode !== null) return darkMode;
		if (!browser) return false;
		return window.matchMedia('(prefers-color-scheme: dark)').matches;
	}

	// Reactive dark mode flag for template (triggers re-render when darkMode changes)
	$: isDarkMode = browser ? (darkMode !== null ? darkMode : window.matchMedia('(prefers-color-scheme: dark)').matches) : false;

	function applyTheme(focused: boolean) {
		const t = currentTheme;
		document.documentElement.classList.toggle('dark', isDark());
		document.documentElement.classList.toggle('trans', t.name === 'trans');
		document.body.className = `motion-safe:transition-colors motion-safe:duration-300`;
		if (isDark()) {
			document.body.style.backgroundColor = focused ? t.dark : t.darkBlur;
		} else {
			document.body.style.backgroundColor = focused ? t.light : t.lightBlur;
		}
	}

	// Close mobile menu on navigation
	$: if ($page.url.pathname) {
		mobileMenuOpen = false;
		themeOpen = false;
	}

	const navLinks = [
		{ href: '/', label: 'home' },
		{ href: '/about', label: 'about' },
		//{ href: '/now', label: 'now' },
		//{ href: '/stats', label: 'stats' },
		{ href: '/blog', label: 'blog' },
		{ href: '/tournaments', label: 'tournaments' },
		{ href: '/osu', label: 'osu!' },
		{ href: '/events', label: 'events' },
		{ href: '/gallery', label: 'gallery' },
		{ href: '/music', label: 'music' },
		{ href: '/guestbook', label: 'guestbook' }
	];

	// Smaller pages that only get a spot in the footer.
	const footerExtraLinks = [
		{ href: '/now', label: 'now' },
		{ href: '/projects', label: 'projects' },
		{ href: '/uses', label: 'uses' },
		{ href: '/changelog', label: 'changelog' },
		{ href: '/rss.xml', label: 'rss' }
	];

	function isActive(linkHref: string, currentPath: string): boolean {
		if (linkHref === '/') return currentPath === '/';
		return currentPath.startsWith(linkHref);
	}

	let weather = {
		temp: 0,
		feels_like: 0,
		description: '',
		icon: '',
		humidity: 0,
		wind_speed: 0,
		city: '',
		country: ''
	};
	let weatherLoading = true;

	onMount(() => {
		ready = true;

		// Load saved theme
		transUnlocked = localStorage.getItem('trans-unlocked') === '1';
		const savedTheme = localStorage.getItem('site-theme');
		if (savedTheme) {
			const found = [...themes, ...(transUnlocked ? [transTheme] : [])].find(t => t.name === savedTheme);
			if (found) currentTheme = found;
		}

		// `tf` in the home page terminal toggles the trans theme.
		window.addEventListener('trans-theme', (e) => {
			if ((e as CustomEvent<boolean>).detail) unlockTrans();
			else setTheme(themes[0]);
		});

		// Bonus: typing `tf` in the browser devtools console does it too.
		Object.defineProperty(window, 'tf', {
			configurable: true,
			get() {
				unlockTrans();
				console.log('%c trans rights are human rights ', 'background: linear-gradient(90deg, #5BCEFA, #F5A9B8, #FFFFFF, #F5A9B8, #5BCEFA); color: #1f1c2a; font-weight: bold; padding: 4px 8px; border-radius: 4px;');
				return 'trans theme unlocked :3 (find it in the theme picker)';
			}
		});

		// Load dark mode preference
		const savedDarkMode = localStorage.getItem('dark-mode');
		if (savedDarkMode === 'dark') darkMode = true;
		else if (savedDarkMode === 'light') darkMode = false;

		applyTheme(true);

		// Listen for system color scheme changes
		window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
			if (darkMode === null) {
				darkMode = null; // re-run isDarkMode for the toggle icon
				applyTheme(document.hasFocus());
			}
		});

		onblur = () => applyTheme(false);
		onfocus = () => applyTheme(true);

		// Fetch weather
		const fetchWeather = async () => {
			try {
				const response = await fetch('/api/weather');
				if (response.ok) {
					weather = await response.json();
				}
			} catch (error) {
				console.error('Failed to fetch weather:', error);
			} finally {
				weatherLoading = false;
			}
		};

		fetchWeather();
	});
</script>

<svelte:window on:click={handleClickOutside} on:keydown={handleKeydown} />

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

<GradientMesh />
<CursorTrail />

<!-- Progress bar -->
{#if progressVisible}
	<div class="fixed top-0 left-0 right-0 z-[100] h-[2px]">
		<div 
			class="h-full bg-ocean-600 dark:bg-ocean-400 transition-all duration-100 ease-out"
			style="width: {progressWidth}%"
		/>
	</div>
{/if}

<!-- Konami code easter egg -->
{#if konamiActivated}
	<div 
		class="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none"
		in:fade={{ duration: 300 }}
		out:fade={{ duration: 300 }}
	>
		<div class="text-center">
			<p class="text-6xl mb-4">🎮</p>
			<p class="text-ocean-900 dark:text-ocean-100 text-2xl font-cascadia font-bold">+30 lives</p>
			<p class="text-ocean-600 dark:text-ocean-400 font-cascadia text-sm mt-1">↑↑↓↓←→←→BA</p>
		</div>
	</div>
{/if}

<!-- Click egg -->
{#if clickEgg}
	<div 
		class="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] bg-ocean-900 dark:bg-ocean-100 text-ocean-100 dark:text-ocean-900 px-4 py-2 rounded-full font-cascadia text-sm shadow-lg"
		in:fly={{ y: 20, duration: 200 }}
		out:fade={{ duration: 300 }}
	>
		you found a secret! 🥚
	</div>
{/if}

<!-- tf egg -->
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

{#if currentTheme.name === 'trans'}
	<div class="trans-stripe fixed top-0 left-0 right-0 h-[3px] z-[60] pointer-events-none" aria-hidden="true" />
{/if}

<nav class="border-b border-ocean-300 dark:border-ocean-700 sticky top-0 backdrop-blur-md z-50">
	<div class="px-6 sm:px-12 lg:px-24 py-3 sm:py-4 flex justify-between items-center gap-6 font-cascadia">
		<a 
			href="/" 
			class="text-ocean-700 dark:text-ocean-300 hover:text-ocean-900 dark:hover:text-ocean-100 font-medium shrink-0"
			on:click={handleLogoClick}
		>
			sundei
		</a>

		<!-- Desktop nav -->
		<div class="hidden lg:flex gap-4 xl:gap-6 text-ocean-700 dark:text-ocean-400 text-sm items-center">
			{#each navLinks as link}
				<a 
					href={link.href} 
					class="transition-colors {isActive(link.href, $page.url.pathname) 
						? 'text-ocean-900 dark:text-ocean-100' 
						: 'hover:text-ocean-900 dark:hover:text-ocean-100'}"
				>
					{link.label}
				</a>
			{/each}
			
			{#if !weatherLoading && weather.city}
				<div class="hidden xl:flex items-center gap-1.5 border-l border-ocean-300 dark:border-ocean-700 pl-6 text-ocean-600 dark:text-ocean-400 text-xs whitespace-nowrap">
					{#if weather.icon}
						<img 
							src="https://openweathermap.org/img/wn/{weather.icon}.png" 
							alt={weather.description}
							class="w-6 h-6"
					/>
					{/if}
					<span>{weather.description} in {weather.city}, {weather.country} · {weather.temp}°C</span>
				</div>
			{/if}

			<!-- Dark mode toggle -->
			<button
				on:click={toggleDarkMode}
				class="border-l border-ocean-300 dark:border-ocean-700 pl-4 xl:pl-6 text-ocean-600 dark:text-ocean-400 hover:text-ocean-900 dark:hover:text-ocean-100 transition-colors"
				aria-label="Toggle dark mode"
			>
				{#if isDarkMode}
					<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
					</svg>
				{:else}
					<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
					</svg>
				{/if}
			</button>
			
			<!-- Theme switcher -->
			<div class="relative border-l border-ocean-300 dark:border-ocean-700 pl-4 xl:pl-6 theme-switcher">
				<button
					on:click={() => themeOpen = !themeOpen}
					class="w-5 h-5 rounded-full ring-2 ring-ocean-400 dark:ring-ocean-600 hover:ring-ocean-600 dark:hover:ring-ocean-400 transition-all"
					style={swatch(currentTheme)}
					aria-label="Change theme"
				/>
				{#if themeOpen}
					<div
						class="absolute right-0 top-full mt-2 bg-ocean-100 dark:bg-ocean-900 border border-ocean-300 dark:border-ocean-700 rounded-lg p-2 flex gap-1.5 shadow-lg z-50"
						transition:slide={{ duration: 150 }}
					>
						{#each visibleThemes as theme}
							<button
								on:click={() => setTheme(theme)}
								class="w-6 h-6 rounded-full transition-all {currentTheme.name === theme.name ? 'ring-2 ring-ocean-900 dark:ring-ocean-100 scale-110' : 'hover:scale-110 ring-1 ring-ocean-300 dark:ring-ocean-700'}"
								style={swatch(theme)}
								aria-label="{theme.name} theme"
								title={theme.name}
							/>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- Mobile: weather + hamburger -->
		<div class="flex lg:hidden items-center gap-3">
			{#if !weatherLoading && weather.city}
				<div class="flex items-center gap-1">
					{#if weather.icon}
						<img 
							src="https://openweathermap.org/img/wn/{weather.icon}.png" 
							alt={weather.description}
							class="w-5 h-5"
					/>
					{/if}
					<span class="text-ocean-600 dark:text-ocean-400 text-[10px]">{weather.description}, {weather.temp}°C</span>
				</div>
			{/if}
			<button 
				on:click={() => mobileMenuOpen = !mobileMenuOpen}
				class="text-ocean-700 dark:text-ocean-400 hover:text-ocean-900 dark:hover:text-ocean-100 p-1"
				aria-label="Toggle menu"
			>
				{#if mobileMenuOpen}
					<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				{:else}
					<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
					</svg>
				{/if}
			</button>
		</div>
	</div>

	<!-- Mobile dropdown menu -->
	{#if mobileMenuOpen}
		<div 
			class="lg:hidden border-t border-ocean-300 dark:border-ocean-700 font-cascadia"
			transition:slide={{ duration: 200 }}
		>
			<div class="px-6 py-3 flex flex-col gap-1">
				{#each navLinks as link}
					<a 
						href={link.href}
						class="py-2 px-3 rounded text-sm transition-colors {isActive(link.href, $page.url.pathname) 
							? 'text-ocean-900 dark:text-ocean-100 bg-ocean-200 dark:bg-ocean-800' 
							: 'text-ocean-700 dark:text-ocean-400 hover:text-ocean-900 dark:hover:text-ocean-100 hover:bg-ocean-200/50 dark:hover:bg-ocean-800/50'}"
					>
						{link.label}
					</a>
				{/each}

				<!-- Mobile dark mode + theme swatches -->
				<div class="mt-2 pt-2 border-t border-ocean-200 dark:border-ocean-800 px-3">
					<div class="flex items-center justify-between mb-3">
						<span class="text-ocean-600 dark:text-ocean-500 text-xs">dark mode</span>
						<button
							on:click={toggleDarkMode}
							class="w-9 h-5 rounded-full transition-colors {isDarkMode ? 'bg-ocean-600' : 'bg-ocean-300'} relative"
							aria-label="Toggle dark mode"
						>
							<div class="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform {isDarkMode ? 'translate-x-[18px]' : 'translate-x-0.5'}" />
						</button>
					</div>
					<span class="text-ocean-600 dark:text-ocean-500 text-xs mb-2 block">theme</span>
					<div class="flex gap-2">
						{#each visibleThemes as theme}
							<button
								on:click={() => setTheme(theme)}
								class="w-7 h-7 rounded-full transition-all {currentTheme.name === theme.name ? 'ring-2 ring-ocean-900 dark:ring-ocean-100 scale-110' : 'ring-1 ring-ocean-300 dark:ring-ocean-700 hover:scale-110'}"
								style={swatch(theme)}
								aria-label="{theme.name} theme"
							/>
						{/each}
					</div>
				</div>
			</div>
		</div>
	{/if}
</nav>

{#key $page.url.pathname}
	<!-- flex-1: fills the leftover height so the footer stays at the bottom of short pages -->
	<main 
		class="flex-1"
		in:fly={{ y: 8, duration: ready ? 300 : 0, delay: ready ? 100 : 0, easing: cubicOut }}
		out:fade={{ duration: ready ? 150 : 0 }}
	>
		<slot />
	</main>
{/key}

<footer class="border-t border-ocean-300 dark:border-ocean-700 font-cascadia">
	<div class="px-6 sm:px-12 lg:px-24 py-8 sm:py-10">
		<div class="flex flex-col sm:flex-row justify-between gap-6">
			<!-- Left: branding -->
			<div class="flex flex-col gap-2">
				<span class="text-ocean-900 dark:text-ocean-100 font-medium">sundei</span>
				<span class="text-ocean-600 dark:text-ocean-500 text-xs">
					"national geographic goddamn it" - ryan kwan
				</span>
			</div>

			<!-- Middle: pages -->
			<div class="flex flex-col gap-1.5 text-sm">
				<span class="text-ocean-900 dark:text-ocean-200 text-xs font-medium mb-1">pages</span>
				<div class="flex flex-wrap gap-x-4 gap-y-1">
					{#each [...navLinks, ...footerExtraLinks] as link}
						<a 
							href={link.href}
						class="text-ocean-600 dark:text-ocean-400 hover:text-ocean-900 dark:hover:text-ocean-100 transition-colors text-xs"
					>
						{link.label}
					</a>
				{/each}
				</div>
			</div>

			<!-- Right: socials -->
			<div class="flex flex-col gap-1.5 text-sm">
				<span class="text-ocean-900 dark:text-ocean-200 text-xs font-medium mb-1">socials</span>
				<div class="flex gap-4">
					<a 
						href="https://github.com/sundeiii" 
						target="_blank" rel="noopener noreferrer"
						class="text-ocean-700 dark:text-ocean-400 hover:text-ocean-900 dark:hover:text-ocean-100 transition-colors text-xs"
					>
						github
					</a>
					<a 
						href="https://twitter.com/deprivedsundei" 
						target="_blank" rel="noopener noreferrer"
						class="text-ocean-700 dark:text-ocean-400 hover:text-ocean-900 dark:hover:text-ocean-100 transition-colors text-xs"
					>
						twitter
					</a>
					<a 
						href="mailto:sundei@sundei.ee"
						class="text-ocean-700 dark:text-ocean-400 hover:text-ocean-900 dark:hover:text-ocean-100 transition-colors text-xs"
					>
						email
					</a>
				</div>
			</div>
		</div>

		<div class="mt-6 pt-4 border-t border-ocean-200 dark:border-ocean-800">
			<p class="text-ocean-600 dark:text-ocean-600 text-xs">
				© {new Date().getFullYear()} sundei. source on <a href="https://github.com/sundeiii/new-main-website" target="_blank" rel="noopener noreferrer" class="underline hover:text-ocean-800 dark:hover:text-ocean-400 transition-colors">github</a>.
			</p>
		</div>
	</div>
</footer>

<style>
	.trans-stripe {
		background: linear-gradient(90deg, #5bcefa 0 20%, #f5a9b8 20% 40%, #ffffff 40% 60%, #f5a9b8 60% 80%, #5bcefa 80%);
	}

	:global(html.trans ::selection) {
		background: #f5a9b8;
		color: #1f1c2a;
	}
</style>
