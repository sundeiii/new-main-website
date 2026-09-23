<script lang="ts">
	export let href: string;
	export let name: string;
	export let description: string | undefined = undefined;
	/** Links within the site open in the same tab. */
	export let internal = false;
</script>

<li>
	<a
		{href}
		target={internal ? undefined : '_blank'}
		rel={internal ? undefined : 'noreferrer noopener'}
		class="text-ocean-800 dark:text-ocean-300 underline hover:text-ocean-900 dark:hover:text-ocean-100">{name}</a
	>
	{#if description}
		<span class="text-ocean-600 dark:text-ocean-400">– {description}</span>
	{/if}
</li>
