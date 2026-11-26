<script lang="ts">
	// One postage stamp: perforated edge, a coloured field with the glyph, the name, and a postmark
	// with the date it was found. Undiscovered ones are greyed out with "???".
	import type { Collectible } from '$lib/collectibles';

	export let stamp: Collectible;
	export let found: string | null = null;
	export let small = false;

	$: day = found ? new Date(found).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toLowerCase() : '';
</script>

<div class="stamp relative {small ? 'w-16' : 'w-32'} {found ? '' : 'unfound'}" style="--c: {stamp.color}">
	<div class="field relative grid place-items-center {small ? 'h-14' : 'h-24'} overflow-hidden">
		<span class="glyph {small ? 'text-2xl' : 'text-5xl'} leading-none select-none" aria-hidden="true">{found ? stamp.glyph : '?'}</span>
		{#if found && !small}
			<span class="postmark absolute -right-3 -bottom-3 w-14 h-14 rounded-full grid place-items-center text-[8px] leading-tight text-center" aria-hidden="true">{day}<br />{new Date(found).getFullYear()}</span>
		{/if}
	</div>
	{#if !small}<span class="block mt-1.5 text-[11px] text-center truncate text-[#2a3248]">{found ? stamp.name : '???'}</span>{/if}
</div>

<style>
	.stamp {
		background: #fbfaf7;
		/* the perforated edge: holes along the border, the middle (content box) solid */
		padding: 5px;
		-webkit-mask: linear-gradient(#000 0 0) content-box, radial-gradient(circle at 4px 4px, transparent 2.5px, #000 3px) -4px -4px / 8px 8px;
		mask: linear-gradient(#000 0 0) content-box, radial-gradient(circle at 4px 4px, transparent 2.5px, #000 3px) -4px -4px / 8px 8px;
		filter: drop-shadow(0 2px 4px rgb(0 0 0 / 0.25));
	}
	.field {
		background: radial-gradient(circle at 30% 20%, rgb(255 255 255 / 0.25), transparent 60%), var(--c);
	}
	.glyph {
		color: rgb(255 255 255 / 0.92);
		text-shadow: 0 1px 0 rgb(0 0 0 / 0.2);
	}
	.postmark {
		border: 1.5px solid rgb(42 50 72 / 0.55);
		color: rgb(42 50 72 / 0.7);
		background: rgb(251 250 247 / 0.35);
		transform: rotate(-14deg);
	}
	.unfound .field {
		background: repeating-linear-gradient(45deg, #d6dbe5 0 6px, #cdd3df 6px 12px);
	}
	.unfound .glyph {
		color: #9aa3b5;
		text-shadow: none;
	}
</style>
