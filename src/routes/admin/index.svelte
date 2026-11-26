<script lang="ts">
	import { onMount } from 'svelte';
	import BlogAdmin from '$lib/components/admin/BlogAdmin.svelte';
	import GuestbookAdmin from '$lib/components/admin/GuestbookAdmin.svelte';
	import CompanionAdmin from '$lib/components/admin/companion/CompanionAdmin.svelte';
	import MediaAdmin from '$lib/components/admin/MediaAdmin.svelte';
	import PagesAdmin from '$lib/components/admin/PagesAdmin.svelte';
	import TournamentsAdmin from '$lib/components/admin/TournamentsAdmin.svelte';
	import { field, primary, subtle } from '$lib/components/admin/styles';
	import { contentSections, pageSections, sectionInfo, type PageSection, type Section } from '$lib/components/admin/sections';
	import { fade } from 'svelte/transition';

	const groups = [
		{ title: 'content', items: contentSections },
		{ title: 'pages', items: pageSections }
	];
	// Remembered per browser, so a refresh opens the same section again.
	let active: Section = 'blog';
	let pageSection: PageSection = 'home';
	function open(to: string) {
		if (!(to in sectionInfo)) return;
		const s = to as Section;
		active = s;
		if ((pageSections as readonly string[]).includes(s)) pageSection = s as PageSection;
		try { localStorage.setItem('admin-section', s); } catch {}
	}
	$: info = sectionInfo[active];
	$: isPage = (pageSections as readonly string[]).includes(active);

	let checking = true;
	let enabled = true;
	let loggedIn = false;
	let password = '';
	let loginError = '';
	let loggingIn = false;

	async function checkSession() {
		const data = await (await fetch('/api/admin/session')).json();
		enabled = data.enabled;
		loggedIn = data.loggedIn;
		checking = false;
	}

	async function logIn() {
		loggingIn = true;
		loginError = '';
		const res = await fetch('/api/admin/session', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ password })
		});
		loggingIn = false;
		password = '';
		if (res.ok) loggedIn = true;
		else loginError = (await res.json()).error || 'Login failed';
	}

	async function logOut() {
		await fetch('/api/admin/session', { method: 'DELETE' });
		loggedIn = false;
	}

	const sessionExpired = () => (loggedIn = false);

	onMount(() => {
		try {
			const saved = localStorage.getItem('admin-section') as Section | null;
			if (saved) open(saved);
		} catch {}
		checkSession();
	});
</script>

