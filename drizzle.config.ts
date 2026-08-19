import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const migrationDatabaseUrl = process.env.MIGRATION_DATABASE_URL;

if (!migrationDatabaseUrl) {
	throw new Error('MIGRATION_DATABASE_URL is required for Drizzle migrations.');
}

export default defineConfig({
	schema: './src/lib/server/schema.ts',
	out: './supabase/migrations',
	dialect: 'postgresql',
	dbCredentials: {
		url: migrationDatabaseUrl
	}
});
