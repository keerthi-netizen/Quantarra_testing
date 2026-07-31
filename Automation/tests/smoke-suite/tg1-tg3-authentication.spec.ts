import { test, expect } from '@playwright/test';
import { dismissWizard } from '../../src/helpers/auth';
import { getSmokeAdmin, getSmokeContributor } from './test-data';

/**
 * TG-1: Invalid Credentials
 * TG-2: Valid Admin Login + Navigation Checks (TC-2, TC-3)
 * TG-3: Contributor RBAC (TC-4)
 *
 * Source: New_testcase.xlsx — updated structure
 */

test.describe('TG-1: Invalid Credentials', () => {
  test('TC-1: Login with Admin user and Incorrect Password — stays on login page', async ({ page }) => {
    const admin = getSmokeAdmin();

    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="email"], input[name="email"]').first().fill(admin.email);
    await page.locator('input[type="password"]').first().fill('WrongPassword123!');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(3000);

    await expect(page).toHaveURL(/login/);
  });
});

test.describe('TG-2: Valid Admin Login + Navigation', () => {
  test('TC-2: Admin login — home page loads with "Create new" button + Admin dropdown visible', async ({ page }) => {
    const admin = getSmokeAdmin();

    // Step 1: Login
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="email"], input[name="email"]').first().fill(admin.email);
    await page.locator('input[type="password"]').first().fill(admin.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    await dismissWizard(page);

    // Step 1 validation: "Create new" button (aria-label="Create new") is visible
    const createNewBtn = page.locator('button[aria-label="Create new"]');
    await expect(createNewBtn).toBeVisible({ timeout: 10000 });

    // Step 2: Admin dropdown button visible in sidebar
    const adminBtn = page.locator('aside button, nav button').filter({ hasText: /^Admin$/ }).first();
    await expect(adminBtn).toBeVisible({ timeout: 5000 });
  });

  test('TC-3 Step 1: Sidebar toggle — close and restore navigation bar', async ({ page }) => {
    const admin = getSmokeAdmin();
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="email"], input[name="email"]').first().fill(admin.email);
    await page.locator('input[type="password"]').first().fill(admin.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    await dismissWizard(page);

    // Toggle navigation menu button (hamburger in header)
    const toggleBtn = page.locator('button[aria-label="Toggle navigation menu"]');
    await expect(toggleBtn).toBeVisible({ timeout: 5000 });

    // Close sidebar
    await toggleBtn.click();
    await page.waitForTimeout(500);

    // Restore sidebar
    await toggleBtn.click();
    await page.waitForTimeout(500);

    // Sidebar should be visible
    const sidebar = page.locator('aside').first();
    await expect(sidebar).toBeVisible();
  });

  test('TC-3 Step 2: Homepage loads — URL does not contain /login', async ({ page }) => {
    const admin = getSmokeAdmin();
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="email"], input[name="email"]').first().fill(admin.email);
    await page.locator('input[type="password"]').first().fill(admin.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    await dismissWizard(page);

    expect(page.url()).not.toContain('/login');
  });

  test('TC-3 Step 3: Audit Groups — "+ new group" button visible and active', async ({ page }) => {
    const admin = getSmokeAdmin();
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="email"], input[name="email"]').first().fill(admin.email);
    await page.locator('input[type="password"]').first().fill(admin.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    await dismissWizard(page);

    await page.goto('/audit-groups');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const newGroupBtn = page.locator('button').filter({ hasText: /new group/i }).first();
    await expect(newGroupBtn).toBeVisible({ timeout: 5000 });
    await expect(newGroupBtn).toBeEnabled();
  });

  test('TC-3 Step 4: Pulse — "Active audits" tile visible', async ({ page }) => {
    const admin = getSmokeAdmin();
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="email"], input[name="email"]').first().fill(admin.email);
    await page.locator('input[type="password"]').first().fill(admin.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    await dismissWizard(page);

    await page.goto('/pulse');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const activeAuditsText = page.getByText(/active audit/i).first();
    await expect(activeAuditsText).toBeVisible({ timeout: 5000 });
  });

  test('TC-3 Step 5: Policies — "+ Create new policy" button visible and active', async ({ page }) => {
    const admin = getSmokeAdmin();
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="email"], input[name="email"]').first().fill(admin.email);
    await page.locator('input[type="password"]').first().fill(admin.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    await dismissWizard(page);

    await page.goto('/policies');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const createPolicyBtn = page.locator('button').filter({ hasText: /create.*policy|new.*policy/i }).first();
    await expect(createPolicyBtn).toBeVisible({ timeout: 5000 });
    await expect(createPolicyBtn).toBeEnabled();
  });

  test('TC-3 Step 6: Integrations — Google Drive shows "Connected" status', async ({ page }) => {
    const admin = getSmokeAdmin();
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="email"], input[name="email"]').first().fill(admin.email);
    await page.locator('input[type="password"]').first().fill(admin.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    await dismissWizard(page);

    await page.goto('/integrations');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Google Drive must be visible
    const googleDrive = page.getByText(/google drive/i).first();
    await expect(googleDrive).toBeVisible({ timeout: 5000 });

    // Must show "Connected" (not "Connect")
    const connectedBtn = page.locator('button').filter({ hasText: /^Connected$/ }).first();
    await expect(connectedBtn).toBeVisible({ timeout: 5000 });
  });
});

test.describe('TG-3: Contributor RBAC', () => {
  test('TC-4: Contributor login — restricted tabs NOT visible', async ({ page }) => {
    const contributor = getSmokeContributor();

    // Step 1: Login with Contributor
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="email"], input[name="email"]').first().fill(contributor.email);
    await page.locator('input[type="password"]').first().fill(contributor.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    await dismissWizard(page);

    // Step 2: Admin option should NOT be visible
    const adminBtn = page.locator('aside button, nav button').filter({ hasText: /^Admin$/ });
    await expect(adminBtn).not.toBeVisible({ timeout: 5000 });

    // Step 3: Policies tab (href="/policies") should NOT be visible
    // Note: "Policy to Control Analyzer" (href="/policy-analyzer") is different — not checking that
    const policyLink = page.locator('a[href="/policies"]');
    await expect(policyLink).not.toBeVisible({ timeout: 3000 });

    // Step 4: Pulse tab should NOT be visible
    const pulseLink = page.locator('a[href="/pulse"]');
    await expect(pulseLink).not.toBeVisible({ timeout: 3000 });

    // Step 5: Integrations tab should NOT be visible
    const intLink = page.locator('a[href="/integrations"]');
    await expect(intLink).not.toBeVisible({ timeout: 3000 });
  });
});
