<script lang="ts">
	import { fade, fly } from 'svelte/transition';



	const pcSpecs = [
		{
			label: 'processor',
			value: 'i5-13400F',
			sub: '10c / 16t • up to 4.6 GHz',
			image: '/images/pcbuild/13400f.webp'
		},
		{
			label: 'graphics card',
			value: 'GeForce RTX 3060 12GB',
			sub: 'asus • 12GB gddr6',
			image: '/images/pcbuild/rtx3060.webp'
		},
		{
			label: 'memory',
			value: '4x16GB DDR4',
			sub: 'xmp certified • 3200 MT/s',
			image: '/images/pcbuild/memory.webp'
		},
		{
			label: 'main nvme',
			value: 'Samsung 990 PRO 1TB',
			sub: 'gen4 • ~7,000 MB/s',
			image: '/images/pcbuild/samsung.webp'
		},
		{
			label: 'additional storage',
			value: 'Seagate Barracuda',
			sub: '2tb • 7200 rpm hdd',
			image: '/images/pcbuild/barracuda.webp'
		},
		{
			label: 'backup storage',
			value: 'Western Digital Blue',
			sub: '2x500GB • sata',
			image: '/images/pcbuild/wd.webp'
		},
		{
			label: 'motherboard',
			value: 'ASRock B760M Pro RS/D4 WiFi',
			sub: 'lga1700 • matx • wi‑fi',
			image: '/images/pcbuild/b760m.webp'
		},
		{
			label: 'cooling',
			value: 'NZXT Kraken 240',
			sub: '240mm aio • customizable screen',
			image: '/images/pcbuild/kraken.webp'
		},
		{
			label: 'chassis',
			value: 'NZXT H5 Elite',
			sub: 'matx • tempered glass',
			image: '/images/pcbuild/h5-elite.webp'
		}
	];

	const peripheralSpecs = [
		{
			label: 'monitor',
			value: 'Lenovo Legion 24-10',
			sub: '1080p • 240 Hz',
			image: '/images/peripherals/main-lenovo.webp'
		},
		{
			label: 'keyboard',
			value: 'Wooting 60HE',
			sub: 'hall effect • analog • rapid trigger',
			image: '/images/peripherals/wooting.webp'
		},
		{
			label: 'mouse',
			value: 'Logitech PRO 2 LIGHTSPEED',
			sub: '25k sensor • wireless',
			image: '/images/peripherals/mouse.webp'
		},
		{
			label: 'tablet',
			value: 'Wacom CTL-472',
			sub: 'the osu tablet • stan full area',
			image: '/images/peripherals/ctl472.webp'
		},
		{
			label: 'headphones',
			value: 'Sony WH-1000XM4',
			sub: 'active noise cancellation • wireless',
			image: '/images/peripherals/xm4.webp'
		}
	];

	const interests = [
		'osu!',
		'web development',
		'music',
		'graphic design',
		'editing'
	];

	const languages = [
		{ name: 'TypeScript', color: '#3178c6' },
		{ name: 'Svelte', color: '#ff3e00' },
		{ name: 'Python', color: '#3776ab' },
		{ name: 'HTML/CSS', color: '#e34c26' },
		{ name: 'PowerShell', color: '#012456' },
		{ name: 'Bash', color: '#4eaa25' }
	];
</script>

