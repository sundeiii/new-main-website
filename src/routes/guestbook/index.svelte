<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { STAMPS, stampById } from '$lib/stamps';

	let stamp = '';

	let entries: any[] = [];
	let loading = true;
	let error = '';

	// Form
	let nameInput = '';
	let website = ''; // honeypot: hidden from people, bots fill it in
	let messageInput = '';
	let submitting = false;
	let submitError = '';
	let submitSuccess = false;

	async function loadEntries() {
		try {
			const response = await fetch('/api/guestbook');
			if (response.ok) {
				entries = await response.json();
			} else {
				error = 'Failed to load guestbook';
			}
		} catch (e) {
			error = 'Failed to load guestbook';
			console.error(e);
		} finally {
			loading = false;
		}
	}

	async function submitEntry() {
		if (!nameInput.trim() || !messageInput.trim()) return;
		
		submitting = true;
		submitError = '';
		submitSuccess = false;

		try {
			const response = await fetch('/api/guestbook', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					website,
					stamp: stamp || null,
					name: nameInput.trim(),
					message: messageInput.trim()
				})
			});

			if (response.ok) {
				const newEntry = await response.json();
				entries = [newEntry, ...entries];
				messageInput = '';
				stamp = '';
				submitSuccess = true;
				setTimeout(() => submitSuccess = false, 3000);
			} else {
				const data = await response.json();
				submitError = data.error || 'Failed to post';
			}
		} catch (e) {
			submitError = 'Failed to post entry';
			console.error(e);
		} finally {
			submitting = false;
		}
	}

	onMount(async () => {
		// Restore name from localStorage
		const savedName = localStorage.getItem('guestbook-name');
		if (savedName) nameInput = savedName;
		await loadEntries();
	});

	// Save name to localStorage when it changes
	$: if (typeof window !== 'undefined' && nameInput) {
		localStorage.setItem('guestbook-name', nameInput);
	}

	function formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    function timeAgo(dateStr: string): string {
        const diff = Date.now() - new Date(dateStr).getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return formatDate(dateStr);
    }
</script>

<svelte:head>
	<title>guestbook</title>
</svelte:head>

<section 
	class="p-8 sm:p-12 lg:p-24 lg:py-16 font-cascadia"
	in:fade={{ duration: 200 }}
