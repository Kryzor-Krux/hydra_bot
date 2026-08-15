import { describe, it, expect, beforeEach } from 'vitest';
import { db, initDb } from '$lib/server/db';
import { createCycle, getAllCycles, updateProfile, addProfileEntry } from './repository';
import crypto from 'node:crypto';

describe('Ciclos DB Repository', () => {
	beforeEach(() => {
		db.exec('DELETE FROM cycle_profile_entries');
		db.exec('DELETE FROM cycle_profiles');
		db.exec('DELETE FROM cycles');
	});

	it('should create a cycle with two profiles', () => {
		const cycle = createCycle();
		expect(cycle.profiles.length).toBe(2);
		expect(cycle.profiles[0].role).toBe('mae');
		expect(cycle.profiles[1].role).toBe('filha');
	});

	it('should persist and retrieve cycles', () => {
		createCycle();
		const cycle2 = createCycle();

		const cycles = getAllCycles();
		expect(cycles.length).toBe(2);
		expect(cycles[0].id).toBe(cycle2.id); // Newest first
	});

	it('should update manual fields (number)', () => {
		const cycle = createCycle();
		const mae = cycle.profiles[0];

		updateProfile(mae.id, {
			number: '11999999999'
		});

		const cycles = getAllCycles();
		const updatedMae = cycles[0].profiles.find((p) => p.role === 'mae')!;

		expect(updatedMae.number).toBe('11999999999');
		expect(updatedMae.name).toBe(mae.name);
		expect(updatedMae.cpf).toBe(mae.cpf);
	});

	it('should add financial entries and calculate computed_balance', () => {
		const cycle = createCycle();
		const mae = cycle.profiles[0];

		addProfileEntry(mae.id, 'deposit', '150.50');
		addProfileEntry(mae.id, 'withdrawal', '50');
		addProfileEntry(mae.id, 'chest', '10.99');

		const cycles = getAllCycles();
		const updatedMae = cycles[0].profiles.find((p) => p.role === 'mae')!;

		expect(updatedMae.total_deposits).toBe('150.50');
		expect(updatedMae.total_withdrawals).toBe('50.00');
		expect(updatedMae.total_chests).toBe('10.99');
		// Correct formula: saldo = saques + baus - depositos = 50 + 10.99 - 150.50 = -89.51
		expect(updatedMae.computed_balance).toBe('-89.51');
		expect(updatedMae.entries?.length).toBe(3);
	});

	it('should reject invalid amounts', () => {
		const cycle = createCycle();
		const mae = cycle.profiles[0];

		expect(() => addProfileEntry(mae.id, 'deposit', '-10')).toThrow('Invalid amount value');
		expect(() => addProfileEntry(mae.id, 'deposit', '0')).toThrow('Invalid amount value');
		expect(() => addProfileEntry(mae.id, 'deposit', 'abc')).toThrow('Invalid amount format');
		expect(() => addProfileEntry(mae.id, 'deposit', '10.555')).toThrow('Invalid amount format');
		expect(() => addProfileEntry(mae.id, 'invalid_type', '10')).toThrow('Invalid entry type');
	});

	it('should generate unique names and enforce DB constraint', () => {
		const cycle1 = createCycle();
		const cycle2 = createCycle();

		expect(cycle1.profiles[0].name).not.toBe(cycle2.profiles[0].name);
		expect(cycle1.profiles[1].name).not.toBe(cycle2.profiles[1].name);

		const duplicateName = cycle1.profiles[0].name;
		const cycleId = crypto.randomUUID();
		db.prepare('INSERT INTO cycles (id) VALUES (?)').run(cycleId);
		expect(() => {
			db.prepare(
				`
				INSERT INTO cycle_profiles (id, cycle_id, role, name, generated_password, cpf)
				VALUES (?, ?, 'mae', ?, 'pwd', '00000000000')
			`
			).run(crypto.randomUUID(), cycleId, duplicateName);
		}).toThrow(/UNIQUE constraint failed/);
	});
});

