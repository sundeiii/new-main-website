import type { RequestHandler } from '@sveltejs/kit';
import { isAdmin, json, login, logout } from '$lib/server/adminAuth';

export const GET: RequestHandler = async ({ request }) => {
	return json({ loggedIn: isAdmin(request), enabled: !!process.env.ADMIN_PASSWORD });
};

export const POST: RequestHandler = async ({ request }) => {
	const { password } = await request.json().catch(() => ({}));
	return login(password);
};

export const DELETE: RequestHandler = async () => logout();
