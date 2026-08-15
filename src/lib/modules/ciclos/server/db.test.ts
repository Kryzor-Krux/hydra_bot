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

		let cycles = getAllCycles();
		let updatedMae = cycles[0].profiles.find((p) => p.role === 'mae')!;

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

		let cycles = getAllCycles();
		let updatedMae = cycles[0].profiles.find((p) => p.role === 'mae')!;

		expect(updatedMae.total_deposits).toBe('150.50');
		expect(updatedMae.total_withdrawals).toBe('50.00');
		expect(updatedMae.total_chests).toBe('10.99');
		expect(updatedMae.computed_balance).toBe('111.49'); // 150.50 - 50 + 10.99
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
});

describe('Database Migration', () => {
	beforeEach(() => {
		db.exec('DELETE FROM cycle_profile_entries');
		db.exec('DELETE FROM cycle_profiles');
		db.exec('DELETE FROM cycles');
	});

	it('should migrate valid legacy string fields', () => {
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

		const p = db
			.prepare('SELECT deposits, withdrawals, chests FROM cycle_profiles WHERE id = ?')
			.get(profileId) as { deposits: string; withdrawals: string; chests: string };
		expect(p.deposits).toBe('');
		expect(p.withdrawals).toBe('');
		expect(p.chests).toBe('');

		const entries = db
			.prepare(
				'SELECT type, amount_cents FROM cycle_profile_entries WHERE profile_id = ? ORDER BY type, amount_cents'
			)
			.all(profileId) as { type: string; amount_cents: number }[];
		expect(entries.length).toBe(4);

		const depositCents = entries.filter((e) => e.type === 'deposit').map((e) => e.amount_cents);
		expect(depositCents).toEqual([1050, 2000]);

		const withdrawalCents = entries
			.filter((e) => e.type === 'withdrawal')
			.map((e) => e.amount_cents);
		expect(withdrawalCents).toEqual([500]);

		const chestCents = entries.filter((e) => e.type === 'chest').map((e) => e.amount_cents);
		expect(chestCents).toEqual([100]);
	});

	it('should rollback and NOT clear legacy fields if data is malformed', () => {
		const cycleId = crypto.randomUUID();
		const profileId = crypto.randomUUID();
		db.prepare('INSERT INTO cycles (id) VALUES (?)').run(cycleId);
		db.prepare(
			`
			INSERT INTO cycle_profiles (id, cycle_id, role, name, generated_password, cpf, number, withdrawal_password, deposits, withdrawals, chests)
			VALUES (?, ?, 'mae', 'Test', '123', '123456', '', '', '10.50, invalid', '', '')
		`
		).run(profileId, cycleId);

		// The migration inside initDb should fail but catch the error, or bubble it up?
		// Actually initDb doesn't try-catch the transaction natively at the top level, so it will throw.
		expect(() => initDb()).toThrow('Invalid amount format');

		const p = db.prepare('SELECT deposits FROM cycle_profiles WHERE id = ?').get(profileId) as {
			deposits: string;
		};
		expect(p.deposits).toBe('10.50, invalid'); // untouched

		const entriesCount = db
			.prepare('SELECT COUNT(*) as c FROM cycle_profile_entries WHERE profile_id = ?')
			.get(profileId) as { c: number };
		expect(entriesCount.c).toBe(0); // untouched due to transaction rollback
	});

	it('should be idempotent on second init', () => {
		expect(() => initDb()).not.toThrow();
	});
});