describe('Database Migration', () => {
	beforeEach(() => {
		db.exec('DELETE FROM cycle_profile_entries');
		db.exec('DELETE FROM cycle_profiles');
		db.exec('DELETE FROM cycles');
	});

	it('should migrate valid legacy string fields, and be idempotent on second init (no duplicates)', () => {
		const cycleId = crypto.randomUUID();
		const profileId = crypto.randomUUID();
		db.prepare('INSERT INTO cycles (id) VALUES (?)').run(cycleId);
		db.prepare(
			`
			INSERT INTO cycle_profiles (id, cycle_id, role, name, generated_password, cpf, number, withdrawal_password, deposits, withdrawals, chests)
			VALUES (?, ?, 'mae', 'Test', '123', '123456', '', '', '10.50, 20.00', '5', '1')
		`
		).run(profileId, cycleId);

		initDb();

		const entries = db
			.prepare(
				'SELECT type, amount_cents FROM cycle_profile_entries WHERE profile_id = ? ORDER BY type, amount_cents'
			)
			.all(profileId) as { type: string; amount_cents: number }[];
		expect(entries.length).toBe(4);

		// Second init should not duplicate
		initDb();
		const entriesAfter = db
			.prepare(
				'SELECT type, amount_cents FROM cycle_profile_entries WHERE profile_id = ? ORDER BY type, amount_cents'
			)
			.all(profileId) as { type: string; amount_cents: number }[];
		expect(entriesAfter.length).toBe(4);
	});

	it('should normalize early-v2 REAL schema to canonical schema', () => {
		initDb();

		// Corrupt to early-v2 REAL schema manually
		db.exec(`
			DROP TABLE cycle_profile_entries;
			CREATE TABLE cycle_profile_entries (
				id TEXT PRIMARY KEY,
				profile_id TEXT NOT NULL,
				type TEXT NOT NULL,
				amount REAL NOT NULL,
				created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
			);
		`);

		const cycleId = crypto.randomUUID();
		const profileId = crypto.randomUUID();
		db.prepare('INSERT INTO cycles (id) VALUES (?)').run(cycleId);
		db.prepare(
			`INSERT INTO cycle_profiles (id, cycle_id, role, name, generated_password, cpf) VALUES (?, ?, 'mae', 'Test', '123', '123456')`
		).run(profileId, cycleId);

		db.prepare(
			`INSERT INTO cycle_profile_entries (id, profile_id, type, amount) VALUES ('e1', ?, 'deposit', 10.5)`
		).run(profileId);

		initDb();

		const entries = db
			.prepare('SELECT amount_cents FROM cycle_profile_entries WHERE id = ?')
			.get('e1') as { amount_cents: number };
		expect(entries.amount_cents).toBe(1050);
	});

	it('should normalize early-v2 amount_cents schema without CHECK to canonical schema', () => {
		initDb();

		// Corrupt to early-v2 amount_cents schema without CHECK manually
		db.exec(`
			DROP TABLE cycle_profile_entries;
			CREATE TABLE cycle_profile_entries (
				id TEXT PRIMARY KEY,
				profile_id TEXT NOT NULL,
				type TEXT NOT NULL,
				amount_cents INTEGER NOT NULL,
				created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
			);
		`);

		const cycleId = crypto.randomUUID();
		const profileId = crypto.randomUUID();
		db.prepare('INSERT INTO cycles (id) VALUES (?)').run(cycleId);
		db.prepare(
			`INSERT INTO cycle_profiles (id, cycle_id, role, name, generated_password, cpf) VALUES (?, ?, 'mae', 'Test', '123', '123456')`
		).run(profileId, cycleId);

		db.prepare(
			`INSERT INTO cycle_profile_entries (id, profile_id, type, amount_cents) VALUES ('e2', ?, 'deposit', 1050)`
		).run(profileId);

		initDb();

		const entries = db
			.prepare('SELECT amount_cents FROM cycle_profile_entries WHERE id = ?')
			.get('e2') as { amount_cents: number };
		expect(entries.amount_cents).toBe(1050);

		// Now canonical, so CHECK constraint should enforce range
		expect(() => {
			db.prepare(
				`INSERT INTO cycle_profile_entries (id, profile_id, type, amount_cents) VALUES ('e3', ?, 'deposit', 0)`
			).run(profileId);
		}).toThrow(/CHECK constraint failed/);
	});

	it('should remain safe and not rebuild when already canonical', () => {
		initDb();
		const cycleId = crypto.randomUUID();
		const profileId = crypto.randomUUID();
		db.prepare('INSERT INTO cycles (id) VALUES (?)').run(cycleId);
		db.prepare(
			`INSERT INTO cycle_profiles (id, cycle_id, role, name, generated_password, cpf) VALUES (?, ?, 'mae', 'Test', '123', '123456')`
		).run(profileId, cycleId);

		db.prepare(
			`INSERT INTO cycle_profile_entries (id, profile_id, type, amount_cents) VALUES ('e4', ?, 'deposit', 500)`
		).run(profileId);

		// Run again
		expect(() => initDb()).not.toThrow();

		const entries = db
			.prepare('SELECT amount_cents FROM cycle_profile_entries WHERE id = ?')
			.get('e4') as { amount_cents: number };
		expect(entries.amount_cents).toBe(500);
	});

	it('should have working foreign key cascade and index', () => {
		initDb();
		const cycleId = crypto.randomUUID();
		const profileId = crypto.randomUUID();
		db.prepare('INSERT INTO cycles (id) VALUES (?)').run(cycleId);
		db.prepare(
			`INSERT INTO cycle_profiles (id, cycle_id, role, name, generated_password, cpf) VALUES (?, ?, 'mae', 'Test', '123', '123456')`
		).run(profileId, cycleId);
		db.prepare(
			`INSERT INTO cycle_profile_entries (id, profile_id, type, amount_cents) VALUES ('e5', ?, 'deposit', 500)`
		).run(profileId);

		// Ensure index exists
		const indices = db
			.prepare(
				"SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='cycle_profile_entries'"
			)
			.all() as { name: string }[];
		expect(indices.map((i) => i.name)).toContain('idx_cycle_profile_entries_profile_id');

		// Cascade delete
		db.prepare('DELETE FROM cycles WHERE id = ?').run(cycleId);

		const entry = db.prepare('SELECT * FROM cycle_profile_entries WHERE id = ?').get('e5');
		expect(entry).toBeUndefined();
	});
});
