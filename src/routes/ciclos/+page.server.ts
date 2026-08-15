import type { PageServerLoad, Actions } from './$types';
import { getLatestCycle, createCycle, updateProfile } from '$lib/modules/ciclos/server/repository';

export const load: PageServerLoad = async () => {
	const cycle = getLatestCycle();
	return {
		cycle
	};
};

export const actions: Actions = {
	generate: async () => {
		try {
			const cycle = createCycle();
			return { success: true, cycle };
		} catch (error) {
			console.error('Error generating cycle:', error);
			return { success: false, error: 'Failed to generate cycle' };
		}
	},
	update: async ({ request }) => {
		const data = await request.formData();
		const profileId = data.get('profileId') as string;
		if (!profileId) {
			return { success: false, error: 'Missing profile ID' };
		}

		const payload: Record<string, string> = {};
		const allowedKeys = ['number', 'deposits', 'withdrawals', 'balance', 'chests', 'final_balance'];

		for (const key of allowedKeys) {
			if (data.has(key)) {
				const val = data.get(key) as string;
				if (val.length > 255) {
					return { success: false, error: `O campo excedeu o limite máximo de 255 caracteres.` };
				}
				payload[key] = val;
			}
		}

		try {
			updateProfile(profileId, payload);
			return { success: true };
		} catch (error) {
			console.error('Error updating profile:', error);
			return { success: false, error: 'Falha ao atualizar o perfil.' };
		}
	}
};
