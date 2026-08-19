import postgres from 'postgres';

import dotenv from 'dotenv';
import path from 'path';
import { execSync } from 'child_process';
import { getTestDatabaseUrl } from './test-database';

export default async function globalSetup() {
	dotenv.config({ path: path.resolve(process.cwd(), '.env') });

	const dbUrl = getTestDatabaseUrl();

	const sql = postgres(dbUrl, { max: 1, prepare: false });

	try {
		await sql`DROP SCHEMA public CASCADE`;
		await sql`CREATE SCHEMA public`;
		console.log('Postgres public schema reset for E2E testing.');
	} catch (e) {
		console.error('Failed to reset Postgres schema:', e);
	} finally {
		await sql.end();
	}

	console.log('Pushing Drizzle schema...');
	execSync('npx drizzle-kit push', {
		stdio: 'inherit',
		env: {
			...process.env,
			DATABASE_URL: dbUrl,
			MIGRATION_DATABASE_URL: dbUrl,
			TEST_DATABASE_URL: dbUrl
		}
	});
	console.log('Schema pushed successfully.');
}
