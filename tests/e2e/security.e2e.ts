import { test, expect, type Page } from '@playwright/test';
import { truncateDomainData, sql } from './db-utils';

// Use same credentials as global-setup / bootstrap
const adminUsername = process.env.ADMIN_BOOTSTRAP_USERNAME || 'admin';
const adminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD || 'admin123';

async function login(page: Page, username = adminUsername, password = adminPassword) {
	await page.addInitScript(() => {
		window.sessionStorage.setItem('hydra_intro_seen', 'true');
	});
	await page.goto('/login');
	await page.fill('input[name="username"]', username);
	await page.fill('input[name="password"]', password);
	await Promise.all([page.waitForURL('**/ciclos'), page.click('button[type="submit"]')]);
}

test.describe('Security & Auth E2E', () => {
	test.beforeEach(async ({ page }) => {
		await page.addInitScript(() => {
			window.sessionStorage.setItem('hydra_intro_seen', 'true');
		});
	});

	test('Anonymous users are redirected to login', async ({ page }) => {
		await page.goto('/ciclos');
		await expect(page).toHaveURL(/.*\/login/);

		await page.goto('/admin');
		await expect(page).toHaveURL(/.*\/login/);
	});

	test('Wrong password rejected', async ({ page }) => {
		await page.goto('/login');
		await page.fill('input[name="username"]', adminUsername);
		await page.fill('input[name="password"]', 'wrongpassword');
		await page.click('button[type="submit"]');
		await expect(page.locator('.error')).toBeVisible();
		await expect(page.locator('.error')).toHaveText('Invalid username or password.');
	});

	test('Unknown username produces generic error', async ({ page }) => {
		await page.goto('/login');
		await page.fill('input[name="username"]', 'unknown_user_999');
		await page.fill('input[name="password"]', 'password123');
		await page.click('button[type="submit"]');
		await expect(page.locator('.error')).toBeVisible();
		await expect(page.locator('.error')).toHaveText('Invalid username or password.');
	});

	test('Direct public signup attempt returns forbidden', async ({ request }) => {
		const res = await request.post('/api/auth/sign-up/username', {
			data: { username: 'hacker', password: 'password123', name: 'hacker' }
		});
		expect(res.status()).toBe(403);
	});
});

test.describe('Admin Privilege & User Creation', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('Admin can access /admin and create a normal user', async ({ page }) => {
		await page.goto('/admin');
		await expect(page.locator('h1')).toHaveText(/ADMINISTRATION/);

		const newUsername = 'normal_user_' + Date.now();
		await page.fill('input[name="username"]', newUsername);
		await page.fill('input[name="password"]', 'securepassword123');
		await Promise.all([page.waitForLoadState('networkidle'), page.click('button[type="submit"]')]);

		// Verify user appears in table with USER role
		const row = page.locator('tr', { hasText: newUsername });
		await expect(row).toBeVisible();
		await expect(row.locator('.badge')).toHaveText('USER');
	});

	test('Crafted role=admin request cannot create second admin', async ({ page }) => {
		// Admin is logged in via context cookies.
		// Instead of Node-side request, we execute a browser-native fetch exactly like a malicious user would via console
		const hackerUsername = 'fake_admin_' + Date.now();

		await page.goto('/admin'); // Load page to ensure valid session and any embedded CSRF context

		const createStatus = await page.evaluate(async (username) => {
			const fd = new FormData();
			fd.append('username', username);
			fd.append('password', 'securepassword123');
			fd.append('role', 'admin'); // Attempt to inject role

			const res = await fetch('/admin?/createUser', { method: 'POST', body: fd });
			return res.status;
		}, hackerUsername);

		// Assert that the injection attempt was rejected by the business logic or was processed securely
		expect(createStatus).toBeDefined();

		// Go to admin page and verify the user was created as 'user'
		await page.goto('/admin');
		const row = page.locator('tr', { hasText: hackerUsername });
		await expect(row).toBeVisible();
		await expect(row.locator('.badge')).toHaveText('USER');
	});

	test.afterAll(async () => {
		const res = await sql`SELECT count(*) FROM "user" WHERE role = 'admin'`;
		expect(Number(res[0].count)).toBe(1);
	});
});

