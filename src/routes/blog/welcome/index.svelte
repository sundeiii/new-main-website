<script lang="ts">
	import { fade } from 'svelte/transition';
	
	
	
	const post = {
		title: 'welcome to my corner of the internet',
		date: '2026-02-10',
		excerpt: 'An introduction to who I am, what I do, and why this blog exists.',
		banner: 'https://cdn.doitforjanice.eu/blog/banner-43f288.webp'
	};

	let showModal = false;

	function openModal() {
		showModal = true;
	}

	function closeModal() {
		showModal = false;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && showModal) {
			closeModal();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<svelte:head>
	<title>{post.title} - blog</title>
	<meta property="og:title" content="{post.title}" />
	<meta name="description" content="{post.excerpt}" />
	<meta property="og:description" content="{post.excerpt}" />
	<meta name="theme-color" media="(prefers-color-scheme: light)" content="#f9f0f5" />
	<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#281c21" />
</svelte:head>

<!-- Top Banner -->
{#if post.banner}
	<div class="w-full h-64 sm:h-80 lg:h-96 overflow-hidden" in:fade={{ duration: 300 }}>
		<img 
			src={post.banner}
			alt="Post banner"
			class="w-full h-full object-cover"
		/>
	</div>
{/if}

<section class="p-8 sm:p-12 lg:p-24 lg:py-16 font-cascadia flex justify-center" in:fade={{ duration: 400, delay: 100 }}>
	<article class="max-w-2xl w-full">
	<header class="mb-8 text-center">
		<h1 class="text-ocean-900 dark:text-ocean-100 text-4xl font-bold mb-2">
			{post.title}
		</h1>
		<time class="text-ocean-700 dark:text-ocean-400">
			{new Date(post.date).toLocaleDateString('en-US', { 
				month: 'long', 
				day: 'numeric', 
				year: 'numeric' 
			})}
		</time>
	</header>

	<div class="prose prose-invert text-ocean-900 dark:text-ocean-100 max-w-none">
		<p class="text-ocean-800 dark:text-ocean-300 mb-4">
			hey, i'm sundei. welcome to my little space on the web where i dump thoughts, projects, and whatever else feels worth remembering.
		</p>

		<h2 class="text-ocean-900 dark:text-ocean-100 text-2xl font-bold mt-8 mb-4">who am i?</h2>
		<p class="text-ocean-800 dark:text-ocean-300 mb-4">
			i'm a student trying to figure things out one day at a time. when i'm not buried in coursework, you'll find me doing the usual stuff: messing around with servers, building websites that may or may not ever see the light of day, grinding osu! (trying to get good, keyword <em>trying</em>), playing cs, and vibing to whatever's on my playlist.
		</p>

		<p class="text-ocean-800 dark:text-ocean-300 mb-6">
			oh, and i survive on a questionable mix of antidepressants, nicotine, and way too much caffeine. we're all works in progress here.
		</p>

	<div class="my-8 rounded overflow-hidden border border-ocean-300 dark:border-ocean-700">
		<button 
			on:click={openModal}
			class="w-full cursor-pointer hover:opacity-90 transition-opacity"
		>
			<img 
				src="https://cdn.doitforjanice.eu/blog/desk-7117b4.webp"
				alt="my setup"
				class="w-full"
			/>
		</button>
		<p class="text-ocean-700 dark:text-ocean-400 text-sm text-center py-2 bg-ocean-100 dark:bg-ocean-900">
			where the magic happens
		</p>
	</div>

	{#if showModal}
		<div 
			class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 animate-fadeIn"
			on:click={closeModal}
			role="button"
			tabindex="0"
		>
			<div class="relative max-w-[90vw] max-h-[90vh]" on:click|stopPropagation role="button" tabindex="-1">
				<button 
					on:click={closeModal}
					class="absolute -top-12 right-0 text-white text-3xl font-bold bg-black bg-opacity-50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-70 cursor-pointer z-10 transition-all duration-200"
				>
					×
				</button>
				<img 
					src="https://cdn.doitforjanice.eu/blog/desk-7117b4.webp"
					alt="my setup"
					class="max-h-[90vh] max-w-[90vw] rounded object-contain"
				/>
			</div>
		</div>
	{/if}

	<p class="text-ocean-800 dark:text-ocean-300 mb-6">
		when it comes to osu!, i'm constantly inspired by players like xootynator, zylice, mrekk, ryuk, freddie benson, cloppit, accolibed, cedru, and abyssal. watching them play keeps me motivated to improve.
	</p>

	<h2 class="text-ocean-900 dark:text-ocean-100 text-2xl font-bold mt-8 mb-4">what's this blog for?</h2>
		<p class="text-ocean-800 dark:text-ocean-300 mb-4">
			honestly? it's a time capsule. somewhere to save memories, projects, thoughts, and moments before they disappear into the void. some posts might be technical stuff i've learned, some might be random reflections, some might just be me rambling about a song that hit different or a game that tilted me.
		</p>

		<p class="text-ocean-800 dark:text-ocean-300 mb-6">
			this isn't polished content or a portfolio (well, maybe a little). it's just real stuff, documented as it happens.
		</p>

		<h2 class="text-ocean-900 dark:text-ocean-100 text-2xl font-bold mt-8 mb-4">where i'm headed</h2>
		<p class="text-ocean-800 dark:text-ocean-300 mb-4">
			right now i've got a few goals keeping me going:
		</p>

		<ul class="list-disc list-inside text-ocean-800 dark:text-ocean-300 space-y-2 mb-6">
			<li>actually getting good at osu! (the dream)</li>
			<li>graduating college without losing my mind</li>
			<li>making it to the netherlands to continue studying</li>
		</ul>

		<p class="text-ocean-800 dark:text-ocean-300 mb-6">
			who knows if i'll get there, but at least this blog will have the receipts either way.
		</p>

		<h2 class="text-ocean-900 dark:text-ocean-100 text-2xl font-bold mt-8 mb-4">stick around</h2>
		<p class="text-ocean-800 dark:text-ocean-300">
			if any of this resonates with you, feel free to poke around. i'll be posting whenever inspiration strikes. no schedules, no grand plans—just vibes and whatever's on my mind.
		</p>

		<p class="text-ocean-800 dark:text-ocean-300 mt-4">
			thanks for stopping by. let's see where this goes.
		</p>
	</div>

	<div class="mt-12 pt-8 border-t border-ocean-300 dark:border-ocean-700 text-center">
		<a href="/blog" class="text-ocean-700 dark:text-ocean-400 hover:text-ocean-900 dark:hover:text-ocean-100">
			← back to blog
		</a>
	</div>
</article>
</section>

<style>
	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.animate-fadeIn {
		animation: fadeIn 0.2s ease-out;
	}
</style>