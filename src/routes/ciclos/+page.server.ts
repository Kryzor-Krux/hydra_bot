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
		
		const payload = {
			number: (data.get('number') as string) || '',
			deposits: (data.get('deposits') as string) || '',
			withdrawals: (data.get('withdrawals') as string) || '',
			balance: (data.get('balance') as string) || '',
			chests: (data.get('chests') as string) || '',
			final_balance: (data.get('final_balance') as string) || ''
		};

		try {
			updateProfile(profileId, payload);
			return { success: true };
		} catch (error) {
			console.error('Error updating profile:', error);
			return { success: false, error: 'Failed to update profile' };
		}
	}
};
