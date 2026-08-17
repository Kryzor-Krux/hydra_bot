import { test, expect, type Page } from '@playwright/test';
import { truncateDomainData } from './db-utils';

async function loginUser(page: Page) {
	await page.addInitScript(() => {
		window.sessionStorage.setItem('hydra_intro_seen', 'true');
	});
	await page.goto('/login');
	// In the real app, we need the bootstrap admin credentials or a test user.
	// For testing, we assume the environment creates an admin.
	const username = process.env.ADMIN_BOOTSTRAP_USERNAME || 'admin';
	const password = process.env.ADMIN_BOOTSTRAP_PASSWORD || 'admin123';

	// Wait for login form
	await expect(page.locator('form')).toBeVisible();
	await page.fill('input[name="username"]', username);
	await page.fill('input[name="password"]', password);
	await Promise.all([page.waitForURL('**/ciclos'), page.click('button[type="submit"]')]);
}

async function generateCycle(page: Page) {
	const generateBtn = page.getByRole('button', { name: 'GERAR DADOS' });
	// Click and wait for page to settle (the action does a 303 redirect)
	await Promise.all([page.waitForLoadState('networkidle'), generateBtn.click()]);
}

test.describe('Ciclos Module', () => {
	test.beforeEach(async ({ page }) => {
		await truncateDomainData();
		await loginUser(page);
	});

	test('Intro choreography and timing sequence', async ({ browser }) => {
		const context = await browser.newContext();
		const page = await context.newPage();
		await page.emulateMedia({ reducedMotion: 'no-preference' });

		await page.goto('/login');

		// The intro should be visible
		await expect(page.locator('.hydra-intro')).toBeVisible();

		// Click to initialize the boot sequence
		await page.click('body');

		// Start sequence (Wait for KRYZER typing)
		const kryzerText = page.locator('.ascii-kryzer');
		const sysReadyText = page.locator('.sys-ready');

		// Eventually it must become fully typed
		await expect(kryzerText).toHaveText('KRYZER', { timeout: 10000 });

		// System Ready should not be visible yet
		await expect(sysReadyText).toHaveText('');

		// Eventually it must become fully typed
		await expect(sysReadyText).toHaveText('HYDRA // SYSTEM READY', { timeout: 10000 });

		// Intro should unmount
		await expect(page.locator('.hydra-intro')).toHaveCount(0, { timeout: 10000 });

		// Now login elements should appear
		await expect(page.locator('input[name="username"]')).toBeVisible();
	});

	test('Empty state is shown when there are no cycles', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: null });
		await page.goto('/ciclos');
		await page.locator('body').click();
		await page.waitForTimeout(300);
		// No cycles should be visible
		await expect(page.locator('.cycle-card')).toHaveCount(0);
		// Empty state should be visible
		await expect(page.locator('.empty')).toBeVisible();
		await expect(page.locator('.empty-title')).toBeVisible();
	});

	test('Full generation, financial entry, and persistence flow', async ({ page }) => {
		await page.goto('/ciclos');
		await page.locator('body').click();
		await page.waitForTimeout(300);

		const generateBtn = page.getByRole('button', { name: 'GERAR DADOS' });
		await expect(generateBtn).toBeVisible();

		// 1. Generate a cycle
		await generateCycle(page);

		// 2. Verify MÃE and FILHA appear
		await expect(page.locator('.role-badge', { hasText: 'MÃE' }).first()).toBeVisible();
		await expect(page.locator('.role-badge', { hasText: 'FILHA' }).first()).toBeVisible();

		// 3. No individual chip history should be shown
		await expect(page.locator('.chip')).toHaveCount(0);

		// 4. Fill the manual 'numero' field
		const maeNumberInput = page.locator('input[name="number"]').first();
		await maeNumberInput.fill('11999999999');
		await page.waitForResponse(
			(response) => response.url().includes('?/update') && response.status() === 200
		);

		// 5. Verify persistence after reload
		await page.reload();
		await expect(page.locator('.role-badge', { hasText: 'MÃE' }).first()).toBeVisible();
		await expect(page.locator('input[name="number"]').first()).toHaveValue('11999999999');

		// 6. Add a deposit: depositos show as negative
		const maeDepositInput = page.locator('.entry-input.dep').first();
		await maeDepositInput.fill('150');
		await Promise.all([
			page.waitForResponse((r) => r.url().includes('/api/ciclos/entries')),
			maeDepositInput.press('Enter')
		]);

		// After 150 deposit, saldo = 0 + 0 - 150 = -150
		const firstDepTotal = page.locator('.fin-val.neg').first();
		await expect(firstDepTotal).toHaveText(/-150\.00/);

		// SALDO should be negative: -150.00
		const firstSaldo = page.locator('.fin-val.saldo').first();
		await expect(firstSaldo).toHaveText(/-150\.00/);

		// 7. Add a saque: saques show as positive
		const maeSaqInput = page.locator('.entry-input.saq').first();
		await maeSaqInput.fill('100');
		await Promise.all([
			page.waitForResponse((r) => r.url().includes('/api/ciclos/entries')),
			maeSaqInput.press('Enter')
		]);

		// saldo = 100 + 0 - 150 = -50
		await expect(firstSaldo).toHaveText(/-50\.00/);

		// 7b. Add a baú: baus show as positive
		const maeBauInput = page.locator('.entry-input.bau').first();
		await maeBauInput.fill('100');
		await Promise.all([
			page.waitForResponse((r) => r.url().includes('/api/ciclos/entries')),
			maeBauInput.press('Enter')
		]);

		// saldo = 100 + 100 - 150 = +50
		await expect(firstSaldo).toHaveText(/\+50\.00/);

		// 8. Reload and verify persistence (no chips, only totals)
		await page.reload();
		await expect(firstSaldo).toHaveText(/\+50\.00/);
		await expect(page.locator('.chip')).toHaveCount(0);

		// 9. Copy profile and verify corrected text output
		await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
		const copyBtn = page.locator('.btn-copy-profile').first();
		await copyBtn.click();

		await expect(page.locator('.sr-only[aria-live="polite"]')).toHaveText(
			'Perfil MÃE copiado para a área de transferência.'
		);

		const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
		expect(clipboardText).toContain('nome:');
		expect(clipboardText).toContain('numero: 11999999999');
		// Depositos are displayed as negative
		expect(clipboardText).toContain('depositos: -150.00');
		// Saques and baus are displayed as positive
		expect(clipboardText).toContain('saques: +100.00');
		expect(clipboardText).toContain('baus: +100.00');
		// Saldo = saques + baus - depositos = 100 + 100 - 150 = +50
		expect(clipboardText).toContain('saldo: +50.00');
	});

	test('Only 5 cycles shown initially; load-more adds 5 more', async ({ page }) => {
		await page.goto('/ciclos');
		await page.locator('body').click();
		await page.waitForTimeout(300);

		// Generate enough cycles to ensure at least 6 exist (including any from prior tests)
		// We generate 6 to guarantee there are more than 5 even if DB starts empty
		for (let i = 0; i < 6; i++) {
			await generateCycle(page);
		}

		// Should show exactly 5 initially (server paginates by count=5)
		await expect(page.locator('.cycle-card')).toHaveCount(5);

		// Load more button should be visible since there are more than 5 cycles
		const loadMoreBtn = page.locator('#btn-load-more');
		await expect(loadMoreBtn).toBeVisible();

		// Click load more – navigates to ?count=10
		await Promise.all([page.waitForLoadState('networkidle'), loadMoreBtn.click()]);

		// Now 10 cycles should be visible (or all cycles if fewer than 10)
		const countAfter = await page.locator('.cycle-card').count();
		expect(countAfter).toBeGreaterThan(5);
	});

	test('Newest cycle appears first after generation', async ({ page }) => {
		await page.goto('/ciclos');
		await page.locator('body').click();
		await page.waitForTimeout(300);

		// Generate first cycle and set a number
		await generateCycle(page);
		const firstInput = page.locator('input[name="number"]').first();
		await firstInput.fill('11999999999');
		await page.waitForResponse(
			(response) => response.url().includes('?/update') && response.status() === 200
		);

		// Generate second cycle — it should appear on top (newest first)
		await generateCycle(page);

		// The first input (newest cycle) should be empty
		await expect(page.locator('input[name="number"]').first()).toHaveValue('');
		// The second input (older cycle) should have the saved value
		await expect(page.locator('input[name="number"]').nth(2)).toHaveValue('11999999999');
	});

	test('Double submission guard on entry forms', async ({ page }) => {
		await page.goto('/ciclos');
		await page.locator('body').click();
		await page.waitForTimeout(300);
		await generateCycle(page);

		const depositInput = page.locator('.entry-input.dep').first();
		await depositInput.fill('10');

		// Fire enter twice rapidly; only one request should go through
		const responsePromise = page.waitForResponse((r) => r.url().includes('/api/ciclos/entries'));
		await depositInput.press('Enter');
		await depositInput.press('Enter');
		await responsePromise;

		// Reload to verify only one entry was saved (total should be -10.00)
		await page.reload();
		const depVal = page.locator('.fin-val.neg').first();
		await expect(depVal).toHaveText(/-10\.00/);
	});

	test('Financial input deterministic rapid stress test', async ({ page }) => {
		await page.goto('/ciclos');
		await page.locator('body').click();
		await page.waitForTimeout(300);
		await generateCycle(page);

		const depInput = page.locator('.entry-input.dep').first();

		// Rapid deposit input without waiting
		await depInput.focus();
		await depInput.fill('10');
		await depInput.press('Enter');
		await depInput.fill('20');
		await depInput.press('Enter');
		await depInput.fill('30');
		await depInput.press('Enter');
		await depInput.fill('40');
		await depInput.press('Enter');
		await depInput.fill('50');
		await depInput.press('Enter');

		const saqInput = page.locator('.entry-input.saq').first();
		await saqInput.focus();
		await saqInput.fill('10');
		await saqInput.press('Enter');
		await saqInput.fill('20');
		await saqInput.press('Enter');
		await saqInput.fill('30');
		await saqInput.press('Enter');

		const bauInput = page.locator('.entry-input.bau').first();
		await bauInput.focus();
		await bauInput.fill('5');
		await bauInput.press('Enter');
		await bauInput.fill('10');
		await bauInput.press('Enter');

		// Wait for all fetches to settle before verifying totals
		// This avoids racing the optimistic update against the server's reconciliation
		await page.waitForLoadState('networkidle');

		// Check final totals
		const totalDep = page.locator('.fin-val.neg').first();
		await expect(totalDep).toHaveText(/-150\.00/);

		const totalSaq = page.locator('.fin-val.pos').first();
		await expect(totalSaq).toHaveText(/\+60\.00/);

		const totalBau = page.locator('.fin-val.pos').nth(1); // baus is the second pos span
		await expect(totalBau).toHaveText(/\+15\.00/);

		const finalSaldo = page.locator('.fin-val.saldo').first();
		await expect(finalSaldo).toHaveText(/-75\.00/);

		// Reload to verify authoritative totals
		await page.reload();

		await expect(page.locator('.fin-val.neg').first()).toHaveText(/-150\.00/);
		await expect(page.locator('.fin-val.pos').first()).toHaveText(/\+60\.00/);
		await expect(page.locator('.fin-val.pos').nth(1)).toHaveText(/\+15\.00/);
		await expect(page.locator('.fin-val.saldo').first()).toHaveText(/-75\.00/);
	});
});
