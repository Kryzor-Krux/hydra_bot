import { describe, it, expect, vi, beforeEach } from 'vitest';
import { load } from './+page.server';
import * as repository from '$lib/modules/ciclos/server/repository';

// Mock the repository functions
vi.mock('$lib/modules/ciclos/server/repository', () => ({
	getAllCycles: vi.fn(),
	createCycle: vi.fn(),
	updateProfile: vi.fn(),
	addProfileEntry: vi.fn(),
	getProfileTotals: vi.fn()
}));

const mockLocals = {
	user: { id: 'test-user-id' }
};

describe('Ciclos Page Server Load', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('should parse count=10 as 10', async () => {
		const url = new URL('http://localhost/ciclos?count=10');
		vi.mocked(repository.getAllCycles).mockResolvedValue([]);

		const result: any = await load({ url, locals: mockLocals } as any);

		expect(result.count).toBe(10);
		expect(repository.getAllCycles).toHaveBeenCalledWith('test-user-id', 11, 0);
	});

	it('should parse no count as 5 (default batch)', async () => {
		const url = new URL('http://localhost/ciclos');
		vi.mocked(repository.getAllCycles).mockResolvedValue([]);

		const result: any = await load({ url, locals: mockLocals } as any);

		expect(result.count).toBe(5);
		expect(repository.getAllCycles).toHaveBeenCalledWith('test-user-id', 6, 0);
	});

	it('should parse count=3 as 5 (minimum is BATCH=5)', async () => {
		const url = new URL('http://localhost/ciclos?count=3');
		vi.mocked(repository.getAllCycles).mockResolvedValue([]);

		const result: any = await load({ url, locals: mockLocals } as any);

		expect(result.count).toBe(5);
	});

	it('should parse count=-5 as 5 (minimum is BATCH=5)', async () => {
		const url = new URL('http://localhost/ciclos?count=-5');
		vi.mocked(repository.getAllCycles).mockResolvedValue([]);

		const result: any = await load({ url, locals: mockLocals } as any);

		expect(result.count).toBe(5);
	});

	it('should parse count=abc as 5 (default batch on invalid)', async () => {
		const url = new URL('http://localhost/ciclos?count=abc');
		vi.mocked(repository.getAllCycles).mockResolvedValue([]);

		const result: any = await load({ url, locals: mockLocals } as any);

		expect(result.count).toBe(5);
	});

	it('should return hasMore=false when no cycles', async () => {
		const url = new URL('http://localhost/ciclos');
		vi.mocked(repository.getAllCycles).mockResolvedValue([]);

		const result: any = await load({ url, locals: mockLocals } as any);

		expect(result.hasMore).toBe(false);
	});
});
