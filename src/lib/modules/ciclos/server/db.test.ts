import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '$lib/server/db';
import { createCycle, getAllCycles, updateProfile, addProfileEntry } from './repository';

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

		expect(updatedMae.total_deposits).toBe(150.5);
		expect(updatedMae.total_withdrawals).toBe(50);
		expect(updatedMae.total_chests).toBe(10.99);
		expect(updatedMae.computed_balance).toBe(111.49); // 150.50 - 50 + 10.99
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
