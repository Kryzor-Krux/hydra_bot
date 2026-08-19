export function getTestDatabaseUrl(): string {
	const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim();
	const runtimeDatabaseUrl = process.env.DATABASE_URL?.trim();

	if (!testDatabaseUrl) {
		throw new Error(
			'[E2E safety] TEST_DATABASE_URL is required. Database-backed E2E tests cannot run without a separate test database.'
		);
	}

	if (runtimeDatabaseUrl && testDatabaseUrl === runtimeDatabaseUrl) {
		throw new Error(
			'[E2E safety] TEST_DATABASE_URL must be different from DATABASE_URL. Refusing to reset or truncate the runtime database.'
		);
	}

	return testDatabaseUrl;
}
