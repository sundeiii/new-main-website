<script lang="ts">
	import { onMount } from 'svelte';
	import BlogAdmin from '$lib/components/admin/BlogAdmin.svelte';
	import GuestbookAdmin from '$lib/components/admin/GuestbookAdmin.svelte';
	import MediaAdmin from '$lib/components/admin/MediaAdmin.svelte';
	import PagesAdmin from '$lib/components/admin/PagesAdmin.svelte';
	import TournamentsAdmin from '$lib/components/admin/TournamentsAdmin.svelte';
	import { field, primary, subtle } from '$lib/components/admin/styles';

	const tabs = ['blog', 'pages', 'tournaments', 'guestbook', 'media'] as const;
	let activeTab: typeof tabs[number] = 'blog';

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

	onMount(checkSession);
</script>

<svelte:head>
	<title>admin panel</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<section class="p-8 sm:p-12 lg:p-24 lg:py-16 font-cascadia">
	<div class="flex flex-col gap-7 max-w-6xl">
		<div class="flex items-start justify-between gap-4">
			<div>
				<h1 class="text-ocean-900 dark:text-ocean-100">admin panel</h1>
				<p class="text-ocean-700 dark:text-ocean-400">manage the blog, pages, tournaments, guestbook and images</p>
			</div>
			{#if loggedIn}<button on:click={logOut} class={subtle}>log out</button>{/if}
		</div>

		{#if checking}
			<p class="text-ocean-600 dark:text-ocean-400 text-sm">checking session…</p>
		{:else if !enabled}
			<div class="border border-ocean-300 dark:border-ocean-700 rounded-lg p-6 text-sm text-ocean-700 dark:text-ocean-300">
				admin is disabled. set <code class="text-ocean-900 dark:text-ocean-100">ADMIN_PASSWORD</code> in <code>.env</code>
				(and in vercel's environment variables), then restart the server.
			</div>
		{:else if !loggedIn}
			<form on:submit|preventDefault={logIn} class="border border-ocean-300 dark:border-ocean-700 rounded-lg p-6 flex flex-col gap-3 max-w-sm">
				<label for="admin-password" class="text-sm text-ocean-700 dark:text-ocean-400">password</label>
				<input id="admin-password" type="password" bind:value={password} autocomplete="current-password" class={field} />
				{#if loginError}<p class="text-red-600 dark:text-red-400 text-sm">{loginError}</p>{/if}
				<button type="submit" class={primary} disabled={loggingIn || !password}>{loggingIn ? 'logging in…' : 'log in'}</button>
			</form>
		{:else}
			<div class="flex gap-2 border-b border-ocean-300 dark:border-ocean-700">
				{#each tabs as tab}
					<button
						on:click={() => (activeTab = tab)}
						class="px-4 py-2 transition-colors {activeTab === tab
							? 'text-ocean-900 dark:text-ocean-100 border-b-2 border-ocean-600'
							: 'text-ocean-600 dark:text-ocean-500 hover:text-ocean-800 dark:hover:text-ocean-300'}"
					>
						{tab}
					</button>
				{/each}
			</div>

			{#if activeTab === 'blog'}
				<BlogAdmin onUnauthorized={sessionExpired} />
			{:else if activeTab === 'pages'}
				<PagesAdmin onUnauthorized={sessionExpired} />
			{:else if activeTab === 'tournaments'}
				<TournamentsAdmin onUnauthorized={sessionExpired} />
			{:else if activeTab === 'guestbook'}
				<GuestbookAdmin onUnauthorized={sessionExpired} />
			{:else}
				<MediaAdmin onUnauthorized={sessionExpired} />
			{/if}
		{/if}
	</div>
</section>
