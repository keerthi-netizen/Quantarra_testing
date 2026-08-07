import { test, expect } from './base-fixture';
import { dismissWizard } from '../../src/helpers/auth';
import { getSmokeAdmin, getSmokeContributor } from './test-data';

/**
 * Scenario 1: Authentication Flow (TG-1, TG-2)
 * Scenario 2: Navigation - Workspace - Admin User (TG-2 TC-3)
 * Scenario 3: Navigation - Workspace - Contributor User (TG-3 TC-4)
 *
 * Source: New_testcase.xlsx — Sheet 1
 */

// =============================================
// SCENARIO 1: Authentication Flow
// =============================================
test.describe('Scenario 1: Authentication Flow', () => {

  test('TG-1 TC-1: Invalid credentials — stays on login page', async ({ page }) => {
    const admin = getSmokeAdmin();
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="email"], input[name="email"]').first().fill(admin.email);
    await page.locator('input[type="password"]').first().fill('WrongPassword123!');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/login/);
  });

  test('TG-2 TC-2: Admin login — "Create new" button + Admin dropdown visible', async ({ page }) => {
    const admin = getSmokeAdmin();
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="email"], input[name="email"]').first().fill(admin.email);
    await page.locator('input[type="password"]').first().fill(admin.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    await dismissWizard(page);

    // Step 1: "Create new" button visible
    const createNewBtn = page.locator('button[aria-label="Create new"]');
    await expect(createNewBtn).toBeVisible({ timeout: 10000 });

    // Step 2: Admin dropdown button visible in sidebar
    const adminBtn = page.locator('aside button, nav button').filter({ hasText: /^Admin$/ }).first();
    await expect(adminBtn).toBeVisible({ timeout: 5000 });
  });
});

// =============================================
// SCENARIO 2: Navigation - Workspace - Admin User
// =============================================
test.describe('Scenario 2: Navigation - Workspace - Admin User', () => {

  test('TG-2 TC-3: Sidebar + all pages load correctly', async ({ page }) => {
    const admin = getSmokeAdmin();
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="email"], input[name="email"]').first().fill(admin.email);
    await page.locator('input[type="password"]').first().fill(admin.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    await dismissWizard(page);

    // Step 1: Close and restore navigation bar
    const hamburgerBtn = page.locator('button[aria-label="Toggle navigation menu"]');
    await expect(hamburgerBtn).toBeVisible({ timeout: 5000 });
    await hamburgerBtn.click();
    await page.waitForTimeout(500);
    await hamburgerBtn.click();
    await page.waitForTimeout(500);

    // Step 2: Homepage — URL does not contain /login
    expect(page.url()).not.toContain('/login');

    // Step 3: Audit Groups — "+ new group" button visible and active
    await page.goto('/audit-groups');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const newGroupBtn = page.locator('button').filter({ hasText: /new group/i }).first();
    await expect(newGroupBtn).toBeVisible({ timeout: 5000 });
    await expect(newGroupBtn).toBeEnabled();

    // Step 4: Pulse — "Active audits" tile visible
    await page.goto('/pulse');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    const activeAuditsText = page.getByText(/active audit/i).first();
    await expect(activeAuditsText).toBeVisible({ timeout: 5000 });

    // Step 5: Policies — "+ Create new policy" button visible and active
    await page.goto('/policies');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const createPolicyBtn = page.locator('button').filter({ hasText: /create.*policy|new.*policy/i }).first();
    await expect(createPolicyBtn).toBeVisible({ timeout: 5000 });
    await expect(createPolicyBtn).toBeEnabled();

    // Step 6: Integrations — Google Drive shows "Connected" status
    await page.goto('/integrations');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    const googleDrive = page.getByText(/google drive/i).first();
    await expect(googleDrive).toBeVisible({ timeout: 5000 });
    const connectedBtn = page.locator('button').filter({ hasText: /^Connected$/ }).first();
    await expect(connectedBtn).toBeVisible({ timeout: 5000 });
  });
});

// =============================================
// SCENARIO 3: Navigation - Workspace - Contributor User
// =============================================
test.describe('Scenario 3: Navigation - Workspace - Contributor User', () => {

  test('TG-3 TC-4: Contributor login — restricted tabs NOT visible', async ({ page }) => {
    const contributor = getSmokeContributor();
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="email"], input[name="email"]').first().fill(contributor.email);
    await page.locator('input[type="password"]').first().fill(contributor.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    await dismissWizard(page);

    // Step 2: Admin should NOT be visible
    const adminBtn = page.locator('aside button, nav button').filter({ hasText: /^Admin$/ });
    await expect(adminBtn).not.toBeVisible({ timeout: 5000 });

    // Step 3: Policies (/policies) should NOT be visible
    const policyLink = page.locator('a[href="/policies"]');
    await expect(policyLink).not.toBeVisible({ timeout: 3000 });

    // Step 4: Pulse should NOT be visible
    const pulseLink = page.locator('a[href="/pulse"]');
    await expect(pulseLink).not.toBeVisible({ timeout: 3000 });

    // Step 5: Integrations should NOT be visible
    const intLink = page.locator('a[href="/integrations"]');
    await expect(intLink).not.toBeVisible({ timeout: 3000 });
  });
});
