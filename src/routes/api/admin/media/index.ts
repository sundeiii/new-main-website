import type { RequestHandler } from '@sveltejs/kit';
import { json, requireAdmin } from '$lib/server/adminAuth';
import { FOLDERS, type Folder, cdnConfigured, checkImage, fileName, list, remove, upload } from '$lib/server/cdn';

const notConfigured = () => json({ error: 'CDN is not set up: add the CDN_* variables to .env (see src/lib/server/cdn.ts)' }, 503);

function folderFrom(url: URL): Folder | null {
	const folder = url.searchParams.get('folder') || 'misc';
	return (FOLDERS as readonly string[]).includes(folder) ? (folder as Folder) : null;
}

// List files in a folder: GET ?folder=blog
export const GET: RequestHandler = async ({ request, url }) => {
	const denied = requireAdmin(request);
	if (denied) return denied;
	if (!cdnConfigured()) return notConfigured();

	const folder = folderFrom(url);
	if (!folder) return json({ error: `folder must be one of ${FOLDERS.join(', ')}` }, 400);
	try {
		return json({ folder, files: await list(folder) });
	} catch (error) {
		console.error('CDN list failed:', error);
		return json({ error: `couldn't reach the CDN: ${(error as Error).message}` }, 502);
	}
};

// Upload: POST ?folder=blog&name=original.png with the raw image bytes as the body.
export const POST: RequestHandler = async ({ request, url }) => {
	const denied = requireAdmin(request);
	if (denied) return denied;
	if (!cdnConfigured()) return notConfigured();

	const folder = folderFrom(url);
	if (!folder) return json({ error: `folder must be one of ${FOLDERS.join(', ')}` }, 400);

	const data = Buffer.from(await request.arrayBuffer());
	const checked = checkImage(data, request.headers.get('content-type') || '');
	if ('error' in checked) return json({ error: checked.error }, 400);

	try {
		const fileUrl = await upload(folder, fileName(url.searchParams.get('name') || 'image', checked.ext), data);
		return json({ url: fileUrl }, 201);
	} catch (error) {
		console.error('CDN upload failed:', error);
		return json({ error: `upload failed: ${(error as Error).message}` }, 502);
	}
};

// Delete: DELETE ?folder=blog&name=file.webp
export const DELETE: RequestHandler = async ({ request, url }) => {
	const denied = requireAdmin(request);
	if (denied) return denied;
	if (!cdnConfigured()) return notConfigured();

	const folder = folderFrom(url);
	const name = url.searchParams.get('name');
	if (!folder || !name) return json({ error: 'folder and name are required' }, 400);
	try {
		await remove(folder, name);
		return json({ ok: true });
	} catch (error) {
		const message = (error as Error).message;
		return json({ error: message }, message === 'invalid file name' ? 400 : 502);
	}
};
