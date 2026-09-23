import SftpClient from 'ssh2-sftp-client';
import { createHash, randomBytes } from 'crypto';
import path from 'path';

// Uploads go over SFTP to the web hosting behind cdn.doitforjanice.eu, which serves them as
// plain static files. Configured with env vars:
//   CDN_SFTP_HOST, CDN_SFTP_PORT (default 22), CDN_SFTP_USER,
//   CDN_SFTP_PASSWORD or CDN_SFTP_PRIVATE_KEY (the private key, raw or base64 on one line),
//   CDN_DIR  – folder the subdomain serves; relative paths start in the SSH user's home
//   CDN_URL  – public url of that folder, e.g. https://cdn.doitforjanice.eu
//   CDN_SFTP_HOST_FINGERPRINT (optional, recommended) – the server's SHA256 key fingerprint(s),
//     comma-separated; connections to a server with a different key are refused

export const FOLDERS = ['blog', 'tournaments', 'misc'] as const;
export type Folder = typeof FOLDERS[number];

// Only raster images. SVG is left out because it can carry scripts.
const TYPES: Record<string, { ext: string; magic: (b: Buffer) => boolean }> = {
	'image/webp': { ext: 'webp', magic: (b) => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' },
	'image/png': { ext: 'png', magic: (b) => b.readUInt32BE(0) === 0x89504e47 },
	'image/jpeg': { ext: 'jpg', magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
	'image/gif': { ext: 'gif', magic: (b) => b.toString('ascii', 0, 4) === 'GIF8' },
	'image/avif': { ext: 'avif', magic: (b) => b.toString('ascii', 4, 12) === 'ftypavif' }
};
const EXTENSIONS = new Set(Object.values(TYPES).map((t) => t.ext));

export const MAX_BYTES = 4 * 1024 * 1024; // Vercel functions reject bodies over ~4.5 MB

export function cdnConfigured() {
	const e = process.env;
	return !!(e.CDN_SFTP_HOST && e.CDN_SFTP_USER && (e.CDN_SFTP_PASSWORD || e.CDN_SFTP_PRIVATE_KEY) && e.CDN_DIR && e.CDN_URL);
}

// The key can be pasted as-is, with \n escapes, or base64-encoded onto a single line.
function privateKey() {
	const raw = process.env.CDN_SFTP_PRIVATE_KEY?.trim();
	if (!raw) return undefined;
	if (raw.includes('BEGIN')) return raw.replace(/\\n/g, '\n');
	return Buffer.from(raw, 'base64').toString('utf8');
}

// One or more comma-separated SHA256 fingerprints, in any of the formats ssh-keygen -l or the
// hosting panel show: "SHA256:xyz=", "xyz", or the panel's "ED25519:256:SHA256:xyz".
function hostVerifier() {
	const expected = (process.env.CDN_SFTP_HOST_FINGERPRINT || '')
		.split(',')
		.map((f) => f.trim().replace(/^.*SHA256:/i, '').replace(/=+$/, ''))
		.filter(Boolean);
	if (!expected.length) return undefined;
	return (key: Buffer) => expected.includes(createHash('sha256').update(key).digest('base64').replace(/=+$/, ''));
}

async function withSftp<T>(fn: (sftp: SftpClient) => Promise<T>): Promise<T> {
	const e = process.env;
	const sftp = new SftpClient();
	await sftp.connect({
		host: e.CDN_SFTP_HOST,
		port: Number(e.CDN_SFTP_PORT || 22),
		username: e.CDN_SFTP_USER,
		password: e.CDN_SFTP_PASSWORD || undefined,
		privateKey: privateKey(),
		hostVerifier: hostVerifier(),
		readyTimeout: 10000
	});
	try {
		return await fn(sftp);
	} finally {
		await sftp.end().catch(() => {});
	}
}

const remoteDir = (folder: Folder) => path.posix.join(process.env.CDN_DIR!, folder);
const publicUrl = (folder: Folder, name: string) => `${process.env.CDN_URL!.replace(/\/$/, '')}/${folder}/${name}`;

/** Checks the bytes really are the claimed image type. Returns the file extension or an error. */
export function checkImage(data: Buffer, type: string): { ext: string } | { error: string } {
	const t = TYPES[type];
	if (!t) return { error: `unsupported type ${type || '(none)'}: use webp, png, jpeg, gif or avif` };
	if (data.length === 0) return { error: 'empty file' };
	if (data.length > MAX_BYTES) return { error: `file is ${(data.length / 1048576).toFixed(1)} MB, max is 4 MB` };
	if (data.length < 12 || !t.magic(data)) return { error: `file isn't a valid ${t.ext}` };
	return { ext: t.ext };
}

/** Readable, unique file name: "my-photo-3f9a1c.webp" */
export function fileName(original: string, ext: string) {
	const base =
		original
			.replace(/\.[^.]*$/, '')
			.toLowerCase()
			.normalize('NFKD')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '')
			.slice(0, 50) || 'image';
	return `${base}-${randomBytes(3).toString('hex')}.${ext}`;
}

export async function upload(folder: Folder, name: string, data: Buffer) {
	await withSftp(async (sftp) => {
		await sftp.mkdir(remoteDir(folder), true);
		await sftp.put(data, path.posix.join(remoteDir(folder), name));
	});
	return publicUrl(folder, name);
}

export async function list(folder: Folder) {
	return withSftp(async (sftp) => {
		if (!(await sftp.exists(remoteDir(folder)))) return [];
		const files = await sftp.list(remoteDir(folder));
		return files
			.filter((f) => f.type === '-' && EXTENSIONS.has(f.name.split('.').pop()!.toLowerCase()))
			.sort((a, b) => b.modifyTime - a.modifyTime)
			.map((f) => ({ name: f.name, size: f.size, modified: f.modifyTime, url: publicUrl(folder, f.name) }));
	});
}

export async function remove(folder: Folder, name: string) {
	// Names come from list(); refuse anything that could leave the folder.
	if (name !== path.posix.basename(name) || name.startsWith('.')) throw new Error('invalid file name');
	await withSftp((sftp) => sftp.delete(path.posix.join(remoteDir(folder), name)));
}
