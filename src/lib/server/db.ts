import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

const connectionString = env.DATABASE_URL;

if (!connectionString) {
	throw new Error('DATABASE_URL is required for the server database connection.');
}

// Supabase Transaction Pooler (port 6543) does not support prepared statements.
export const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });
