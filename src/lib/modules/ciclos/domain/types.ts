export interface CycleProfileEntry {
	id: string;
	profile_id: string;
	type: 'deposit' | 'withdrawal' | 'chest';
	amount: number;
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
	total_deposits?: number;
	total_withdrawals?: number;
	total_chests?: number;
	computed_balance?: number;
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
