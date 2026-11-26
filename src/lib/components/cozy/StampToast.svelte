<script lang="ts">
	// "new stamp!" in the bottom-left corner when a passport stamp is found.
	import { fly } from 'svelte/transition';
	import { justFound } from './collect';
	import PassportStamp from './PassportStamp.svelte';
	import { prefersReducedMotion } from './cozy';
</script>

{#if $justFound}
	{#key $justFound.id}
		<a
			href="/passport"
			class="fixed left-5 bottom-5 z-40 flex items-center gap-3 glass rounded-2xl border border-ocean-300/50 dark:border-ocean-700/50 pl-2.5 pr-4 py-2.5 shadow-xl font-cascadia max-w-[18rem]"
			transition:fly={{ y: prefersReducedMotion() ? 0 : 30, duration: 400 }}
			on:click={() => justFound.set(null)}
		>
			<span class="-rotate-6 shrink-0"><PassportStamp stamp={$justFound} found={new Date().toISOString()} small /></span>
			<span class="min-w-0">
				<span class="block text-[10px] uppercase tracking-widest text-ocean-500">new stamp ✦</span>
				<span class="block text-sm text-ocean-900 dark:text-ocean-100 truncate">{$justFound.name}</span>
				<span class="block text-xs text-ocean-600 dark:text-ocean-400 leading-snug">{$justFound.note}</span>
			</span>
		</a>
	{/key}
{/if}
