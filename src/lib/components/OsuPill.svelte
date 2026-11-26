<script lang="ts">
	// A small "osu!" link next to a song that has a beatmap (see $lib/osuMaps). Nothing otherwise.
	import { fade } from 'svelte/transition';
	import { osuKey, osuMaps } from '$lib/osuMaps';

	export let artist: string;
	export let title: string;

	$: map = $osuMaps[osuKey(artist, title)];
</script>

{#if map}
	<a
		href={map.url}
		target="_blank"
		rel="noopener noreferrer"
		title="{map.artist} - {map.title}, mapped by {map.mapper} ({map.status}, {map.plays.toLocaleString('en-US')} plays)"
		class="relative shrink-0 text-[10px] leading-none px-1.5 py-1 rounded-full bg-pink-500/20 text-pink-600 dark:text-pink-300 hover:bg-pink-500/35 transition-colors"
		in:fade={{ duration: 200 }}>osu!</a
	>
{/if}
