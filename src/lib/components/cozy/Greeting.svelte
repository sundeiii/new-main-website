<script lang="ts">
	// "good evening ✦ it's 21:04 for me" above my name on the home page. Only in the browser, since it
	// depends on the visitor's clock; it says "welcome back" to people who've been here before.
	import { onDestroy, onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { cozy, seasonGlyph } from './cozy';

	let text = '';
	let timer: ReturnType<typeof setInterval>;

	function greeting(back: boolean) {
		const h = new Date().getHours();
		const hello =
			h < 5 ? 'still up? me too, probably' : h < 12 ? 'good morning' : h < 18 ? 'good afternoon' : h < 22 ? 'good evening' : 'good night-ish';
		const mine = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Tallinn', hour: '2-digit', minute: '2-digit' }).format(new Date());
		const sameTime = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(new Date()) === mine;
		if (sameTime) return back && h >= 5 ? `${hello}, welcome back` : hello;
		return `${hello} · ${mine} here`;
	}

	onMount(() => {
		let back = false;
		try {
			back = !!localStorage.getItem('been-here');
			localStorage.setItem('been-here', '1');
		} catch {}
		text = greeting(back);
		timer = setInterval(() => (text = greeting(back)), 60_000);
	});
	onDestroy(() => clearInterval(timer));
</script>

{#if text && ($cozy?.greeting ?? true)}
	<p class="text-xs text-ocean-500 mb-1 flex items-center gap-1.5" in:fade={{ duration: 400 }}>
		<span class="sparkle" aria-hidden="true">{$cozy?.seasonalTouches ?? true ? seasonGlyph() : '✦'}</span>{text}
	</p>
{/if}

<style>
	.sparkle {
		color: var(--trail-2, var(--accent));
		animation: twinkle 3.2s ease-in-out infinite;
	}
	@keyframes twinkle {
		0%,
		100% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.45;
			transform: scale(0.8) rotate(20deg);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.sparkle {
			animation: none;
		}
	}
</style>
