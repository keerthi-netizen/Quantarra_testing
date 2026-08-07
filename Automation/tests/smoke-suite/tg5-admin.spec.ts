import { test, expect } from './base-fixture';
import { dismissWizard } from '../../src/helpers/auth';
import { getSmokeAdmin } from './test-data';

/**
 * Scenario 4: Navigation - Admin Tab - Login with Admin User
 * Source: New_testcase.xlsx → TG-4 TC-1 (Steps 1-6)
 */

test.describe('Scenario 4: Navigation - Admin Tab', () => {

  test('TG-4 TC-1: All Admin sub-tabs load correctly', async ({ page }) => {
    const admin = getSmokeAdmin();

    // Login once
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="email"], input[name="email"]').first().fill(admin.email);
    await page.locator('input[type="password"]').first().fill(admin.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    await dismissWizard(page);

    // Open Admin section
    const adminBtn = page.locator('aside button, nav button').filter({ hasText: /^Admin$/ }).first();
    await adminBtn.click();
    await page.waitForTimeout(1000);

    // Step 1: Users tab — "+ Add user" button visible
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const addUserBtn = page.locator('button').filter({ hasText: /add user|invite/i }).first();
    await expect(addUserBtn).toBeVisible({ timeout: 5000 });

    // Step 2: Roles tab — "+ Create new role" button visible
    await page.goto('/admin/roles');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const createRoleBtn = page.locator('button').filter({ hasText: /create.*role|new.*role/i }).first();
    await expect(createRoleBtn).toBeVisible({ timeout: 5000 });

    // Step 3: Integrations tab — loads without error
    await page.goto('/admin/integrations');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const error = page.getByText(/error|500|something went wrong/i);
    await expect(error).not.toBeVisible({ timeout: 3000 });

    // Step 4: Features tab — loads without error
    await page.goto('/admin/features');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(error).not.toBeVisible({ timeout: 3000 });

    // Step 5: Activity tab — loads without error
    await page.goto('/admin/activity');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(error).not.toBeVisible({ timeout: 3000 });

    // Step 6: Organization tab — loads without error
    await page.goto('/admin/organization');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(error).not.toBeVisible({ timeout: 3000 });
  });
});
