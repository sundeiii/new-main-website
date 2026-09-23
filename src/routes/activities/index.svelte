<script lang="ts">
  import { fade, fly } from 'svelte/transition';
</script>

<svelte:head>
  <title>activities</title>
</svelte:head>

<section class="p-8 sm:p-12 lg:p-24 lg:py-16 font-cascadia">
<div class="max-w-2xl mx-auto">
  <h1 class="text-ocean-900 dark:text-ocean-100 text-2xl mb-2" in:fly={{ y: -20, duration: 300 }}>activities</h1>
  <p class="text-ocean-700 dark:text-ocean-400 mb-10" in:fly={{ y: -20, duration: 300, delay: 50 }}>interactive stuff you can try</p>
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
    <a href="/typing" class="relative border border-ocean-300 dark:border-ocean-700 rounded overflow-hidden shadow-md flex flex-col items-center gap-3 transition-all group hover:scale-[1.03]" in:fade={{ duration: 300, delay: 100 }}>
      <div class="absolute inset-0 bg-cover bg-center transition-transform duration-500 ease-out group-hover:scale-105" style="background-image: url('https://cdn.sundei.eu/typing.png');"></div>
      <div class="absolute inset-0 bg-black/60 dark:bg-black/70 transition-colors duration-300 group-hover:bg-black/40 dark:group-hover:bg-black/50"></div>
      <div class="relative z-10 p-6 flex flex-col items-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-ocean-100 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 17v1a3 3 0 01-3 3H7a3 3 0 01-3-3V7a3 3 0 013-3h6a3 3 0 013 3v1" /><path stroke-linecap="round" stroke-linejoin="round" d="M8 11h4M8 15h4" /></svg>
        <span class="text-white text-lg font-semibold">Typing Test</span>
        <span class="text-white/80 text-sm">how fast can you type?</span>
      </div>
    </a>
    <a href="/reaction" class="relative border border-ocean-300 dark:border-ocean-700 rounded overflow-hidden shadow-md flex flex-col items-center gap-3 transition-all group hover:scale-[1.03]" in:fade={{ duration: 300, delay: 150 }}>
      <div class="absolute inset-0 bg-cover bg-center transition-transform duration-500 ease-out group-hover:scale-105" style="background-image: url('https://cdn.sundei.eu/reaction.png');"></div>
      <div class="absolute inset-0 bg-black/60 dark:bg-black/70 transition-colors duration-300 group-hover:bg-black/40 dark:group-hover:bg-black/50"></div>
      <div class="relative z-10 p-6 flex flex-col items-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-ocean-100 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m4 0h-1v-4h-1" /></svg>
        <span class="text-white text-lg font-semibold">Reaction Game</span>
        <span class="text-white/80 text-sm">test your reflexes</span>
      </div>
    </a>
  </div>
</div>
</section>
