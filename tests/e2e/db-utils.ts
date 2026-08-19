import dotenv from 'dotenv';
import path from 'path';
import postgres from 'postgres';
import { getTestDatabaseUrl } from './test-database';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const dbUrl = getTestDatabaseUrl();
export const sql = postgres(dbUrl, { max: 1, prepare: false });

export async function truncateDomainData() {
	try {
		await sql`TRUNCATE TABLE cycle_profile_entries, cycle_profiles, cycles CASCADE`;
	} catch (e) {
		console.error('Failed to truncate domain tables', e);
	}
}
