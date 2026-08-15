import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { addProfileEntry, getProfileTotals } from '$lib/modules/ciclos/server/repository';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const data = await request.json();
		const profileId = data.profileId;
		const type = data.type;
		const amountStr = data.amount;

		if (!profileId || !type || !amountStr) {
			return json({ success: false, error: 'Missing required fields' }, { status: 400 });
		}

		addProfileEntry(profileId, type, amountStr);
		const totals = getProfileTotals(profileId);

		return json({ success: true, totals });
	} catch (error: unknown) {
		console.error('Error adding entry via API:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Falha ao adicionar registro.'
			},
			{ status: 500 }
		);
	}
};
