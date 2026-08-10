import { test, expect } from '@playwright/test';
import { dismissWizard } from '../../src/helpers/auth';
import { getShakeoutAdmin, getShakeoutContributor } from './test-data';
import { getEnvConfig } from '../../src/config/environment';

/**
 * Daily Shakeout — TG-2, TG-3, TG-4: Navigation Verification
 *
 * TG-2: Admin login → "Create new" + Admin dropdown visible, workspace pages load
 * TG-3: Contributor login → restricted tabs NOT visible
 * TG-4: Admin tab sub-pages all load without error
 */

test.describe('TG-2: Admin Navigation — Workspace Pages', () => {

  test('Admin login — "Create new" button and Admin dropdown visible', async ({ page }) => {
    const admin = getShakeoutAdmin();
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="email"], input[name="email"]').first().fill(admin.email);
    await page.locator('input[type="password"]').first().fill(admin.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    await dismissWizard(page);

    // "Create new" button visible
    const createNewBtn = page.locator('button[aria-label="Create new"]');
    await expect(createNewBtn).toBeVisible({ timeout: 10000 });

    // Admin dropdown visible in sidebar
    const adminBtn = page.locator('aside button, nav button').filter({ hasText: /^Admin$/ }).first();
    await expect(adminBtn).toBeVisible({ timeout: 5000 });
  });

  test('Workspace pages load — Audit Groups, Pulse, Policies', async ({ page }) => {
    const admin = getShakeoutAdmin();
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="email"], input[name="email"]').first().fill(admin.email);
    await page.locator('input[type="password"]').first().fill(admin.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    await dismissWizard(page);

    // Audit Groups page loads
    await page.goto('/audit-groups');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    // Verify page loaded without error (not a 500 or crash)
    const auditGroupsError = page.getByText(/error|500|something went wrong/i);
    await expect(auditGroupsError).not.toBeVisible({ timeout: 3000 });

    // Pulse page loads
    await page.goto('/pulse');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    const activeAuditsText = page.getByText(/active audit/i).first();
    await expect(activeAuditsText).toBeVisible({ timeout: 5000 });

    // Policies page loads
    await page.goto('/policies');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const createPolicyBtn = page.locator('button').filter({ hasText: /create.*policy|new.*policy/i }).first();
    await expect(createPolicyBtn).toBeVisible({ timeout: 5000 });
  });
});

test.describe('TG-3: Contributor Navigation — Restricted Access', () => {

  test('Contributor login — Admin, Policies, Pulse, Integrations NOT visible', async ({ page }) => {
    const contributor = getShakeoutContributor();
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="email"], input[name="email"]').first().fill(contributor.email);
    await page.locator('input[type="password"]').first().fill(contributor.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    await dismissWizard(page);

    // Admin tab should NOT be visible
    const adminBtn = page.locator('aside button, nav button').filter({ hasText: /^Admin$/ });
    await expect(adminBtn).not.toBeVisible({ timeout: 5000 });

    // Policies link should NOT be visible
    const policyLink = page.locator('a[href="/policies"]');
    await expect(policyLink).not.toBeVisible({ timeout: 3000 });

    // Pulse link should NOT be visible
    const pulseLink = page.locator('a[href="/pulse"]');
    await expect(pulseLink).not.toBeVisible({ timeout: 3000 });

    // Integrations link should NOT be visible
    const intLink = page.locator('a[href="/integrations"]');
    await expect(intLink).not.toBeVisible({ timeout: 3000 });
  });
});

test.describe('TG-4: Admin Tab — Sub-Pages Load', () => {

  test('All Admin sub-tabs load without errors', async ({ page }) => {
    const admin = getShakeoutAdmin();
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="email"], input[name="email"]').first().fill(admin.email);
    await page.locator('input[type="password"]').first().fill(admin.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    await dismissWizard(page);

    const errorText = page.getByText(/error|500|something went wrong/i);

    // Users tab
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const addUserBtn = page.locator('button').filter({ hasText: /add user|invite/i }).first();
    await expect(addUserBtn).toBeVisible({ timeout: 5000 });

    // Roles tab
    await page.goto('/admin/roles');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const createRoleBtn = page.locator('button').filter({ hasText: /create.*role|new.*role/i }).first();
    await expect(createRoleBtn).toBeVisible({ timeout: 5000 });

    // Integrations tab
    await page.goto('/admin/integrations');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(errorText).not.toBeVisible({ timeout: 3000 });

    // Features tab
    await page.goto('/admin/features');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(errorText).not.toBeVisible({ timeout: 3000 });

    // Activity tab
    await page.goto('/admin/activity');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(errorText).not.toBeVisible({ timeout: 3000 });

    // Organization tab
    await page.goto('/admin/organization');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(errorText).not.toBeVisible({ timeout: 3000 });
  });
});
