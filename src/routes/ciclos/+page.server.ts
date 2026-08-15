import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import {
	getAllCycles,
	createCycle,
	updateProfile,
	addProfileEntry
} from '$lib/modules/ciclos/server/repository';

export const load: PageServerLoad = async ({ url }) => {
	const parsedPage = parseInt(url.searchParams.get('page') || '1', 10);
	const page = isNaN(parsedPage) ? 1 : Math.max(1, parsedPage);
	const limit = 10; // Keep the interface simple with a smaller limit like 10
	const offset = (page - 1) * limit;
	const cycles = getAllCycles(limit + 1, offset);
	const hasMore = cycles.length > limit;

	if (hasMore) {
		cycles.pop();
	}

	return {
		cycles,
		page,
		hasMore
	};
};

export const actions: Actions = {
	generate: async () => {
		try {
			createCycle();
		} catch (error) {
			console.error('Error generating cycle:', error);
			return { success: false, error: 'Failed to generate cycle' };
		}
		throw redirect(303, '/ciclos');
	},
	update: async ({ request }) => {
		const data = await request.formData();
		const profileId = data.get('profileId') as string;
		if (!profileId) {
			return { success: false, error: 'Missing profile ID' };
		}

		const payload: Record<string, string> = {};
		const allowedKeys = ['number'];

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
	},
	addEntry: async ({ request }) => {
		const data = await request.formData();
		const profileId = data.get('profileId') as string;
		const type = data.get('type') as string;
		const amountStr = data.get('amount') as string;

		if (!profileId || !type || !amountStr) {
			return { success: false, error: 'Missing required fields' };
		}

		try {
			addProfileEntry(profileId, type, amountStr);
			return { success: true };
		} catch (error: unknown) {
			console.error('Error adding entry:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Falha ao adicionar registro.'
			};
		}
	}
};
