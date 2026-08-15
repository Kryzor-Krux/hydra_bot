import { test, expect } from '@playwright/test';

async function generateCycle(page: import('@playwright/test').Page) {
	const generateBtn = page.getByRole('button', { name: 'GERAR DADOS' });
	// Click and wait for page to settle (the action does a 303 redirect)
	await Promise.all([page.waitForLoadState('networkidle'), generateBtn.click()]);
}

test.describe('Ciclos Module', () => {
	test('Empty state is shown when there are no cycles', async ({ page }) => {
		await page.goto('/ciclos');
		// No cycles should be visible
		await expect(page.locator('.cycle-card')).toHaveCount(0);
		// Empty state should be visible
		await expect(page.locator('.empty')).toBeVisible();
		await expect(page.locator('.empty-title')).toBeVisible();
	});

	test('Full generation, financial entry, and persistence flow', async ({ page }) => {
		await page.goto('/ciclos');

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
			page.waitForResponse((r) => r.url().includes('?/addEntry')),
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
			page.waitForResponse((r) => r.url().includes('?/addEntry')),
			maeSaqInput.press('Enter')
		]);

		// saldo = 100 + 0 - 150 = -50
		await expect(firstSaldo).toHaveText(/-50\.00/);

		// 7b. Add a baú: baus show as positive
		const maeBauInput = page.locator('.entry-input.bau').first();
		await maeBauInput.fill('100');
		await Promise.all([
			page.waitForResponse((r) => r.url().includes('?/addEntry')),
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
		await generateCycle(page);

		const depositInput = page.locator('.entry-input.dep').first();
		await depositInput.fill('10');

		// Fire enter twice rapidly; only one request should go through
		const responsePromise = page.waitForResponse((r) => r.url().includes('?/addEntry'));
		await depositInput.press('Enter');
		await depositInput.press('Enter');
		await responsePromise;

		// Reload to verify only one entry was saved (total should be -10.00)
		await page.reload();
		const depVal = page.locator('.fin-val.neg').first();
		await expect(depVal).toHaveText(/-10\.00/);
	});

	test('Financial input keeps focus and allows continuous entry flow', async ({ page }) => {
		await page.goto('/ciclos');
		await generateCycle(page);

		// Deposit continuous flow
		const depInput = page.locator('.entry-input.dep').first();
		await depInput.fill('50');
		await Promise.all([
			page.waitForResponse((r) => r.url().includes('?/addEntry')),
			depInput.press('Enter')
		]);
		await expect(depInput).toBeFocused();
		await expect(depInput).toHaveValue('');

		await depInput.fill('50');
		await Promise.all([
			page.waitForResponse((r) => r.url().includes('?/addEntry')),
			depInput.press('Enter')
		]);
		await expect(depInput).toBeFocused();
		await expect(depInput).toHaveValue('');

		await depInput.fill('50');
		await Promise.all([
			page.waitForResponse((r) => r.url().includes('?/addEntry')),
			depInput.press('Enter')
		]);

		const totalDep = page.locator('.fin-val.neg').first();
		await expect(totalDep).toHaveText(/-150\.00/);

		// Withdrawal continuous flow
		const saqInput = page.locator('.entry-input.saq').first();
		await saqInput.fill('50');
		await Promise.all([
			page.waitForResponse((r) => r.url().includes('?/addEntry')),
			saqInput.press('Enter')
		]);
		await expect(saqInput).toBeFocused();
		await expect(saqInput).toHaveValue('');

		await saqInput.fill('50');
		await Promise.all([
			page.waitForResponse((r) => r.url().includes('?/addEntry')),
			saqInput.press('Enter')
		]);
		const totalSaq = page.locator('.fin-val.pos').first();
		await expect(totalSaq).toHaveText(/\+100\.00/);

		// Chest flow
		const bauInput = page.locator('.entry-input.bau').first();
		await bauInput.fill('50');
		await Promise.all([
			page.waitForResponse((r) => r.url().includes('?/addEntry')),
			bauInput.press('Enter')
		]);
		await expect(bauInput).toBeFocused();
		const totalBau = page.locator('.fin-val.pos').nth(1);
		await expect(totalBau).toHaveText(/\+50\.00/);

		// Verify final saldo: 100 + 50 - 150 = 0.00
		const finalSaldo = page.locator('.fin-val.saldo').first();
		await expect(finalSaldo).toHaveText(/0\.00/);
	});
});
