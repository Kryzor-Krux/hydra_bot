import { test, expect } from '@playwright/test';

test.describe('Ciclos Module', () => {
	test('Full generation and persistence flow', async ({ page }) => {
		// 1. open /ciclos
		await page.goto('/ciclos');
		
		// Wait for either empty state or cards
		const generateBtn = page.getByRole('button', { name: 'GERAR DADOS' });
		await expect(generateBtn).toBeVisible();

		// 2. generate a cycle
		await generateBtn.click();

		// 3. verify MÃE and FILHA appear
		await expect(page.locator('h2', { hasText: 'MÃE' })).toBeVisible();
		await expect(page.locator('h2', { hasText: 'FILHA' })).toBeVisible();

		// 4. verify generated names have no accents
		const nameLabels = await page.locator('.field.readonly:has(span.label:has-text("nome:")) span.value').allTextContents();
		for (const name of nameLabels) {
			expect(name).not.toMatch(/[\u0300-\u036f]/);
			expect(name).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
		}

		// 5. fill at least one manual field
		const maeNumberInput = page.locator('input#mae-number');
		await maeNumberInput.fill('11999999999');
		
		// Trigger the debounce update by waiting
		await page.waitForTimeout(600);

		// 6. verify persistence after reload
		await page.reload();
		await expect(page.locator('h2', { hasText: 'MÃE' })).toBeVisible();
		await expect(page.locator('input#mae-number')).toHaveValue('11999999999');

		// 8. generate another cycle
		await generateBtn.click();
		
		// 9. verify the UI displays the new one
		await expect(page.locator('input#mae-number')).toHaveValue('');
	});
});
