import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import {
	getAllCycles,
	createCycle,
	updateProfile,
	addProfileEntry,
	getProfileTotals
} from '$lib/modules/ciclos/server/repository';

export const load: PageServerLoad = async ({ url, locals }) => {
	const BATCH = 5;
	const parsedCount = parseInt(url.searchParams.get('count') || String(BATCH), 10);
	const count = isNaN(parsedCount) ? BATCH : Math.max(BATCH, parsedCount);

	const userId = locals.user!.id;

	// Fetch one extra to detect whether there are more cycles
	const cycles = await getAllCycles(userId, count + 1, 0);
	const hasMore = cycles.length > count;

	if (hasMore) {
		cycles.pop();
	}

	return {
		cycles,
		count,
		hasMore,
		user: locals.user
	};
};

export const actions: Actions = {
	generate: async ({ locals }) => {
		try {
			await createCycle(locals.user!.id);
		} catch (error) {
			console.error('Error generating cycle:', error);
			return fail(500, { success: false, error: 'Failed to generate cycle' });
		}
		throw redirect(303, '/ciclos');
	},
	update: async ({ request, locals }) => {
		const data = await request.formData();
		const profileId = data.get('profileId') as string;
		if (!profileId) {
			return fail(400, { success: false, error: 'Missing profile ID' });
		}

		const payload: Record<string, string> = {};
		const allowedKeys = ['number'];

		for (const key of allowedKeys) {
			if (data.has(key)) {
				const val = data.get(key) as string;
				if (val.length > 255) {
					return fail(400, { success: false, error: `O campo excedeu o limite máximo de 255 caracteres.` });
				}
				payload[key] = val;
			}
		}

		try {
			await updateProfile(profileId, locals.user!.id, payload);
			return { success: true };
		} catch (error) {
			console.error('Error updating profile:', error);
			return fail(500, { success: false, error: 'Falha ao atualizar o perfil.' });
		}
	},
	addEntry: async ({ request, locals }) => {
		const data = await request.formData();
		const profileId = data.get('profileId') as string;
		const type = data.get('type') as string;
		const amountStr = data.get('amount') as string;

		if (!profileId || !type || !amountStr) {
			return fail(400, { success: false, error: 'Missing required fields' });
		}

		try {
			await addProfileEntry(profileId, locals.user!.id, type, amountStr);
			const totals = await getProfileTotals(profileId, locals.user!.id);
			return { success: true, totals };
		} catch (error: any) {
			console.error('Error adding entry:', error);
			return fail(500, {
				success: false,
				error: error.message || 'Falha ao adicionar registro.'
			});
		}
	}
};