<svelte:head>
	<title>admin panel</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<section class="px-8 sm:px-12 lg:px-24 pt-8 sm:pt-12 pb-16 font-cascadia">
	{#if checking}
		<p class="text-ocean-600 dark:text-ocean-400 text-sm">checking session…</p>
	{:else if !enabled}
		<div class="glass max-w-lg rounded-2xl border border-ocean-300/60 dark:border-ocean-700/60 p-6 text-sm text-ocean-700 dark:text-ocean-300">
			admin is disabled. set <code class="text-ocean-900 dark:text-ocean-100">ADMIN_PASSWORD</code> in <code>.env</code>
			(and in vercel's environment variables), then restart the server.
		</div>
	{:else if !loggedIn}
		<div class="min-h-[60vh] grid place-items-center">
			<form on:submit|preventDefault={logIn} class="glass-strong w-full max-w-sm rounded-3xl border border-ocean-300/60 dark:border-ocean-700/60 p-8 flex flex-col gap-4 shadow-xl" in:fade={{ duration: 200 }}>
				<div>
					<h1 class="text-2xl text-ocean-900 dark:text-ocean-100">admin</h1>
					<p class="text-sm text-ocean-600 dark:text-ocean-400 mt-1">log in to edit the site</p>
				</div>
				<input id="admin-password" type="password" bind:value={password} autocomplete="current-password" placeholder="password" aria-label="password" class={field} />
				{#if loginError}<p class="text-red-600 dark:text-red-400 text-sm">{loginError}</p>{/if}
				<button type="submit" class="{primary} !py-2" disabled={loggingIn || !password}>{loggingIn ? 'logging in…' : 'log in'}</button>
			</form>
		</div>
	{:else}
		<div class="grid gap-8 lg:grid-cols-[14rem_1fr] items-start">
			<!-- sidebar -->
			<aside class="glass lg:sticky lg:top-24 rounded-3xl border border-ocean-300/60 dark:border-ocean-700/60 p-4 flex flex-col gap-5">
				<div class="flex items-center justify-between gap-2 px-2 pt-1">
					<div>
						<h1 class="text-2xl text-ocean-900 dark:text-ocean-100">admin</h1>
						<p class="text-xs text-ocean-500 flex items-center gap-1.5 mt-1"><span class="w-1.5 h-1.5 rounded-full bg-green-500" /> logged in</p>
					</div>
					<button on:click={logOut} class="{subtle} !text-xs">log out</button>
				</div>
				<!-- phones: one dropdown instead of the long list -->
				<select class="{field} lg:hidden" value={active} on:change={(e) => open(e.currentTarget.value)} aria-label="section">
					{#each groups as g}
						<optgroup label={g.title}>
							{#each g.items as s}<option value={s}>{sectionInfo[s].icon} {sectionInfo[s].label}</option>{/each}
						</optgroup>
					{/each}
				</select>
				<nav class="hidden lg:flex flex-col gap-5">
					{#each groups as g}
						<div class="flex flex-col gap-0.5">
							<span class="px-3 mb-1 text-[11px] uppercase tracking-widest text-ocean-500">{g.title}</span>
							{#each g.items as s}
								<button
									on:click={() => open(s)}
									class="flex items-center gap-3 px-3 py-1.5 rounded-xl text-sm text-left transition-colors
										{active === s ? 'accent-soft text-ocean-900 dark:text-ocean-100' : 'text-ocean-600 dark:text-ocean-400 hover:bg-ocean-200/50 dark:hover:bg-ocean-800/50 hover:text-ocean-900 dark:hover:text-ocean-100'}"
									aria-current={active === s ? 'page' : undefined}
								>
									<span class="w-4 text-center opacity-70">{sectionInfo[s].icon}</span>{sectionInfo[s].label}
								</button>
							{/each}
						</div>
					{/each}
				</nav>
			</aside>

			<!-- editor -->
			<div class="glass min-w-0 rounded-3xl border border-ocean-300/60 dark:border-ocean-700/60 p-5 sm:p-8 flex flex-col gap-6">
				<header class="flex flex-wrap items-start justify-between gap-3 pb-5 border-b border-ocean-300/50 dark:border-ocean-700/50">
					<div class="flex items-center gap-3">
						<span class="w-10 h-10 rounded-xl accent-soft grid place-items-center text-lg text-ocean-900 dark:text-ocean-100">{info.icon}</span>
						<div>
							<h2 class="text-xl text-ocean-900 dark:text-ocean-100">{info.label}</h2>
							<p class="text-xs text-ocean-500">{info.hint}</p>
						</div>
					</div>
					{#if info.view}<a href={info.view} target="_blank" class={subtle}>view on site ↗</a>{/if}
				</header>

				{#if active === 'blog'}
					<BlogAdmin onUnauthorized={sessionExpired} />
				{:else if active === 'tournaments'}
					<TournamentsAdmin onUnauthorized={sessionExpired} />
				{:else if active === 'guestbook'}
					<GuestbookAdmin onUnauthorized={sessionExpired} />
				{:else if active === 'ryo'}
					<CompanionAdmin onUnauthorized={sessionExpired} />
				{:else if active === 'media'}
					<MediaAdmin onUnauthorized={sessionExpired} />
				{/if}
				<!-- Kept mounted (just hidden) so unsaved page edits survive a trip to the blog tab. -->
				<div class:hidden={!isPage}>
					<PagesAdmin onUnauthorized={sessionExpired} active={pageSection} />
				</div>
			</div>
		</div>
	{/if}
</section>
