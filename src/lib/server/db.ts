import Database from 'better-sqlite3';
import { env } from '$env/dynamic/private';
import path from 'path';
import fs from 'fs';
import crypto from 'node:crypto';
import { parseMoneyToCents } from '../modules/ciclos/domain/money';

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

	// We check if cycle_profile_entries exists.
	const tableExists = db
		.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='cycle_profile_entries'")
		.get();

	if (!tableExists) {
		db.exec(`
			CREATE TABLE cycle_profile_entries (
				id TEXT PRIMARY KEY,
				profile_id TEXT NOT NULL REFERENCES cycle_profiles(id) ON DELETE CASCADE,
				type TEXT NOT NULL CHECK(type IN ('deposit', 'withdrawal', 'chest')),
				amount_cents INTEGER NOT NULL CHECK(amount_cents > 0 AND amount_cents <= 100000000),
				created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
			);
			CREATE INDEX IF NOT EXISTS idx_cycle_profile_entries_profile_id ON cycle_profile_entries(profile_id);
		`);
	} else {
		// Ensure we are on the canonical schema if the table already existed
		const pragma = db.prepare('PRAGMA table_info(cycle_profile_entries)').all() as any[];
		const amountCol = pragma.find((c) => c.name === 'amount');
		const amountCentsCol = pragma.find((c) => c.name === 'amount_cents');

		if (amountCol && !amountCentsCol) {
			db.transaction(() => {
				// Migrate REAL amount to canonical integer amount_cents table
				db.exec(`
					CREATE TABLE cycle_profile_entries_new (
						id TEXT PRIMARY KEY,
						profile_id TEXT NOT NULL REFERENCES cycle_profiles(id) ON DELETE CASCADE,
						type TEXT NOT NULL CHECK(type IN ('deposit', 'withdrawal', 'chest')),
						amount_cents INTEGER NOT NULL CHECK(amount_cents > 0 AND amount_cents <= 100000000),
						created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
					);
					INSERT INTO cycle_profile_entries_new (id, profile_id, type, amount_cents, created_at)
					SELECT id, profile_id, type, CAST(ROUND(amount * 100) AS INTEGER), created_at
					FROM cycle_profile_entries;
					DROP TABLE cycle_profile_entries;
					ALTER TABLE cycle_profile_entries_new RENAME TO cycle_profile_entries;
					CREATE INDEX IF NOT EXISTS idx_cycle_profile_entries_profile_id ON cycle_profile_entries(profile_id);
				`);
			})();
		} else {
			// Ensure index exists even if already migrated
			db.exec(
				'CREATE INDEX IF NOT EXISTS idx_cycle_profile_entries_profile_id ON cycle_profile_entries(profile_id);'
			);
		}
	}

	// Migration: parse old text fields and migrate to entries
	// Only run if we find rows with the old fields not empty
	const oldProfiles = db
		.prepare(
			`
		SELECT id, deposits, withdrawals, chests 
		FROM cycle_profiles 
		WHERE deposits != '' OR withdrawals != '' OR chests != ''
	`
		)
		.all() as { id: string; deposits: string; withdrawals: string; chests: string }[];

	if (oldProfiles.length > 0) {
		const insertEntry = db.prepare(`
			INSERT INTO cycle_profile_entries (id, profile_id, type, amount_cents) 
			VALUES (@id, @profile_id, @type, @amount_cents)
		`);

		const clearOldFields = db.prepare(`
			UPDATE cycle_profiles 
			SET deposits = '', withdrawals = '', chests = '', balance = '', final_balance = ''
			WHERE id = @id
		`);

		db.transaction(() => {
			for (const p of oldProfiles) {
				const createEntries = (str: string, type: string) => {
					if (!str || str.trim() === '') return;
					const tokens = str
						.split(',')
						.map((s) => s.trim())
						.filter((s) => s !== '');

					for (const token of tokens) {
						// This will throw if malformed, causing transaction to rollback
						const cents = parseMoneyToCents(token);
						if (cents <= 0 || cents > 100000000) {
							throw new Error('Invalid legacy amount value');
						}

						insertEntry.run({
							id: crypto.randomUUID(),
							profile_id: p.id,
							type: type,
							amount_cents: cents
						});
					}
				};

				createEntries(p.deposits, 'deposit');
				createEntries(p.withdrawals, 'withdrawal');
				createEntries(p.chests, 'chest');

				clearOldFields.run({ id: p.id });
			}
		})();
	}
}

initDb();
