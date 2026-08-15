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
		createCycle();
		const cycle2 = createCycle();

		const latest = getLatestCycle();
		expect(latest).not.toBeNull();
		expect(latest!.id).toBe(cycle2.id);
	});

	it('should update manual fields without erasing previously saved fields', () => {
		const cycle = createCycle();
		const mae = cycle.profiles[0];

		// First update: set number and deposits
		updateProfile(mae.id, {
			number: '11999999999',
			deposits: '100'
		});

		let latest = getLatestCycle();
		let updatedMae = latest!.profiles.find((p) => p.role === 'mae')!;

		expect(updatedMae.number).toBe('11999999999');
		expect(updatedMae.deposits).toBe('100');
		expect(updatedMae.withdrawals).toBe(''); // Initial value

		// Second update: set withdrawals, should not erase number and deposits
		updateProfile(mae.id, {
			withdrawals: '50'
		});

		latest = getLatestCycle();
		updatedMae = latest!.profiles.find((p) => p.role === 'mae')!;

		expect(updatedMae.number).toBe('11999999999');
		expect(updatedMae.deposits).toBe('100');
		expect(updatedMae.withdrawals).toBe('50');
		expect(updatedMae.balance).toBe('');

		// Immutable fields should remain the same
		expect(updatedMae.name).toBe(mae.name);
		expect(updatedMae.cpf).toBe(mae.cpf);
	});
});
