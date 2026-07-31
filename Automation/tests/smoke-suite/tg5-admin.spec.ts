import { test, expect } from '@playwright/test';
import { dismissWizard } from '../../src/helpers/auth';
import { getSmokeAdmin } from './test-data';

/**
 * TG-5: Admin Tab — Sub-tabs loading
 * Source: New_testcase.xlsx → TC-11 to TC-16
 *
 * Admin sub-nav links (from DOM inspection):
 *   /admin          → Users
 *   /admin/roles    → Roles
 *   /admin/frameworks → Frameworks
 *   /admin/business-units → Business Units
 *   /admin/integrations → Integrations
 *   /admin/features → Features
 *   /admin/api-keys → API Keys
 *   /admin/activity → Activity Log
 *   /admin/organization → Organization
 *   /admin/sso → SSO
 */

test.describe('TG-5: Admin Tab', () => {
  test('TC-11 to TC-16: All Admin sub-tabs load correctly', async ({ page }) => {
    const admin = getSmokeAdmin();

    // Login once
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="email"], input[name="email"]').first().fill(admin.email);
    await page.locator('input[type="password"]').first().fill(admin.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    await dismissWizard(page);

    // Open Admin section in sidebar
    const adminBtn = page.locator('aside button, nav button').filter({ hasText: /^Admin$/ }).first();
    await adminBtn.click();
    await page.waitForTimeout(1000);

    // TC-11: Users tab — "+ Add user" button visible
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const addUserBtn = page.locator('button').filter({ hasText: /add user|invite/i }).first();
    await expect(addUserBtn).toBeVisible({ timeout: 5000 });

    // TC-12: Roles tab — "+ Create new role" button visible
    await page.goto('/admin/roles');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const createRoleBtn = page.locator('button').filter({ hasText: /create.*role|new.*role/i }).first();
    await expect(createRoleBtn).toBeVisible({ timeout: 5000 });

    // TC-13: Integrations tab — loads without error
    await page.goto('/admin/integrations');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const error = page.getByText(/error|500|something went wrong/i);
    await expect(error).not.toBeVisible({ timeout: 3000 });

    // TC-14: Features tab — loads without error
    await page.goto('/admin/features');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(error).not.toBeVisible({ timeout: 3000 });

    // TC-15: Activity tab — loads without error
    await page.goto('/admin/activity');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(error).not.toBeVisible({ timeout: 3000 });

    // TC-16: Organization tab — loads without error
    await page.goto('/admin/organization');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(error).not.toBeVisible({ timeout: 3000 });
  });
});
