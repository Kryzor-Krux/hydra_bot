import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const dbUrl = process.env.DATABASE_URL!;
export const sql = postgres(dbUrl, { max: 1 });

export async function truncateDomainData() {
	if (!dbUrl) return;
	try {
		await sql`TRUNCATE TABLE cycle_profile_entries, cycle_profiles, cycles CASCADE`;
	} catch (e) {
		console.error('Failed to truncate domain tables', e);
	}
}
