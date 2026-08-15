import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { addProfileEntry, getProfileTotals } from '$lib/modules/ciclos/server/repository';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const { profileId, type, amount } = await request.json();

		if (!profileId || !type || amount === undefined) {
			throw error(400, 'Missing required fields');
		}

		const userId = locals.user?.id;
		if (!userId) {
			throw error(401, 'Unauthorized');
		}

		await addProfileEntry(profileId, userId, type, amount);
		const totals = await getProfileTotals(profileId, userId);

		return json({ success: true, totals });
	} catch (err: any) {
		console.error('API Error adding entry:', err);
		throw error(400, err.message || 'Falha ao processar requisição');
	}
};
