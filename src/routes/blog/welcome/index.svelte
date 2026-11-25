<script lang="ts">
	// The welcome post. It's written here rather than in the admin panel, but uses the same post
	// page as every other post (clicking the desk photo opens it full screen).
	import PostPage from '$lib/components/site/PostPage.svelte';
	import { builtInPosts } from '$lib/builtInPosts';

	const meta = builtInPosts.find((p) => p.slug === 'welcome')!;

	const html = `
<p>hey, i'm sundei. welcome to my little space on the web where i dump thoughts, projects, and whatever else feels worth remembering.</p>

<h2>who am i?</h2>
<p>i'm a student trying to figure things out one day at a time. when i'm not buried in coursework, you'll find me doing the usual stuff: messing around with servers, building websites that may or may not ever see the light of day, grinding osu! (trying to get good, keyword <em>trying</em>), playing cs, and vibing to whatever's on my playlist.</p>
<p>oh, and i survive on a questionable mix of antidepressants, nicotine, and way too much caffeine. we're all works in progress here.</p>
<p><img src="https://cdn.doitforjanice.eu/blog/desk-7117b4.webp" alt="my setup" /></p>
<p><em>where the magic happens</em></p>
<p>when it comes to osu!, i'm constantly inspired by players like xootynator, zylice, mrekk, ryuk, freddie benson, cloppit, accolibed, cedru, and abyssal. watching them play keeps me motivated to improve.</p>

<h2>what's this blog for?</h2>
<p>honestly? it's a time capsule. somewhere to save memories, projects, thoughts, and moments before they disappear into the void. some posts might be technical stuff i've learned, some might be random reflections, some might just be me rambling about a song that hit different or a game that tilted me.</p>
<p>this isn't polished content or a portfolio (well, maybe a little). it's just real stuff, documented as it happens.</p>

<h2>where i'm headed</h2>
<p>right now i've got a few goals keeping me going:</p>
<ul>
	<li>actually getting good at osu! (the dream)</li>
	<li>graduating college without losing my mind</li>
	<li>making it to the netherlands to continue studying</li>
</ul>
<p>who knows if i'll get there, but at least this blog will have the receipts either way.</p>

<h2>stick around</h2>
<p>if any of this resonates with you, feel free to poke around. i'll be posting whenever inspiration strikes. no schedules, no grand plans—just vibes and whatever's on my mind.</p>
<p>thanks for stopping by. let's see where this goes.</p>
`;

	const post = { ...meta, html, published: true };
</script>

<PostPage {post} slug="welcome" back={{ href: '/blog', label: 'back to blog' }} />