>
	<div class="max-w-2xl">
		<h1 
			class="text-ocean-900 dark:text-ocean-100 text-2xl mb-2"
			in:fly={{ y: -20, duration: 300 }}
		>
			guestbook
		</h1>
		<p 
			class="text-ocean-700 dark:text-ocean-400 mb-8"
			in:fly={{ y: -20, duration: 300, delay: 50 }}
		>
			leave a message!
		</p>

		<!-- Post form -->
		<form 
			on:submit|preventDefault={submitEntry}
			class="mb-10 border border-ocean-300 dark:border-ocean-700 rounded p-4 space-y-3"
			in:fly={{ y: -10, duration: 300, delay: 100 }}
		>
			<div class="flex flex-col sm:flex-row gap-3">
				<input
					bind:value={nameInput}
					type="text"
					placeholder="your name"
					maxlength="50"
					class="flex-1 sm:max-w-[200px] bg-transparent border border-ocean-300 dark:border-ocean-700 rounded px-3 py-2 text-sm text-ocean-900 dark:text-ocean-100 placeholder-ocean-500 dark:placeholder-ocean-600 focus:outline-none focus:border-ocean-500 dark:focus:border-ocean-400"
				/>
				<input
					bind:value={messageInput}
					type="text"
					placeholder="write a message..."
					maxlength="500"
					class="flex-1 bg-transparent border border-ocean-300 dark:border-ocean-700 rounded px-3 py-2 text-sm text-ocean-900 dark:text-ocean-100 placeholder-ocean-500 dark:placeholder-ocean-600 focus:outline-none focus:border-ocean-500 dark:focus:border-ocean-400"
				/>
			</div>
			<!-- Stamp picker -->
			<div class="flex flex-wrap items-center gap-1" role="radiogroup" aria-label="pick a stamp">
				<span class="text-ocean-500 dark:text-ocean-600 text-xs mr-1">stamp:</span>
				{#each STAMPS as s}
					<button
						type="button"
						role="radio"
						aria-checked={stamp === s.id}
						title={s.label}
						on:click={() => (stamp = stamp === s.id ? '' : s.id)}
						class="w-8 h-8 rounded border text-base transition-all {stamp === s.id
							? 'border-ocean-600 dark:border-ocean-300 bg-ocean-200 dark:bg-ocean-800 scale-110 -rotate-6'
							: 'border-transparent hover:border-ocean-300 dark:hover:border-ocean-700 opacity-60 hover:opacity-100'}"
					>
						{s.emoji}
					</button>
				{/each}
			</div>
			<!-- Honeypot: hidden from people and screen readers; bots that fill every field get rejected -->
			<div class="absolute -left-[9999px] w-px h-px overflow-hidden" aria-hidden="true">
				<label>website <input bind:value={website} type="text" name="website" tabindex="-1" autocomplete="off" /></label>
			</div>
			<div class="flex items-center gap-3">
				<button
					type="submit"
					disabled={submitting || !nameInput.trim() || !messageInput.trim()}
					class="px-4 py-1.5 text-sm border border-ocean-300 dark:border-ocean-700 rounded hover:bg-ocean-200 dark:hover:bg-ocean-800 text-ocean-900 dark:text-ocean-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
				>
					{submitting ? 'posting...' : 'sign'}
				</button>
				{#if submitSuccess}
					<span class="text-green-600 dark:text-green-400 text-xs" in:fade={{ duration: 200 }}>
						posted!
					</span>
				{/if}
				{#if submitError}
					<span class="text-red-500 text-xs" in:fade={{ duration: 200 }}>
						{submitError}
					</span>
				{/if}
				<span class="text-ocean-500 dark:text-ocean-600 text-xs ml-auto">
					{messageInput.length}/500
				</span>
			</div>
		</form>

		<!-- Entries -->
		{#if loading}
			<div class="flex items-center gap-2 text-ocean-700 dark:text-ocean-400">
				<svg class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
				</svg>
				loading...
			</div>
		{:else if error}
			<p class="text-red-500">{error}</p>
		{:else if entries.length === 0}
			<div 
				class="text-ocean-700 dark:text-ocean-400 border border-ocean-300 dark:border-ocean-700 rounded p-6 text-center"
				in:fade={{ duration: 200, delay: 150 }}
			>
				<p class="mb-2">no entries yet</p>
				<p class="text-sm">be the first to sign!</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each entries as entry, i}
					<div
						class="relative border border-ocean-300 dark:border-ocean-700 rounded px-4 py-3 {stampById(entry.stamp) ? 'pr-16' : ''} hover:border-ocean-400 dark:hover:border-ocean-600 transition-colors"
						in:fly={{ y: 15, duration: 200, delay: 150 + i * 30 }}
					>
						{#if stampById(entry.stamp)}
							<span
								class="absolute top-2 right-3 w-9 h-9 flex items-center justify-center text-lg rounded border-2 border-dashed border-ocean-400/60 dark:border-ocean-600/60"
								style="transform: rotate({((entry.id?.charCodeAt(0) ?? 0) % 21) - 10}deg)"
								title={stampById(entry.stamp)?.label}
								aria-label="stamp: {stampById(entry.stamp)?.label}"
							>
								{stampById(entry.stamp)?.emoji}
							</span>
						{/if}
						<div class="flex items-baseline gap-2 mb-1">
							<span class="text-ocean-900 dark:text-ocean-100 text-sm font-medium">
								{entry.name}
							</span>
							<span class="text-ocean-500 dark:text-ocean-600 text-xs">
								{timeAgo(entry.created_at)}
							</span>
						</div>
						<p class="text-ocean-800 dark:text-ocean-300 text-sm whitespace-pre-wrap break-words">
							{entry.message}
						</p>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</section>