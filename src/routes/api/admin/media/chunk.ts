import type { RequestHandler } from '@sveltejs/kit';
import { json, requireAdmin } from '$lib/server/adminAuth';
import { FOLDERS, type Folder, cdnConfigured, uploadChunk } from '$lib/server/cdn';

// One piece of a big file (e.g. a 30 MB .osk skin):
// POST ?folder=skins&name=skin.osk&id=<upload id>&index=0&total=9 with the raw bytes as the body.
// Returns { done: false } until the last piece, then { done: true, url }.
export const POST: RequestHandler = async ({ request, url }) => {
	const denied = requireAdmin(request);
	if (denied) return denied;
	if (!cdnConfigured()) return json({ error: 'CDN is not set up' }, 503);

	const folder = url.searchParams.get('folder') || '';
	if (!(FOLDERS as readonly string[]).includes(folder)) return json({ error: 'unknown folder' }, 400);

	try {
		const fileUrl = await uploadChunk({
			folder: folder as Folder,
			uploadId: url.searchParams.get('id') || '',
			index: Number(url.searchParams.get('index')),
			total: Number(url.searchParams.get('total')),
			originalName: url.searchParams.get('name') || 'file',
			data: Buffer.from(await request.arrayBuffer())
		});
		return json(fileUrl ? { done: true, url: fileUrl } : { done: false });
	} catch (error) {
		const message = (error as Error).message;
		const clientError = /^(only |invalid |chunk must|that isn't|upload expired)/.test(message);
		if (!clientError) console.error('Chunk upload failed:', error);
		return json({ error: clientError ? message : `upload failed: ${message}` }, clientError ? 400 : 502);
	}
};
