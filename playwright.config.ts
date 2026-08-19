import { defineConfig } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';
import { getTestDatabaseUrl } from './tests/e2e/test-database';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const testDatabaseUrl = getTestDatabaseUrl();

export default defineConfig({
	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173,
		env: {
			DATABASE_URL: testDatabaseUrl,
			MIGRATION_DATABASE_URL: testDatabaseUrl,
			RATE_LIMIT_TEST_MODE: 'true'
		}
	},
	workers: 1,
	fullyParallel: false,
	testMatch: '**/*.e2e.{ts,js}'
});
