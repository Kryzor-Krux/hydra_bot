import { defineConfig } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export default defineConfig({
	globalTeardown: './tests/e2e/global-teardown.ts',
	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173,
		env: {
			RATE_LIMIT_TEST_MODE: 'true'
		}
	},
	workers: 1,
	fullyParallel: false,
	testMatch: '**/*.e2e.{ts,js}'
});
