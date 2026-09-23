import { createHmac, timingSafeEqual } from 'crypto';

// Admin sessions are a signed "<expiry>.<signature>" cookie. The signing key is ADMIN_PASSWORD,
// so changing the password logs every session out. With no ADMIN_PASSWORD set, admin is disabled.

const COOKIE = 'admin_session';
const SESSION_SECONDS = 60 * 60 * 24 * 7;

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
	new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

function secret() {
	return process.env.ADMIN_PASSWORD || '';
}

function sign(value: string) {
	return createHmac('sha256', secret()).update(value).digest('base64url');
}

function safeEqual(a: string, b: string) {
	const ab = Buffer.from(a);
	const bb = Buffer.from(b);
	return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function readCookie(request: Request, name: string) {
	const header = request.headers.get('cookie') || '';
	for (const part of header.split(';')) {
		const [k, ...v] = part.trim().split('=');
		if (k === name) return decodeURIComponent(v.join('='));
	}
	return null;
}

export function isAdmin(request: Request) {
	if (!secret()) return false;
	const token = readCookie(request, COOKIE);
	if (!token) return false;
	const [expiry, signature] = token.split('.');
	if (!expiry || !signature || !safeEqual(signature, sign(expiry))) return false;
	return Number(expiry) > Date.now();
}

/** Returns an error response if the request isn't from a logged-in admin, otherwise null. */
export function requireAdmin(request: Request) {
	if (!secret()) return json({ error: 'Admin is disabled: set ADMIN_PASSWORD' }, 503);
	if (!isAdmin(request)) return json({ error: 'Not logged in' }, 401);
	return null;
}

export async function login(password: string) {
	if (!secret()) return json({ error: 'Admin is disabled: set ADMIN_PASSWORD' }, 503);
	if (typeof password !== 'string' || !safeEqual(password, secret())) {
		// Slow down password guessing.
		await new Promise((r) => setTimeout(r, 1000));
		return json({ error: 'Wrong password' }, 401);
	}
	const expiry = String(Date.now() + SESSION_SECONDS * 1000);
	const cookie = `${COOKIE}=${expiry}.${sign(expiry)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SECONDS}`;
	return json({ ok: true }, 200, { 'Set-Cookie': cookie });
}

export function logout() {
	return json({ ok: true }, 200, { 'Set-Cookie': `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0` });
}

export { json };
