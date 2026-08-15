import Database from 'better-sqlite3';
import { env } from '$env/dynamic/private';
import path from 'path';
import fs from 'fs';

const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
const dbPath = isTest ? ':memory:' : env.DATABASE_PATH || './data/ciclos.db';

if (!isTest) {
	// Ensure directory exists
	const dir = path.dirname(dbPath);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
}

export const db = new Database(dbPath);

// Enable WAL mode and foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDb() {
	db.exec(`
		CREATE TABLE IF NOT EXISTS cycles (
			id TEXT PRIMARY KEY,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
		);

		CREATE TABLE IF NOT EXISTS cycle_profiles (
			id TEXT PRIMARY KEY,
			cycle_id TEXT NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
			role TEXT NOT NULL CHECK(role IN ('mae', 'filha')),
			name TEXT NOT NULL,
			generated_password TEXT NOT NULL,
			cpf TEXT NOT NULL UNIQUE,
			number TEXT NOT NULL DEFAULT '',
			withdrawal_password TEXT NOT NULL DEFAULT '101010',
			deposits TEXT NOT NULL DEFAULT '',
			withdrawals TEXT NOT NULL DEFAULT '',
			balance TEXT NOT NULL DEFAULT '',
			chests TEXT NOT NULL DEFAULT '',
			final_balance TEXT NOT NULL DEFAULT '',
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(cycle_id, role)
		);
	`);
}

initDb();