<svelte:head>
	<title>about</title>
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
			about
		</h1>
		<p 
			class="text-ocean-700 dark:text-ocean-400 mb-10"
			in:fly={{ y: -20, duration: 300, delay: 50 }}
		>
			a bit more about me
		</p>

		<!-- Bio -->
		<div 
			class="mb-10"
			in:fly={{ y: 20, duration: 300, delay: 100 }}
		>
			<h2 class="text-ocean-900 dark:text-ocean-100 text-lg mb-3">who?</h2>
			<div class="text-ocean-800 dark:text-ocean-300 text-sm space-y-3">
				<p>
					hey, i'm sundei. i'm a student and developer from Estonia. i enjoy building things 
					for the web, playing osu!, and listening to way too much music.
				</p>
				<p>
					i mostly work with TypeScript and Svelte these days. this portfolio is built with 
					SvelteKit, Tailwind CSS, and a bunch of APIs stitched together.
				</p>
				<p>
					when i'm not coding, i'm probably watching streams, staffing osu! tournaments, 
					or contributing to random wikis.
				</p>
			</div>
		</div>

		<!-- PC build -->
		<div
			class="mb-10"
			in:fly={{ y: 20, duration: 300, delay: 200 }}
		>
			<h2 class="text-ocean-900 dark:text-ocean-100 text-lg mb-3">pc build</h2>
			<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
				{#each pcSpecs as item, i}
					<div
						class="rounded-2xl border border-ocean-300/70 dark:border-ocean-700/70 bg-ocean-100/40 dark:bg-ocean-900/40 p-4 flex flex-col gap-3 shadow-sm"
						in:fly={{ y: 15, duration: 220, delay: 250 + i * 60 }}
					>
						{#if item.image}
							<div
								class="group w-full aspect-[4/3] rounded-xl overflow-hidden bg-ocean-200/40 dark:bg-ocean-800/40 flex items-center justify-center"
							>
								<img
									src={item.image}
									alt={item.label}
									class="w-full h-full object-contain transition-transform duration-200 ease-out group-hover:scale-105"
									loading="lazy"
								/>
							</div>
						{/if}
						<div>
							<p class="text-[0.7rem] uppercase tracking-wide text-ocean-600 dark:text-ocean-500">
								{item.label}
							</p>
							<p class="text-ocean-900 dark:text-ocean-100 text-sm leading-snug">
								{item.value}
							</p>
							{#if item.sub}
								<p class="text-[0.7rem] text-ocean-600 dark:text-ocean-500 mt-1">
									{item.sub}
								</p>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Peripherals -->
		<div
			class="mb-10"
			in:fly={{ y: 20, duration: 300, delay: 260 }}
		>
			<h2 class="text-ocean-900 dark:text-ocean-100 text-lg mb-3">peripherals</h2>
			<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
				{#each peripheralSpecs as item, i}
					<div
						class="rounded-2xl border border-ocean-300/70 dark:border-ocean-700/70 bg-ocean-100/40 dark:bg-ocean-900/40 p-4 flex flex-col gap-3 shadow-sm"
						in:fly={{ y: 15, duration: 220, delay: 280 + i * 60 }}
					>
						{#if item.image}
							<div
								class="group w-full aspect-[4/3] rounded-xl overflow-hidden bg-ocean-200/40 dark:bg-ocean-800/40 flex items-center justify-center"
							>
								<img
									src={item.image}
									alt={item.label}
									class="w-full h-full object-contain transition-transform duration-200 ease-out group-hover:scale-105"
									loading="lazy"
								/>
							</div>
						{/if}
						<div>
							<p class="text-[0.7rem] uppercase tracking-wide text-ocean-600 dark:text-ocean-500">
								{item.label}
							</p>
							<p class="text-ocean-900 dark:text-ocean-100 text-sm leading-snug">
								{item.value}
							</p>
							{#if item.sub}
								<p class="text-[0.7rem] text-ocean-600 dark:text-ocean-500 mt-1">
									{item.sub}
								</p>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>


		<!-- Languages -->
		<div 
			class="mb-10"
			in:fly={{ y: 20, duration: 300, delay: 300 }}
		>
			<h2 class="text-ocean-900 dark:text-ocean-100 text-lg mb-3">languages & tools</h2>
			<div class="flex flex-wrap gap-2">
				{#each languages as lang, i}
					<span 
						class="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-ocean-300 dark:border-ocean-700 rounded"
						in:fly={{ y: 10, duration: 200, delay: 350 + i * 40 }}
					>
						<span 
							class="w-2.5 h-2.5 rounded-full flex-shrink-0" 
							style="background-color: {lang.color}"
						></span>
						<span class="text-ocean-900 dark:text-ocean-100">{lang.name}</span>
					</span>
				{/each}
			</div>
		</div>

		<!-- Interests -->
		<div 
			class="mb-10"
			in:fly={{ y: 20, duration: 300, delay: 400 }}
		>
			<h2 class="text-ocean-900 dark:text-ocean-100 text-lg mb-3">interests</h2>
			<ul class="list-disc list-inside text-ocean-800 dark:text-ocean-300 text-sm space-y-1">
				{#each interests as interest, i}
					<li in:fly={{ x: -10, duration: 200, delay: 450 + i * 40 }}>
						{interest}
					</li>
				{/each}
			</ul>
		</div>

		<!-- Contact -->
		<div in:fly={{ y: 20, duration: 300, delay: 500 }}>
			<h2 class="text-ocean-900 dark:text-ocean-100 text-lg mb-3">reach me</h2>
			<div class="flex flex-wrap gap-3 text-sm">
				<a 
					href="https://twitter.com/deprivedsundei" 
					target="_blank" rel="noopener noreferrer"
					class="text-ocean-700 dark:text-ocean-400 hover:text-ocean-900 dark:hover:text-ocean-100 underline transition-colors"
				>
					twitter
				</a>
				<a 
					href="https://github.com/rayuii" 
					target="_blank" rel="noopener noreferrer"
					class="text-ocean-700 dark:text-ocean-400 hover:text-ocean-900 dark:hover:text-ocean-100 underline transition-colors"
				>
					github
				</a>
				<a 
					href="mailto:sundei@sundei.ee"
					class="text-ocean-700 dark:text-ocean-400 hover:text-ocean-900 dark:hover:text-ocean-100 underline transition-colors"
				>
					email
				</a>
				<!-- <a 
					href="https://osu.ppy.sh/users/28827755" 
					target="_blank" rel="noopener noreferrer"
					class="text-ocean-700 dark:text-ocean-400 hover:text-ocean-900 dark:hover:text-ocean-100 underline transition-colors"
				>
					osu!
				</a> -->
			</div>
		</div>
	</div>
</section>
