import { test, expect } from '@playwright/test';

test.describe('Ciclos Module', () => {
	test('Full generation and persistence flow', async ({ page }) => {
		// 1. open /ciclos
		await page.goto('/ciclos');

		const generateBtn = page.getByRole('button', { name: 'GERAR DADOS' });
		await expect(generateBtn).toBeVisible();

		// 2. generate a cycle
		await generateBtn.click();

		// 3. verify MÃE and FILHA appear
		await expect(page.locator('h2', { hasText: 'MÃE' }).first()).toBeVisible();
		await expect(page.locator('h2', { hasText: 'FILHA' }).first()).toBeVisible();

		// 4. fill at least one manual field
		const maeNumberInput = page.locator('input[name="number"]').first();
		await maeNumberInput.fill('11999999999');

		// Wait for the debounced update response
		await page.waitForResponse(
			(response) => response.url().includes('?/update') && response.status() === 200
		);

		// 5. verify persistence after reload
		await page.reload();
		await expect(page.locator('h2', { hasText: 'MÃE' }).first()).toBeVisible();
		await expect(page.locator('input[name="number"]').first()).toHaveValue('11999999999');

		// 6. Test financial entries (Deposit) with decimals
		const maeDepositInput = page.locator('input[name="amount"]').nth(0);
		await maeDepositInput.fill('150.50');
		await Promise.all([
			page.waitForResponse((r) => r.url().includes('?/addEntry')),
			maeDepositInput.press('Enter')
		]);

		// test double submission guard (rapid enter)
		await maeDepositInput.fill('10');
		const responsePromise = page.waitForResponse((r) => r.url().includes('?/addEntry'));
		await maeDepositInput.press('Enter');
		await maeDepositInput.press('Enter'); // Rapid second press (should be ignored)
		await responsePromise;

		// Check the computed balance updated (it might be the first balance-value)
		const firstBalance = page.locator('.balance-value').first();
		await expect(firstBalance).toHaveText(/160\.50/); // 160.50

		// 7. Test Withdrawal
		const maeWithdrawalInput = page.locator('input[name="amount"]').nth(1);
		await maeWithdrawalInput.fill('50.25');
		await Promise.all([
			page.waitForResponse((r) => r.url().includes('?/addEntry')),
			maeWithdrawalInput.press('Enter')
		]);

		await expect(firstBalance).toHaveText(/110\.25/); // 160.50 - 50.25 = 110.25

		// 7b. Test chest
		const maeChestInput = page.locator('input[name="amount"]').nth(2);
		await maeChestInput.fill('5');
		await Promise.all([
			page.waitForResponse((r) => r.url().includes('?/addEntry')),
			maeChestInput.press('Enter')
		]);
		await expect(firstBalance).toHaveText(/115\.25/);

		// 8. reload page and verify persistence of financial entries
		await page.reload();
		await expect(firstBalance).toHaveText(/115\.25/);
		await expect(page.locator('.chip').first()).toHaveText('+150.50');

		// 8. verify copy behavior
		await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
		const copyBtn = page.locator('.copy-icon').first();
		await copyBtn.click();

		await expect(page.locator('.sr-only[aria-live="polite"]')).toHaveText(
			'Perfil MAE copiado para a área de transferência.'
		);

		const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
		expect(clipboardText).toContain('nome:');
		expect(clipboardText).toContain('numero: 11999999999');
		expect(clipboardText).toContain('depositos: 160.50');
		expect(clipboardText).toContain('saques: 50.25');
		expect(clipboardText).toContain('baus: 5.00');
		expect(clipboardText).toContain('saldo: 115.25');

		// 9. generate another cycle
		await generateBtn.click();

		// 10. verify multiple cycles stack up
		await expect(page.locator('.cycle-block')).toHaveCount(2);

		// The newest cycle is on top, its number input should be empty
		await expect(page.locator('input[name="number"]').first()).toHaveValue('');
		// The old one is at the bottom
		await expect(page.locator('input[name="number"]').nth(2)).toHaveValue('11999999999');

		// 11. Pagination loop: generate 9 more cycles to push to page 2 (limit is 10)
		for (let i = 0; i < 9; i++) {
			await generateBtn.click();
			// wait a bit for generation
			await page.waitForTimeout(500);
		}

		await expect(page.locator('.cycle-block')).toHaveCount(10);

		// check pagination link exists
		const loadOlderBtn = page.locator('a.page-btn', { hasText: 'Carregar Mais Antigos' });
		await expect(loadOlderBtn).toBeVisible();
		await loadOlderBtn.click();

		// should be on page 2 and see the older cycle
		await expect(page).toHaveURL(/page=2/);
		await expect(page.locator('.cycle-block')).toHaveCount(1);
		await expect(page.locator('input[name="number"]').first()).toHaveValue('11999999999');

		// 12. generate from old page should redirect to page 1
		await generateBtn.click();
		await page.waitForURL(
			(url) => !url.searchParams.has('page') || url.searchParams.get('page') === '1'
		);
		// The newest cycle should be visible and not have the old number
		await expect(page.locator('input[name="number"]').first()).toHaveValue('');
	});
});