test.describe('Data Isolation (BOLA/IDOR)', () => {
	test.beforeEach(async () => {
		await truncateDomainData();
	});

	test('User B cannot mutate User A data', async ({ browser }) => {
		// 1. Login as Admin (User A) and create a cycle
		const ctxA = await browser.newContext();
		const pageA = await ctxA.newPage();
		await login(pageA);
		await pageA.goto('/ciclos');

		await Promise.all([
			pageA.waitForLoadState('networkidle'),
			pageA.getByRole('button', { name: 'GERAR DADOS' }).click()
		]);

		// 2. We need the cycle/profile ID.
		// We can reliably extract it from the hidden input in the form.
		const targetProfileId = await pageA.locator('input[name="profileId"]').first().inputValue();

		const updateResponsePromise = pageA.waitForResponse(
			(r) => r.url().includes('?/update') && r.status() === 200
		);
		const maeNumberInput = pageA.locator('input[name="number"]').first();
		await maeNumberInput.fill('11999999999');
		await updateResponsePromise;

		expect(targetProfileId).not.toBe('');

		// 3. Login as Normal User (User B)
		const ctxB = await browser.newContext();
		const pageB = await ctxB.newPage();
		await pageB.addInitScript(() => {
			window.sessionStorage.setItem('hydra_intro_seen', 'true');
		});
		await pageB.goto('/login');

		// Create User B first via admin API (context A)
		const userBUsername = 'user_b_' + Date.now();
		await ctxA.request.post('/admin?/createUser', {
			headers: { origin: 'http://localhost:4173' },
			form: { username: userBUsername, password: 'securepassword123' }
		});

		await pageB.fill('input[name="username"]', userBUsername);
		await pageB.fill('input[name="password"]', 'securepassword123');
		await Promise.all([pageB.waitForURL('**/ciclos'), pageB.click('button[type="submit"]')]);

		// 4. Attempt IDOR as User B
		// Load a page in B to get valid CSRF context
		await pageB.goto('/ciclos');

		const idorStatus = await pageB.evaluate(async (pid) => {
			const fd = new FormData();
			fd.append('profileId', pid);
			fd.append('number', 'hacked_number');
			const res = await fetch('/ciclos?/update', { method: 'POST', body: fd });
			const payload = await res.json();
			return payload.type === 'failure' ? payload.status : res.status;
		}, targetProfileId);

		expect(idorStatus).toBeGreaterThanOrEqual(400); // Unauthorized (or fails business logic)

		const idorApiStatus = await pageB.evaluate(async (pid) => {
			const res = await fetch('/api/ciclos/entries', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ profileId: pid, type: 'deposit', amount: 100 })
			});
			return res.status;
		}, targetProfileId);

		expect(idorApiStatus).toBeGreaterThanOrEqual(400); // Unauthorized
	});

	test('Rate limiter correctly rejects rapid requests', async ({ request }) => {
		// In test mode, RATE_LIMIT_TEST_MODE sets the /sign-in/username limit to 1000
		// We fire 1005 requests in parallel to exceed this limit deterministically.
		// NOTE: This test MUST run last because it exhausts the global test IP rate limit bucket.
		const reqs = Array.from({ length: 1005 }, () =>
			request.post('/api/auth/sign-in/username', {
				data: { username: 'a', password: 'b' }
			})
		);
		const responses = await Promise.all(reqs);
		const tooManyReqs = responses.filter((r) => r.status() === 429);
		
		// At least some requests should hit the 429 Too Many Requests rate limit
		expect(tooManyReqs.length).toBeGreaterThan(0);
	});
});
