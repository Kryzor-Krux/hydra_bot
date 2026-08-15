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

		// 6. Test financial entries (Deposit)
		const maeDepositInput = page.locator('input[name="amount"]').nth(0);
		await maeDepositInput.fill('150');
		await Promise.all([
			page.waitForResponse((r) => r.url().includes('?/addEntry')),
			maeDepositInput.press('Enter')
		]);

		// Check the computed balance updated (it might be the first balance-value)
		const firstBalance = page.locator('.balance-value').first();
		await expect(firstBalance).toHaveText(/150/);

		// 7. Test Withdrawal
		const maeWithdrawalInput = page.locator('input[name="amount"]').nth(1);
		await maeWithdrawalInput.fill('50');
		await Promise.all([
			page.waitForResponse((r) => r.url().includes('?/addEntry')),
			maeWithdrawalInput.press('Enter')
		]);
		
		await expect(firstBalance).toHaveText(/100/); // 150 - 50 = 100

		// 8. verify copy behavior
		await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
		const copyBtn = page.locator('.copy-icon').first();
		await copyBtn.click();

		await expect(page.locator('.sr-only[aria-live="polite"]')).toHaveText(
			'Perfil MÃE copiado para a área de transferência.'
		);

		const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
		expect(clipboardText).toContain('nome:');
		expect(clipboardText).toContain('numero: 11999999999');
		expect(clipboardText).toContain('depositos: 150');
		expect(clipboardText).toContain('saques: 50');
		expect(clipboardText).toContain('saldo: 100');

		// 9. generate another cycle
		await generateBtn.click();

		// 10. verify multiple cycles stack up
		await expect(page.locator('.cycle-block')).toHaveCount(2);
		
		// The newest cycle is on top, its number input should be empty
		await expect(page.locator('input[name="number"]').first()).toHaveValue('');
		// The old one is at the bottom
		await expect(page.locator('input[name="number"]').nth(2)).toHaveValue('11999999999');
	});
});
