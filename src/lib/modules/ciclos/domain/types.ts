export interface CycleProfile {
	id: string;
	cycle_id: string;
	role: 'mae' | 'filha';
	name: string;
	generated_password: string;
	cpf: string;
	number: string;
	withdrawal_password: string;
	deposits: string;
	withdrawals: string;
	balance: string;
	chests: string;
	final_balance: string;
	created_at?: string;
	updated_at?: string;
}

export interface Cycle {
	id: string;
	created_at?: string;
	updated_at?: string;
	profiles: CycleProfile[];
}

export type ProfileUpdatePayload = Pick<
	CycleProfile,
	'number' | 'deposits' | 'withdrawals' | 'balance' | 'chests' | 'final_balance'
>;
