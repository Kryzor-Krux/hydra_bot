import dotenv from 'dotenv';
import path from 'path';
import { getTestDatabaseUrl } from './test-database';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const testDatabaseUrl = getTestDatabaseUrl();
console.log(`[E2E safety] Using isolated test database: ${new URL(testDatabaseUrl).host}`);
