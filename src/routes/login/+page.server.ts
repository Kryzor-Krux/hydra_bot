import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals }) => {
	// If already authenticated, redirect to /ciclos
	if (locals.session) {
		throw redirect(303, '/ciclos');
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const username = data.get('username') as string;
		const password = data.get('password') as string;

		if (!username || !password) {
			return fail(400, {
				error: 'Invalid username or password.'
			});
		}

		try {
			// In SvelteKit actions, Better Auth client might be tricky if we want to set cookies directly.
			// However, since we're in the server action, we can use the programmatic handler.
			// Or we can just use the internal auth API.
			const mockRequest = new Request('http://localhost/api/auth/sign-in/username', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password })
			});

			const res = await auth.handler(mockRequest);

			if (!res.ok) {
				return fail(400, { error: 'Invalid username or password.' });
			}

			// We need to forward the set-cookie headers to the client
			const setCookie = res.headers.get('set-cookie');
			if (setCookie) {
				// We actually need to use the auth helper to set the cookies or pass them properly
				// It's usually easier to let Better Auth handle it, but in form actions we have to do this:
				return { success: true, setCookieHeader: setCookie };
			}

			return { success: true };
		} catch (error) {
			console.error('Login error:', error);
			return fail(500, { error: 'Invalid username or password.' });
		}
	}
};
