import type { RequestHandler } from '@sveltejs/kit';

// The new layout used to be previewed under /v2. It's the whole site now, so old /v2 links
// go to the same page without the prefix.
export const GET: RequestHandler = async ({ params, url }) => {
	return new Response(null, { status: 301, headers: { Location: `/${params.path}${url.search}` } });
};
