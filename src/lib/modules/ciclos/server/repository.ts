import { db } from '$lib/server/db';
import crypto from 'node:crypto';
import type { Cycle, CycleProfile, ProfileUpdatePayload, CycleProfileEntry } from '../domain/types';
import { generateName, generatePassword, generateCPF } from '../domain/generator';
import { parseMoneyToCents, formatCents } from '../domain/money';
import { eq, inArray, desc, sql, and } from 'drizzle-orm';
import * as schema from '$lib/server/schema';

export async function getAllCycles(userId: string, limit = 50, offset = 0): Promise<Cycle[]> {
	const cyclesData = await db.select()
		.from(schema.cycles)
		.where(eq(schema.cycles.userId, userId))
		.orderBy(desc(schema.cycles.createdAt))
		.limit(limit)
		.offset(offset);

	if (cyclesData.length === 0) return [];

	const cycleIds = cyclesData.map((c) => c.id);

	const profilesData = await db.select({
		id: schema.cycleProfiles.id,
		cycleId: schema.cycleProfiles.cycleId,
		role: schema.cycleProfiles.role,
		name: schema.cycleProfiles.name,
		generatedPassword: schema.cycleProfiles.generatedPassword,
		cpf: schema.cycleProfiles.cpf,
		number: schema.cycleProfiles.number,
		withdrawalPassword: schema.cycleProfiles.withdrawalPassword,
		totalDeposits: sql<number>`COALESCE(SUM(CASE WHEN ${schema.cycleProfileEntries.type} = 'deposit' THEN ${schema.cycleProfileEntries.amountCents} ELSE 0 END), 0)`,
		totalWithdrawals: sql<number>`COALESCE(SUM(CASE WHEN ${schema.cycleProfileEntries.type} = 'withdrawal' THEN ${schema.cycleProfileEntries.amountCents} ELSE 0 END), 0)`,
		totalChests: sql<number>`COALESCE(SUM(CASE WHEN ${schema.cycleProfileEntries.type} = 'chest' THEN ${schema.cycleProfileEntries.amountCents} ELSE 0 END), 0)`
	}).from(schema.cycleProfiles)
	  .leftJoin(schema.cycleProfileEntries, eq(schema.cycleProfiles.id, schema.cycleProfileEntries.profileId))
	  .where(inArray(schema.cycleProfiles.cycleId, cycleIds))
	  .groupBy(schema.cycleProfiles.id)
	  .orderBy(desc(schema.cycleProfiles.role));

	const profileIds = profilesData.map((p) => p.id);
	let entriesData: typeof schema.cycleProfileEntries.$inferSelect[] = [];
	
	if (profileIds.length > 0) {
		entriesData = await db.select()
			.from(schema.cycleProfileEntries)
			.where(inArray(schema.cycleProfileEntries.profileId, profileIds))
			.orderBy(schema.cycleProfileEntries.createdAt);
	}

	const mappedProfiles = profilesData.map(p => {
		const depositCents = Number(p.totalDeposits || 0);
		const withdrawalCents = Number(p.totalWithdrawals || 0);
		const chestCents = Number(p.totalChests || 0);
		const balanceCents = withdrawalCents + chestCents - depositCents;

		const profileEntries = entriesData
			.filter(e => e.profileId === p.id)
			.map(e => ({
				id: e.id,
				profile_id: e.profileId,
				type: e.type,
				amount: formatCents(e.amountCents),
				created_at: e.createdAt.toISOString()
			}));

		return {
			id: p.id,
			cycle_id: p.cycleId,
			role: p.role,
			name: p.name,
			generated_password: p.generatedPassword,
			cpf: p.cpf,
			number: p.number,
			withdrawal_password: p.withdrawalPassword,
			entries: profileEntries,
			total_deposits: formatCents(depositCents),
			total_withdrawals: formatCents(withdrawalCents),
			total_chests: formatCents(chestCents),
			computed_balance: formatCents(balanceCents)
		};
	});

	return cyclesData.map(c => ({
		id: c.id,
		created_at: c.createdAt.toISOString(),
		updated_at: c.updatedAt.toISOString(),
		profiles: mappedProfiles.filter(p => p.cycle_id === c.id) as CycleProfile[]
	}));
}

async function generateUniqueName(role: string, cycleId: string): Promise<string> {
	let name = generateName();
	let attempts = 0;
	while (attempts < 50) {
		const existing = await db.select({ id: schema.cycleProfiles.id })
			.from(schema.cycleProfiles)
			.where(and(eq(schema.cycleProfiles.role, role), eq(schema.cycleProfiles.name, name)))
			.limit(1);
			
		if (existing.length === 0) return name;
		name = generateName();
		attempts++;
	}
	throw new Error(`Failed to generate unique name for role ${role} after 50 attempts`);
}

