<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	
	
	
	// You can add images here or fetch from an API/CMS
	const images = [
		{
			id: 1,
			src: 'https://cdn.sundei.eu/temp_gallery/IMG_2469.jpg',
			alt: 'image1',
			title: 'rain and spring',
			date: '2026-02-09'
		},
		{
			id: 2,
			src: 'https://cdn.sundei.eu/temp_gallery/IMG_2481.jpg',
			alt: 'image2',
			title: 'the sunset after the rain',
			date: '2026-02-08'
		}
		// Add more images here
	];

	let selectedImage: typeof images[0] | null = null;
	
</script>

<svelte:head>
	<title>gallery</title>
	<meta property="og:title" content="gallery" />
	<meta name="description" content="photos and visual works" />
	<meta property="og:description" content="photos and visual works" />
	<meta name="theme-color" media="(prefers-color-scheme: light)" content="#f9f0f5" />
	<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#281c21" />
</svelte:head>

<section class="p-8 sm:p-12 lg:p-24 lg:py-16 font-cascadia">
	<div class="flex flex-col gap-7">
		<div in:fly={{ y: -20, duration: 400 }}>
			<h1 class="text-ocean-900 dark:text-ocean-100">gallery</h1>
			<p class="text-ocean-700 dark:text-ocean-400">photos and visual works</p>
		</div>

		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" in:fade={{ duration: 400, delay: 100 }}>
		{#each images as image}
			<button
				class="group relative aspect-square overflow-hidden rounded border border-ocean-300 dark:border-ocean-700 hover:border-ocean-500 dark:hover:border-ocean-500 transition-colors"
				on:click={() => selectedImage = image}
			>
				<img 
					src={image.src} 
					alt={image.alt}
					loading="lazy"
					decoding="async"
					class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
				/>
				<div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
					<div class="absolute bottom-0 left-0 right-0 p-4">
						<p class="text-white font-medium">{image.title}</p>
						<p class="text-white/80 text-sm">
							{new Date(image.date).toLocaleDateString('en-US', { 
								month: 'short', 
								day: 'numeric', 
								year: 'numeric' 
							})}
						</p>
					</div>
				</div>
			</button>
		{:else}
			<div class="col-span-full text-ocean-700 dark:text-ocean-400">
				No images yet. Coming soon!
			</div>
		{/each}
	</div>
	</div>
</section>

<!-- Lightbox Modal -->
{#if selectedImage}
	<div 
		class="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
		on:click={() => selectedImage = null}
	>
		<button 
			class="absolute top-4 right-4 text-white text-4xl hover:text-ocean-300"
			on:click={() => selectedImage = null}
		>
			×
		</button>
		<div class="max-w-4xl max-h-[90vh]" on:click|stopPropagation>
			<img 
				src={selectedImage.src} 
				alt={selectedImage.alt}
				class="max-w-full max-h-[90vh] object-contain"
			/>
			<div class="mt-4 text-center">
				<p class="text-white text-xl font-medium">{selectedImage.title}</p>
				<p class="text-white/80">
					{new Date(selectedImage.date).toLocaleDateString('en-US', { 
						month: 'long', 
						day: 'numeric', 
						year: 'numeric' 
					})}
				</p>
			</div>
		</div>
	</div>
{/if}
