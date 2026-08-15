import { db } from './db';
import * as schema from './schema';
import { env } from '$env/dynamic/private';
import { auth } from './auth';

export async function bootstrapAdmin() {
	const username = env.ADMIN_BOOTSTRAP_USERNAME;
	const password = env.ADMIN_BOOTSTRAP_PASSWORD;

	if (!username || !password) {
		console.log('[Bootstrap] Skipping admin creation: ADMIN_BOOTSTRAP credentials not provided.');
		return;
	}

	try {
		// Check if any user exists
		const users = await db.select({ id: schema.user.id }).from(schema.user).limit(1);

		if (users.length === 0) {
			console.log(
				'[Bootstrap] No users found. Creating initial admin from environment variables...'
			);

			// Use the programmatic API directly
			try {
				await auth.api.signUpEmail({
					body: {
						email: `${username}@hydra.local`,
						username,
						password,
						name: 'Administrator'
					}
				});
			} catch (e) {
				console.error('[Bootstrap] Failed to create admin account.', e);
				return;
			}

			// Update role to admin
			const { eq } = await import('drizzle-orm');
			await db.update(schema.user).set({ role: 'admin' }).where(eq(schema.user.username, username));

			console.log('[Bootstrap] Initial admin created successfully.');
		}
	} catch (error) {
		console.error('[Bootstrap] Error during admin bootstrap:', error);
	}
}
