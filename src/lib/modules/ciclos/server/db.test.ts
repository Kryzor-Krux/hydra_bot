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

		addProfileEntry(mae.id, 'deposit', 150);
		addProfileEntry(mae.id, 'withdrawal', 50);
		addProfileEntry(mae.id, 'chest', 10);

		let cycles = getAllCycles();
		let updatedMae = cycles[0].profiles.find((p) => p.role === 'mae')!;

		expect(updatedMae.total_deposits).toBe(150);
		expect(updatedMae.total_withdrawals).toBe(50);
		expect(updatedMae.total_chests).toBe(10);
		expect(updatedMae.computed_balance).toBe(110); // 150 - 50 + 10
		expect(updatedMae.entries?.length).toBe(3);
	});
});
