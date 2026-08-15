import { db } from '$lib/server/db';
import crypto from 'node:crypto';
import type { Cycle, CycleProfile, ProfileUpdatePayload } from '../domain/types';
import { generateName, generatePassword, generateCPF } from '../domain/generator';

export function getLatestCycle(): Cycle | null {
	const cycleRow = db.prepare('SELECT * FROM cycles ORDER BY rowid DESC LIMIT 1').get() as
		{ id: string; created_at: string; updated_at: string } | undefined;

	if (!cycleRow) return null;

	const profiles = db
		.prepare('SELECT * FROM cycle_profiles WHERE cycle_id = ? ORDER BY role DESC')
		.all(cycleRow.id) as CycleProfile[];
	// role DESC means 'mae' then 'filha' usually, but let's just make sure it works as expected.
	// better yet, we sort them manually or return as is.

	return {
		...cycleRow,
		profiles
	};
}

export function createCycle(): Cycle {
	const cycleId = crypto.randomUUID();

	const mae: CycleProfile = {
		id: crypto.randomUUID(),
		cycle_id: cycleId,
		role: 'mae',
		name: generateName(),
		generated_password: generatePassword(),
		cpf: generateCPF(),
		number: '',
		withdrawal_password: '101010',
		deposits: '',
		withdrawals: '',
		balance: '',
		chests: '',
		final_balance: ''
	};

	const filha: CycleProfile = {
		id: crypto.randomUUID(),
		cycle_id: cycleId,
		role: 'filha',
		name: generateName(),
		generated_password: generatePassword(),
		cpf: generateCPF(),
		number: '',
		withdrawal_password: '101010',
		deposits: '',
		withdrawals: '',
		balance: '',
		chests: '',
		final_balance: ''
	};

	const insertCycle = db.prepare('INSERT INTO cycles (id) VALUES (?)');

	const insertProfile = db.prepare(`
		INSERT INTO cycle_profiles (
			id, cycle_id, role, name, generated_password, cpf,
			number, withdrawal_password, deposits, withdrawals, balance, chests, final_balance
		) VALUES (
			@id, @cycle_id, @role, @name, @generated_password, @cpf,
			@number, @withdrawal_password, @deposits, @withdrawals, @balance, @chests, @final_balance
		)
	`);

	const transaction = db.transaction(() => {
		insertCycle.run(cycleId);
		insertProfile.run(mae);
		insertProfile.run(filha);
	});

	// It will throw and abort if something fails, like UNIQUE constraint on cpf
	// But CPF collision is theoretically rare. We should retry if CPF exists,
	// but for now relying on transaction rollback if collision happens.
	// We can loop to retry if CPF exists.
	let success = false;
	let retries = 0;
	while (!success && retries < 5) {
		try {
			transaction();
			success = true;
		} catch (error: unknown) {
			if (error && typeof error === 'object' && 'code' in error && error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
				// Regenerate CPFs
				mae.cpf = generateCPF();
				filha.cpf = generateCPF();
				retries++;
			} else {
				throw error;
			}
		}
	}

	if (!success) {
		throw new Error('Failed to create cycle due to collision');
	}

	return {
		id: cycleId,
		profiles: [mae, filha]
	};
}

export function updateProfile(profileId: string, payload: Partial<ProfileUpdatePayload>): void {
	const fields = [];
	const values: Record<string, unknown> = { id: profileId };

	const allowedKeys = ['number', 'deposits', 'withdrawals', 'balance', 'chests', 'final_balance'];
	for (const [key, value] of Object.entries(payload)) {
		if (allowedKeys.includes(key) && value !== undefined) {
			fields.push(`${key} = @${key}`);
			values[key] = value;
		}
	}

	if (fields.length === 0) return;

	const stmt = db.prepare(`
		UPDATE cycle_profiles 
		SET ${fields.join(', ')},
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = @id
	`);

	stmt.run(values);
}
