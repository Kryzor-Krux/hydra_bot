import { describe, it, expect, vi } from 'vitest';
import { load } from './+page.server';

vi.mock('$lib/modules/ciclos/server/repository', () => ({
	getAllCycles: vi.fn().mockReturnValue([])
}));

describe('Ciclos Page Server Load', () => {
	const runLoad = async (countValue: string | null) => {
		const url = new URL('http://localhost/ciclos');
		if (countValue !== null) {
			url.searchParams.set('count', countValue);
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const result = await load({ url } as any);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return result as any;
	};

	it('should parse count=10 as 10', async () => {
		const res = await runLoad('10');
		expect(res.count).toBe(10);
	});

	it('should parse no count as 5 (default batch)', async () => {
		const res = await runLoad(null);
		expect(res.count).toBe(5);
	});

	it('should parse count=3 as 5 (minimum is BATCH=5)', async () => {
		const res = await runLoad('3');
		expect(res.count).toBe(5);
	});

	it('should parse count=-5 as 5 (minimum is BATCH=5)', async () => {
		const res = await runLoad('-5');
		expect(res.count).toBe(5);
	});

	it('should parse count=abc as 5 (default batch on invalid)', async () => {
		const res = await runLoad('abc');
		expect(res.count).toBe(5);
	});

	it('should return hasMore=false when no cycles', async () => {
		const res = await runLoad(null);
		expect(res.hasMore).toBe(false);
	});
});
