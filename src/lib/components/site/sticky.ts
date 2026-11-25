// Sticky side columns, but only when they fit. A sticky column is pushed up by the end of its
// section, so one that's too tall ends up half under the nav once you reach the bottom of the
// page. Here it only sticks when it still fits below the nav at that point; otherwise it just
// scrolls with the page. Wide screens only (on phones the column sits above the content).
const NAV = 96; // px kept clear for the nav (Tailwind's top-24)

export function stickyAside(node: HTMLElement) {
	const wide = window.matchMedia('(min-width: 1024px)');

	function update() {
		const section = node.parentElement;
		if (!section) return;
		// Page height below the section (the footer), which is what pushes the column up.
		const below = document.documentElement.scrollHeight - (section.getBoundingClientRect().bottom + window.scrollY);
		const fits = wide.matches && node.offsetHeight + NAV + below <= window.innerHeight;
		node.style.position = fits ? 'sticky' : '';
		node.style.top = fits ? `${NAV}px` : '';
	}

	const observer = new ResizeObserver(update);
	observer.observe(node);
	observer.observe(document.body);
	window.addEventListener('resize', update);
	update();

	return {
		destroy() {
			observer.disconnect();
			window.removeEventListener('resize', update);
		}
	};
}
