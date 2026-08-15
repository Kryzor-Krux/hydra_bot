import { auth } from './src/lib/server/auth';
import { db } from './src/lib/server/db';
import * as schema from './src/lib/server/schema';
import { eq } from 'drizzle-orm';

async function test() {
	try {
		console.log('Calling signUpEmail...');
		const res = await auth.api.signUpEmail({
			body: {
				email: 'admin',
				username: 'admin',
				password: 'password123456',
				name: 'Administrator'
			}
		});
		console.log('Result:', res);

		await db.delete(schema.user).where(eq(schema.user.username, 'admin'));
	} catch (e) {
		console.error('Error:', e);
	}
}

test();
