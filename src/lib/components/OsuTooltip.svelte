<script lang="ts">
	import { countryName, flagUrl } from '$lib/flags';
	export let osuUser: any;

</script>

<div class="rounded-lg overflow-hidden shadow-xl border border-ocean-300 dark:border-ocean-700">
	<!-- Cover with avatar overlaid -->
	<div
		class="relative h-20 bg-cover bg-center bg-ocean-200 dark:bg-ocean-800"
		style={osuUser.cover_url ? `background-image: url('${osuUser.cover_url}')` : ''}
	>
		<div class="absolute inset-0 bg-black/30"></div>
		<div class="absolute bottom-0 left-0 flex items-end gap-3 p-3">
			<img
				src={osuUser.avatar_url}
				alt="avatar"
				class="w-12 h-12 rounded-full border-2 border-white/80 shadow-lg flex-shrink-0"
			/>
			<div class="flex items-center gap-1.5 pb-0.5">
				<span class="text-white font-bold text-sm drop-shadow">{osuUser.username}</span>
				{#if osuUser.country_code}
					<img
						src={flagUrl(osuUser.country_code)}
						alt={countryName(osuUser.country_code)}
						title={countryName(osuUser.country_code)}
						class="w-5 h-auto flex-shrink-0 drop-shadow"
					/>
				{/if}
				{#if osuUser.team}
					<img
						src={osuUser.team.flag_url}
						alt={osuUser.team.short_name}
						class="h-4 w-auto flex-shrink-0 drop-shadow rounded-sm"
					/>
				{/if}
			</div>
		</div>
	</div>
	<!-- Stats -->
	<div class="bg-white dark:bg-ocean-900 px-3 py-2 flex flex-col gap-0.5">
		{#if osuUser.support_level && osuUser.support_level > 0}
			<div class="flex justify-between text-xs py-0.5">
				<span class="text-ocean-500 dark:text-ocean-400">supporter</span>
				<span class="text-pink-400">{'❤'.repeat(osuUser.support_level)}</span>
			</div>
		{/if}
		{#if osuUser.global_rank}
			<div class="flex justify-between text-xs py-0.5">
				<span class="text-ocean-500 dark:text-ocean-400">global</span>
				<span class="text-ocean-900 dark:text-ocean-100">#{osuUser.global_rank.toLocaleString()}</span>
			</div>
		{/if}
		{#if osuUser.country_rank}
			<div class="flex justify-between text-xs py-0.5">
				<span class="text-ocean-500 dark:text-ocean-400">country</span>
				<span class="text-ocean-900 dark:text-ocean-100">#{osuUser.country_rank.toLocaleString()}</span>
			</div>
		{/if}
		{#if osuUser.pp}
			<div class="flex justify-between text-xs py-0.5">
				<span class="text-ocean-500 dark:text-ocean-400">pp</span>
				<span class="text-ocean-900 dark:text-ocean-100">{Math.round(osuUser.pp).toLocaleString()}pp</span>
			</div>
		{/if}
		<div class="flex justify-between text-xs py-0.5">
			<span class="text-ocean-500 dark:text-ocean-400">status</span>
			<span class={osuUser.is_online ? 'text-green-500' : 'text-ocean-400 dark:text-ocean-500'}>
				{osuUser.is_online ? 'online' : 'offline'}
			</span>
		</div>
	</div>
</div>