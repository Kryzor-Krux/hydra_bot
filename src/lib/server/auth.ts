import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db';
import { username } from 'better-auth/plugins';
import { env } from '$env/dynamic/private';

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: 'pg'
	}),
	user: {
		additionalFields: {
			role: {
				type: "string",
				required: true,
				defaultValue: "user"
			}
		}
	},
	emailAndPassword: {
		enabled: false // We use username only
	},
	plugins: [
		username()
	],
	advanced: {
		cookiePrefix: 'hydra',
		defaultCookieAttributes: {
			sameSite: 'lax',
			secure: !env.VITE_DEV, // use secure true in prod
			httpOnly: true
		}
	},
	secret: env.BETTER_AUTH_SECRET
});
