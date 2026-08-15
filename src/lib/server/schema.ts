import { pgTable, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('emailVerified').notNull(),
	image: text('image'),
	createdAt: timestamp('createdAt').notNull(),
	updatedAt: timestamp('updatedAt').notNull(),
	// username plugin fields
	username: text('username').unique(),
	displayUsername: text('displayUsername'),
	role: text('role').notNull().default('user')
});

export const session = pgTable('session', {
	id: text('id').primaryKey(),
	expiresAt: timestamp('expiresAt').notNull(),
	token: text('token').notNull().unique(),
	createdAt: timestamp('createdAt').notNull(),
	updatedAt: timestamp('updatedAt').notNull(),
	ipAddress: text('ipAddress'),
	userAgent: text('userAgent'),
	userId: text('userId')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' })
});

export const account = pgTable('account', {
	id: text('id').primaryKey(),
	accountId: text('accountId').notNull(),
	providerId: text('providerId').notNull(),
	userId: text('userId')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	accessToken: text('accessToken'),
	refreshToken: text('refreshToken'),
	idToken: text('idToken'),
	accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
	refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
	scope: text('scope'),
	password: text('password'),
	createdAt: timestamp('createdAt').notNull(),
	updatedAt: timestamp('updatedAt').notNull()
});

export const verification = pgTable('verification', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: timestamp('expiresAt').notNull(),
	createdAt: timestamp('createdAt'),
	updatedAt: timestamp('updatedAt')
});

// Domain models
export const cycles = pgTable('cycles', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const cycleProfiles = pgTable('cycle_profiles', {
	id: text('id').primaryKey(),
	cycleId: text('cycle_id')
		.notNull()
		.references(() => cycles.id, { onDelete: 'cascade' }),
	role: text('role').notNull(), // 'mae' | 'filha'
	name: text('name').notNull(),
	generatedPassword: text('generated_password').notNull(),
	cpf: text('cpf').notNull().unique(),
	number: text('number').notNull().default(''),
	withdrawalPassword: text('withdrawal_password').notNull().default('101010'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const cycleProfileEntries = pgTable('cycle_profile_entries', {
	id: text('id').primaryKey(),
	profileId: text('profile_id')
		.notNull()
		.references(() => cycleProfiles.id, { onDelete: 'cascade' }),
	type: text('type').notNull(), // 'deposit' | 'withdrawal' | 'chest'
	amountCents: integer('amount_cents').notNull(),
	createdAt: timestamp('created_at').notNull().defaultNow()
});
