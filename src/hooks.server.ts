import { auth } from '$lib/server/auth';
import { redirect, type Handle } from '@sveltejs/kit';
import { bootstrapAdmin } from '$lib/server/bootstrap';

// Run on module load
bootstrapAdmin();

export const handle: Handle = async ({ event, resolve }) => {
	// 1. Get the session from Better Auth
	const session = await auth.api.getSession({
		headers: event.request.headers
	});

	// 2. Attach to locals for convenience in endpoints
	event.locals.user = session?.user || null;
	event.locals.session = session?.session || null;

	// 3. Security Headers
	event.setHeaders({
		'Content-Security-Policy':
			"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; media-src 'self' blob:; connect-src 'self';",
		'X-Content-Type-Options': 'nosniff',
		'Referrer-Policy': 'strict-origin-when-cross-origin',
		'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
	});

	const url = new URL(event.request.url);

	// 4. Protect private routes
	if (url.pathname.startsWith('/ciclos') || url.pathname.startsWith('/admin')) {
		if (!event.locals.session) {
			throw redirect(303, '/login');
		}

		// Prevent caching of private data
		event.setHeaders({
			'Cache-Control': 'private, no-store, max-age=0, must-revalidate'
		});

		// Admin restriction
		if (url.pathname.startsWith('/admin') && event.locals.user?.role !== 'admin') {
			throw redirect(303, '/ciclos');
		}
	}

	return resolve(event);
};
