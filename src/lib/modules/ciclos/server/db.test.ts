import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '$lib/server/db';
import { createCycle, getLatestCycle, updateProfile } from './repository';

describe('Ciclos DB Repository', () => {
	beforeEach(() => {
		db.exec('DELETE FROM cycle_profiles');
		db.exec('DELETE FROM cycles');
	});

	it('should create a cycle with two profiles', () => {
		const cycle = createCycle();
		expect(cycle.profiles.length).toBe(2);
		expect(cycle.profiles[0].role).toBe('mae');
		expect(cycle.profiles[1].role).toBe('filha');
	});

	it('should persist and retrieve the latest cycle', () => {
		const cycle1 = createCycle();
		const cycle2 = createCycle();

		const latest = getLatestCycle();
		expect(latest).not.toBeNull();
		expect(latest!.id).toBe(cycle2.id);
	});

	it('should update manual fields for a profile', () => {
		const cycle = createCycle();
		const mae = cycle.profiles[0];
		
		updateProfile(mae.id, {
			number: '11999999999',
			deposits: '100',
			withdrawals: '50',
			balance: '50',
			chests: '2',
			final_balance: '150'
		});

		const latest = getLatestCycle();
		const updatedMae = latest!.profiles.find(p => p.role === 'mae')!;
		
		expect(updatedMae.number).toBe('11999999999');
		expect(updatedMae.deposits).toBe('100');
		expect(updatedMae.withdrawals).toBe('50');
		expect(updatedMae.balance).toBe('50');
		expect(updatedMae.chests).toBe('2');
		expect(updatedMae.final_balance).toBe('150');
		
		// Immutable fields should remain the same
		expect(updatedMae.name).toBe(mae.name);
		expect(updatedMae.cpf).toBe(mae.cpf);
	});
});
