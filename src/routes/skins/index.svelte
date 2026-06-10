<svelte:head>
	<title>skins</title>
	<meta name="description" content="osu! skins that i use" />
</svelte:head>

<script lang="ts">
	type Skin = {
		name: string;
		author: string;
		image: string;
		download: string;
	};

	const skins: Skin[] = [
		{
			name: 'BlooXoo (sundei edit)',
			author: '-Sc4rYSaiyajin-',
			image: '/skins/BlooXoo/preview.jpg',
			download: '/skins/- 『BlooXoo』 - (sundei edit).osk',
		},
		// add more here
	];
</script>

<section class="p-8 sm:p-12 lg:p-24 lg:py-16 font-cascadia">
	<div class="flex flex-col gap-16">

		<!-- Hero -->
		<div class="flex flex-col gap-4">
			<h1 class="text-ocean-900 dark:text-ocean-100">skins</h1>
			<p class="text-ocean-600 dark:text-ocean-400 max-w-xl">
				osu! skins i use or have used on stream.
			</p>
		</div>

		<!-- Gallery -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each skins as skin}
				<div class="flex flex-col border border-ocean-200 dark:border-ocean-800 rounded-lg overflow-hidden bg-ocean-50 dark:bg-ocean-900">
					<!-- Preview -->
					<div class="aspect-video bg-ocean-100 dark:bg-ocean-950 overflow-hidden">
						<img
							src={skin.image}
							alt={skin.name}
							class="w-full h-full object-cover"
						/>
					</div>

					<!-- Info -->
					<div class="flex flex-col gap-3 p-4">
						<div class="flex flex-col gap-0.5">
							<span class="font-medium text-ocean-900 dark:text-ocean-100">{skin.name}</span>
							<span class="text-sm text-ocean-500 dark:text-ocean-500">by {skin.author}</span>
						</div>
						
							href={skin.download}
							target="_blank"
							rel="noopener"
							class="inline-flex items-center justify-center gap-2 px-4 py-2 bg-ocean-600 hover:bg-ocean-700 dark:bg-ocean-700 dark:hover:bg-ocean-600 text-white rounded transition-colors text-sm font-medium"
						>
							<span>⬇</span> download
						</a>
					</div>
				</div>
			{/each}
		</div>

	</div>
</section>