import { describe, it, expect, vi } from 'vitest';
import { load } from './+page.server';

vi.mock('$lib/modules/ciclos/server/repository', () => ({
	getAllCycles: vi.fn().mockReturnValue([])
}));

describe('Ciclos Page Server Load', () => {
	const runLoad = async (pageValue: string | null) => {
		const url = new URL('http://localhost/ciclos');
		if (pageValue !== null) {
			url.searchParams.set('page', pageValue);
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const result = await load({ url } as any);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return result as any;
	};

	it('should parse page=2 as 2', async () => {
		const res = await runLoad('2');
		expect(res.page).toBe(2);
	});

	it('should parse no page as 1', async () => {
		const res = await runLoad(null);
		expect(res.page).toBe(1);
	});

	it('should parse page=0 as 1', async () => {
		const res = await runLoad('0');
		expect(res.page).toBe(1);
	});

	it('should parse page=-5 as 1', async () => {
		const res = await runLoad('-5');
		expect(res.page).toBe(1);
	});

	it('should parse page=abc as 1', async () => {
		const res = await runLoad('abc');
		expect(res.page).toBe(1);
	});
});
