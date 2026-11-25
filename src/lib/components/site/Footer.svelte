<script lang="ts">
	export let links: { href: string; label: string }[];
	export let updatedAgo: string;
	export let updatedFull: string;
	export let visits: number | null = null;

	const socials = [
		{ href: 'https://github.com/sundeiii', label: 'github' },
		{ href: 'https://twitter.com/deprivedsundei', label: 'twitter' },
		{ href: 'mailto:sundei@sundei.ee', label: 'email' }
	];
	const linkClass = 'text-ocean-600 dark:text-ocean-400 hover:text-ocean-900 dark:hover:text-ocean-100 transition-colors';
</script>

<footer class="font-cascadia px-8 sm:px-12 lg:px-24 pb-10 pt-16">
	<div class="flex flex-col gap-6 text-xs">
		<div class="h-px bg-gradient-to-r from-transparent via-ocean-300 dark:via-ocean-700 to-transparent" />
		<div class="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
			<div class="flex flex-col gap-1">
				<span class="text-sm text-ocean-900 dark:text-ocean-100">sundei</span>
				<span class="text-ocean-500">"national geographic goddamn it" - ryan kwan</span>
			</div>
			<div class="flex flex-wrap gap-x-4 gap-y-1.5 sm:max-w-md sm:justify-end">
				{#each links as link}<a href={link.href} class={linkClass}>{link.label}</a>{/each}
			</div>
		</div>
		<div class="flex flex-wrap items-center justify-between gap-3 text-ocean-500">
			<div class="flex gap-4">
				{#each socials as s}
					<a href={s.href} target={s.href.startsWith('mailto:') ? undefined : '_blank'} rel="noopener noreferrer" class={linkClass}>{s.label}</a>
				{/each}
			</div>
			<span>
				© {new Date().getFullYear()} sundei ·
				<a href="https://github.com/sundeiii/new-main-website" target="_blank" rel="noopener noreferrer" class="underline {linkClass}">source</a>
				· <span title={updatedFull}>updated {updatedAgo}</span>
				{#if visits !== null}· <a href="/stats" class={linkClass} title="page views since the counter went up">{visits.toLocaleString()} visits</a>{/if}
			</span>
		</div>
	</div>
</footer>
