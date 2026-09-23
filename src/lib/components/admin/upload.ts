// Shrinks an image in the browser and uploads it to the CDN through /api/admin/media.

export type Folder = 'blog' | 'tournaments' | 'skins' | 'misc';

const MAX_BYTES = 4 * 1024 * 1024;

async function toWebp(file: File, maxSize: number): Promise<Blob> {
	const bitmap = await createImageBitmap(file);
	const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
	const canvas = document.createElement('canvas');
	canvas.width = Math.round(bitmap.width * scale);
	canvas.height = Math.round(bitmap.height * scale);
	canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
	bitmap.close();
	for (const quality of [0.85, 0.75, 0.6]) {
		const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', quality));
		if (blob && blob.size <= MAX_BYTES) return blob;
	}
	throw new Error('image is still over 4 MB after compressing');
}

/**
 * Converts to WebP (max `maxSize` px on the longest side) unless it's a GIF, which is kept as-is
 * so animations survive. Keeps the original if it's already a smaller web format.
 */
export async function prepareImage(file: File, maxSize = 2000): Promise<Blob> {
	if (!file.type.startsWith('image/')) throw new Error(`${file.name} isn't an image`);
	if (file.type === 'image/gif') {
		if (file.size > MAX_BYTES) throw new Error('GIFs must be under 4 MB (they are uploaded as-is to keep the animation)');
		return file;
	}
	const webp = await toWebp(file, maxSize);
	const keepOriginal = ['image/webp', 'image/jpeg', 'image/png', 'image/avif'].includes(file.type) && file.size <= webp.size && file.size <= MAX_BYTES;
	return keepOriginal ? file : webp;
}

export async function uploadImage(file: File, folder: Folder, maxSize?: number): Promise<string> {
	const blob = await prepareImage(file, maxSize);
	const res = await fetch(`/api/admin/media?folder=${folder}&name=${encodeURIComponent(file.name)}`, {
		method: 'POST',
		headers: { 'Content-Type': blob.type },
		body: blob
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(data.error || `upload failed (${res.status})`);
	return data.url;
}

/** First image file from a paste or drop event, if any. */
export function imageFrom(e: ClipboardEvent | DragEvent): File | null {
	const items = 'clipboardData' in e ? e.clipboardData?.files : e.dataTransfer?.files;
	return [...(items ?? [])].find((f) => f.type.startsWith('image/')) ?? null;
}

// Big files (osu! skins) are sent in ~3.5 MB pieces, since Vercel caps a request at ~4.5 MB.
const CHUNK_BYTES = 3.5 * 1024 * 1024;

export async function uploadLargeFile(file: File, folder: Folder, onProgress?: (fraction: number) => void): Promise<string> {
	const total = Math.max(1, Math.ceil(file.size / CHUNK_BYTES));
	const id = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('');
	for (let index = 0; index < total; index++) {
		const chunk = file.slice(index * CHUNK_BYTES, (index + 1) * CHUNK_BYTES);
		const params = new URLSearchParams({ folder, name: file.name, id, index: String(index), total: String(total) });
		const res = await fetch(`/api/admin/media/chunk?${params}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/octet-stream' },
			body: chunk
		});
		const data = await res.json().catch(() => ({}));
		if (!res.ok) throw new Error(data.error || `upload failed (${res.status})`);
		onProgress?.((index + 1) / total);
		if (data.done) return data.url;
	}
	throw new Error('upload did not finish');
}
