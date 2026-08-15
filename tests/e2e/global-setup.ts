import postgres from 'postgres';

import dotenv from 'dotenv';
import path from 'path';
import { execSync } from 'child_process';

export default async function globalSetup() {
	dotenv.config({ path: path.resolve(process.cwd(), '.env') });

	const dbUrl = process.env.DATABASE_URL;
	if (!dbUrl) {
		console.warn('DATABASE_URL is not set. Skipping DB reset for E2E tests.');
		return;
	}

	const sql = postgres(dbUrl, { max: 1 });

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
	execSync('npx drizzle-kit push', { stdio: 'inherit' });
	console.log('Schema pushed successfully.');
}
