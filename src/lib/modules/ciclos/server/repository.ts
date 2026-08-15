import { db } from '$lib/server/db';
import crypto from 'node:crypto';
import type { Cycle, CycleProfile, ProfileUpdatePayload, CycleProfileEntry } from '../domain/types';
import { generateName, generatePassword, generateCPF } from '../domain/generator';

export function getAllCycles(limit = 50): Cycle[] {
	const cycles = db.prepare('SELECT * FROM cycles ORDER BY rowid DESC LIMIT ?').all(limit) as any[];

	if (cycles.length === 0) return [];

	const cycleIds = cycles.map(c => c.id);
	
	const profiles = db.prepare(`
		SELECT p.*,
			COALESCE(SUM(CASE WHEN e.type = 'deposit' THEN e.amount ELSE 0 END), 0) as total_deposits,
			COALESCE(SUM(CASE WHEN e.type = 'withdrawal' THEN e.amount ELSE 0 END), 0) as total_withdrawals,
			COALESCE(SUM(CASE WHEN e.type = 'chest' THEN e.amount ELSE 0 END), 0) as total_chests
		FROM cycle_profiles p
		LEFT JOIN cycle_profile_entries e ON p.id = e.profile_id
		WHERE p.cycle_id IN (${cycleIds.map(() => '?').join(',')})
		GROUP BY p.id
		ORDER BY p.role DESC
	`).all(...cycleIds) as CycleProfile[];

	const profileIds = profiles.map(p => p.id);
	let entries: CycleProfileEntry[] = [];
	if (profileIds.length > 0) {
		entries = db.prepare(`
			SELECT * FROM cycle_profile_entries
			WHERE profile_id IN (${profileIds.map(() => '?').join(',')})
			ORDER BY created_at ASC, rowid ASC
		`).all(...profileIds) as CycleProfileEntry[];
	}

	for (const profile of profiles) {
		profile.entries = entries.filter(e => e.profile_id === profile.id);
		profile.computed_balance = (profile.total_deposits || 0) - (profile.total_withdrawals || 0) + (profile.total_chests || 0);
	}

	return cycles.map(cycle => ({
		...cycle,
		profiles: profiles.filter(p => p.cycle_id === cycle.id)
	}));
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
		withdrawal_password: '101010'
	};

	const filha: CycleProfile = {
		id: crypto.randomUUID(),
		cycle_id: cycleId,
		role: 'filha',
		name: generateName(),
		generated_password: generatePassword(),
		cpf: generateCPF(),
		number: '',
		withdrawal_password: '101010'
	};

	const insertCycle = db.prepare('INSERT INTO cycles (id) VALUES (?)');

	const insertProfile = db.prepare(`
		INSERT INTO cycle_profiles (
			id, cycle_id, role, name, generated_password, cpf,
			number, withdrawal_password
		) VALUES (
			@id, @cycle_id, @role, @name, @generated_password, @cpf,
			@number, @withdrawal_password
		)
	`);

	const transaction = db.transaction(() => {
		insertCycle.run(cycleId);
		insertProfile.run(mae);
		insertProfile.run(filha);
	});

	let success = false;
	let retries = 0;
	while (!success && retries < 5) {
		try {
			transaction();
			success = true;
		} catch (error: unknown) {
			if (
				error &&
				typeof error === 'object' &&
				'code' in error &&
				(error as any).code === 'SQLITE_CONSTRAINT_UNIQUE'
			) {
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

	mae.entries = [];
	mae.total_deposits = 0;
	mae.total_withdrawals = 0;
	mae.total_chests = 0;
	mae.computed_balance = 0;

	filha.entries = [];
	filha.total_deposits = 0;
	filha.total_withdrawals = 0;
	filha.total_chests = 0;
	filha.computed_balance = 0;

	return {
		id: cycleId,
		profiles: [mae, filha]
	};
}

export function updateProfile(profileId: string, payload: Partial<ProfileUpdatePayload>): void {
	const fields = [];
	const values: Record<string, unknown> = { id: profileId };

	const allowedKeys = ['number'];
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

export function addProfileEntry(profileId: string, type: 'deposit' | 'withdrawal' | 'chest', amount: number): void {
	const insert = db.prepare(`
		INSERT INTO cycle_profile_entries (id, profile_id, type, amount)
		VALUES (@id, @profile_id, @type, @amount)
	`);
	insert.run({
		id: crypto.randomUUID(),
		profile_id: profileId,
		type,
		amount
	});
}
