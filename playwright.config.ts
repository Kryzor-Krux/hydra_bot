import { defineConfig } from '@playwright/test';
import path from 'path';

export default defineConfig({
	globalSetup: './tests/e2e/global-setup.ts',
	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173,
		env: {
			DATABASE_PATH: path.resolve('./data/test-e2e.db')
		}
	},
	testMatch: '**/*.e2e.{ts,js}'
});