export async function createCycle(userId: string): Promise<Cycle> {
	const cycleId = crypto.randomUUID();

	let success = false;
	let retries = 0;
	
	let maeName = '';
	let filhaName = '';
	let maeCpf = '';
	let filhaCpf = '';
	
	while (!success && retries < 5) {
		maeName = await generateUniqueName('mae', cycleId);
		filhaName = await generateUniqueName('filha', cycleId);
		maeCpf = generateCPF();
		filhaCpf = generateCPF();
		
		try {
			await db.transaction(async (tx) => {
				await tx.insert(schema.cycles).values({
					id: cycleId,
					userId: userId
				});
				
				await tx.insert(schema.cycleProfiles).values([{
					id: crypto.randomUUID(),
					cycleId: cycleId,
					role: 'mae',
					name: maeName,
					generatedPassword: generatePassword(),
					cpf: maeCpf,
					number: '',
					withdrawalPassword: '101010'
				}, {
					id: crypto.randomUUID(),
					cycleId: cycleId,
					role: 'filha',
					name: filhaName,
					generatedPassword: generatePassword(),
					cpf: filhaCpf,
					number: '',
					withdrawalPassword: '101010'
				}]);
			});
			success = true;
		} catch (error: any) {
			if (error.message?.includes('unique') || error.code === '23505') {
				retries++;
			} else {
				throw error;
			}
		}
	}

	if (!success) {
		throw new Error('Failed to create cycle due to collision');
	}
	
	// We just return the created object structure to match the frontend expectations
	const emptyProfile = (role: 'mae'|'filha', name: string, cpf: string): CycleProfile => ({
		id: crypto.randomUUID(), // Mock ID just for the return, it will be re-fetched on refresh
		cycle_id: cycleId,
		role,
		name,
		generated_password: '***', // Mock for return
		cpf,
		number: '',
		withdrawal_password: '101010',
		entries: [],
		total_deposits: '0.00',
		total_withdrawals: '0.00',
		total_chests: '0.00',
		computed_balance: '0.00'
	});

	return {
		id: cycleId,
		profiles: [
			emptyProfile('mae', maeName, maeCpf),
			emptyProfile('filha', filhaName, filhaCpf)
		]
	} as Cycle;
}

export async function updateProfile(profileId: string, userId: string, payload: Partial<ProfileUpdatePayload>): Promise<void> {
	// Security constraint: join back to cycles to verify ownership
	const profileCheck = await db.select({ id: schema.cycleProfiles.id })
		.from(schema.cycleProfiles)
		.innerJoin(schema.cycles, eq(schema.cycles.id, schema.cycleProfiles.cycleId))
		.where(and(eq(schema.cycleProfiles.id, profileId), eq(schema.cycles.userId, userId)))
		.limit(1);
		
	if (profileCheck.length === 0) {
		throw new Error("Unauthorized or not found");
	}

	const allowedKeys = ['number'];
	const valuesToUpdate: any = {};
	
	for (const [key, value] of Object.entries(payload)) {
		if (allowedKeys.includes(key) && value !== undefined) {
			valuesToUpdate[key] = value;
		}
	}

	if (Object.keys(valuesToUpdate).length === 0) return;
	valuesToUpdate.updatedAt = new Date();

	await db.update(schema.cycleProfiles)
		.set(valuesToUpdate)
		.where(eq(schema.cycleProfiles.id, profileId));
}

export async function addProfileEntry(profileId: string, userId: string, type: string, amountStr: string | number): Promise<void> {
	if (!['deposit', 'withdrawal', 'chest'].includes(type)) {
		throw new Error('Invalid entry type');
	}

	// Security constraint: verify ownership
	const profileCheck = await db.select({ id: schema.cycleProfiles.id })
		.from(schema.cycleProfiles)
		.innerJoin(schema.cycles, eq(schema.cycles.id, schema.cycleProfiles.cycleId))
		.where(and(eq(schema.cycleProfiles.id, profileId), eq(schema.cycles.userId, userId)))
		.limit(1);
		
	if (profileCheck.length === 0) {
		throw new Error("Unauthorized or not found");
	}

	if (typeof amountStr !== 'string') {
		amountStr = amountStr.toString();
	}

	const amount_cents = parseMoneyToCents(amountStr);

	if (amount_cents <= 0 || amount_cents > 100000000) {
		throw new Error('Invalid amount value');
	}

	await db.insert(schema.cycleProfileEntries).values({
		id: crypto.randomUUID(),
		profileId: profileId,
		type,
		amountCents: amount_cents
	});
}

export async function getProfileTotals(profileId: string, userId: string) {
	// Security constraint: verify ownership
	const profileCheck = await db.select({ id: schema.cycleProfiles.id })
		.from(schema.cycleProfiles)
		.innerJoin(schema.cycles, eq(schema.cycles.id, schema.cycleProfiles.cycleId))
		.where(and(eq(schema.cycleProfiles.id, profileId), eq(schema.cycles.userId, userId)))
		.limit(1);
		
	if (profileCheck.length === 0) {
		throw new Error("Unauthorized or not found");
	}

	const result = await db.select({
		totalDeposits: sql<number>`COALESCE(SUM(CASE WHEN ${schema.cycleProfileEntries.type} = 'deposit' THEN ${schema.cycleProfileEntries.amountCents} ELSE 0 END), 0)`,
		totalWithdrawals: sql<number>`COALESCE(SUM(CASE WHEN ${schema.cycleProfileEntries.type} = 'withdrawal' THEN ${schema.cycleProfileEntries.amountCents} ELSE 0 END), 0)`,
		totalChests: sql<number>`COALESCE(SUM(CASE WHEN ${schema.cycleProfileEntries.type} = 'chest' THEN ${schema.cycleProfileEntries.amountCents} ELSE 0 END), 0)`
	})
	.from(schema.cycleProfileEntries)
	.where(eq(schema.cycleProfileEntries.profileId, profileId));

	const row = result[0];
	const depositCents = Number(row?.totalDeposits || 0);
	const withdrawalCents = Number(row?.totalWithdrawals || 0);
	const chestCents = Number(row?.totalChests || 0);
	const balanceCents = withdrawalCents + chestCents - depositCents;

	return {
		total_deposits: formatCents(depositCents),
		total_withdrawals: formatCents(withdrawalCents),
		total_chests: formatCents(chestCents),
		computed_balance: formatCents(balanceCents)
	};
}
