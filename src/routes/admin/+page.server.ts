import { db } from '$lib/server/db';
import * as schema from '$lib/server/schema';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const users = await db.select({
		id: schema.user.id,
		username: schema.user.username,
		role: schema.user.role,
		createdAt: schema.user.createdAt
	}).from(schema.user);

	return {
		users
	};
};

export const actions: Actions = {
	createUser: async ({ request, locals }) => {
		// Security: verify user is admin
		if (locals.user?.role !== 'admin') {
			return fail(403, { error: 'Unauthorized. Admins only.' });
		}

		const data = await request.formData();
		const username = data.get('username') as string;
		const password = data.get('password') as string;
		const role = data.get('role') as string || 'user';

		if (!username || !password || password.length < 12) {
			return fail(400, { error: 'Invalid username or password too short (min 12 chars).' });
		}

		try {
			// Check if username exists
			const existing = await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.username, username));
			if (existing.length > 0) {
				return fail(400, { error: 'Username already exists.' });
			}

			// We need to create a user. We can use the programmatic API
			const mockRequest = new Request('http://localhost/api/auth/sign-up/username', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					username,
					password,
					name: username
				})
			});
			
			const res = await auth.handler(mockRequest);
			if (!res.ok) {
				const resBody = await res.text();
				console.error('Error creating user:', resBody);
				return fail(400, { error: 'Failed to create user.' });
			}

			// Set role
			await db.update(schema.user)
				.set({ role })
				.where(eq(schema.user.username, username));

			return { success: true };
		} catch (error) {
			console.error('Create user error:', error);
			return fail(500, { error: 'Internal server error.' });
		}
	}
};
