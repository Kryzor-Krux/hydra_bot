import { db } from '$lib/server/db';
import * as schema from '$lib/server/schema';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const users = await db
		.select({
			id: schema.user.id,
			username: schema.user.username,
			role: schema.user.role,
			createdAt: schema.user.createdAt
		})
		.from(schema.user);

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
		const role = 'user'; // Hardcoded requirement: exactly one admin (bootstrap)

		if (!username || !password || password.length < 12) {
			return fail(400, { error: 'Invalid username or password too short (min 12 chars).' });
		}

		try {
			// Check if username exists
			const existing = await db
				.select({ id: schema.user.id })
				.from(schema.user)
				.where(eq(schema.user.username, username));
			if (existing.length > 0) {
				return fail(400, { error: 'Username already exists.' });
			}

			// Use the programmatic API
			try {
				await auth.api.signUpEmail({
					body: {
						email: `${username}@hydra.local`,
						username,
						password,
						name: username
					}
				});
			} catch (e) {
				console.error('Error creating user:', e);
				return fail(400, { error: 'Failed to create user.' });
			}

			// Set role
			await db.update(schema.user).set({ role }).where(eq(schema.user.username, username));

			return { success: true };
		} catch (error) {
			console.error('Create user error:', error);
			return fail(500, { error: 'Internal server error.' });
		}
	}
};
