import { auth } from '$lib/server/auth';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	return auth.handler(event.request);
};

export const POST: RequestHandler = async (event) => {
	const url = new URL(event.request.url);
	if (url.pathname.includes('/sign-up')) {
		throw error(403, 'Public registration is disabled.');
	}
	return auth.handler(event.request);
};
