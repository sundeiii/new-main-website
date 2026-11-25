// Posts that are hand-written pages under src/routes/blog/ (like /blog/welcome) rather than database rows.
export const builtInPosts = [
	{
		kind: 'post' as const,
		slug: 'welcome',
		title: 'welcome to my corner of the internet',
		date: '2026-02-10',
		excerpt: "hey, i'm sundei. welcome to my little space on the web where i dump thoughts, projects, and whatever else feels worth remembering.",
		banner: 'https://cdn.doitforjanice.eu/blog/banner-43f288.webp',
		endDate: null,
		location: null,
		link: null
	}
];
