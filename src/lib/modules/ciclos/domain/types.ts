export interface CycleProfileEntry {
	id: string;
	profile_id: string;
	type: 'deposit' | 'withdrawal' | 'chest';
	amount: string;
	created_at?: string;
}

export interface CycleProfile {
	id: string;
	cycle_id: string;
	role: 'mae' | 'filha';
	name: string;
	generated_password: string;
	cpf: string;
	number: string;
	withdrawal_password: string;
	entries?: CycleProfileEntry[];
	total_deposits?: string;
	total_withdrawals?: string;
	total_chests?: string;
	computed_balance?: string;
	created_at?: string;
	updated_at?: string;
}

export interface Cycle {
	id: string;
	created_at?: string;
	updated_at?: string;
	profiles: CycleProfile[];
}

export type ProfileUpdatePayload = Pick<CycleProfile, 'number'>;
