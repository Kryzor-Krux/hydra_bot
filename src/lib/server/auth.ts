import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db';
import { username } from 'better-auth/plugins';
import { env } from '$env/dynamic/private';

const betterAuthSecret = env.BETTER_AUTH_SECRET;

if (!betterAuthSecret) {
	throw new Error('BETTER_AUTH_SECRET is required for Better Auth.');
}

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: 'pg'
	}),
	secret: betterAuthSecret,
	user: {
		additionalFields: {
			role: {
				type: 'string',
				required: true,
				defaultValue: 'user'
			}
		}
	},
	emailAndPassword: {
		enabled: true // Required for programmatic user creation, but users sign in via username
	},
	rateLimit: {
		window: 60,
		max: env.RATE_LIMIT_TEST_MODE === 'true' ? 1000 : 100,
		customRules: {
			'/sign-in/username': {
				window: 60,
				max: env.RATE_LIMIT_TEST_MODE === 'true' ? 1000 : 5 // Prevent brute force in prod
			}
		}
	},
	plugins: [username()],
	advanced: {
		cookiePrefix: 'hydra',
		defaultCookieAttributes: {
			sameSite: 'lax',
			secure: !env.VITE_DEV, // use secure true in prod
			httpOnly: true
		}
	}
});
