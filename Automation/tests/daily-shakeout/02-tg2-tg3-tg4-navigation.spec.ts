import { test, expect } from '@playwright/test';
import { dismissWizard } from '../../src/helpers/auth';
import { getShakeoutAdmin, getShakeoutContributor } from './test-data';
import { getEnvConfig } from '../../src/config/environment';
import { shouldRun } from './excel-filter';
import { getAdminSessionPath, getContributorSessionPath, checkGate } from './session-setup';

/**
 * Daily Shakeout — TG-2, TG-3, TG-4: Navigation Verification
 *
 * TG-2: Admin login → "Create new" + Admin dropdown visible, workspace pages load
 * TG-3: Contributor login → restricted tabs NOT visible
 * TG-4: Admin tab sub-pages all load without error
 *
 * Session strategy: Login ONCE per test group (describe block), reuse via storageState.
 * Total logins for this file: 0 (sessions created in 00-auth-setup).
 *
 * Wait strategy: Explicit waits only (up to 30s). No hard sleeps.
 * Tests progress as soon as the element appears.
 */

test.describe('TG-2: Admin Navigation — Workspace Pages', () => {
  test.use({ storageState: getAdminSessionPath() });

  test.beforeEach(({}, testInfo) => {
    const gateReason = checkGate();
    if (gateReason) {
      testInfo.skip(true, gateReason);
    }
  });

  test('Admin login — "Create new" button and Admin dropdown visible', async ({ page }) => {
    test.skip(!shouldRun('TG-2', 'Scenario 1', 'TC-2'), 'Excluded by Excel — Run Shakeout = No');

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dismissWizard(page);

    const createNewBtn = page.locator('button[aria-label="Create new"]');
    await expect(createNewBtn).toBeVisible({ timeout: 30000 });

    const adminBtn = page.locator('aside button, nav button').filter({ hasText: /^Admin$/ }).first();
    await expect(adminBtn).toBeVisible({ timeout: 30000 });
  });

  test('Workspace — Homepage loads with audit tiles', async ({ page }) => {
    test.skip(!shouldRun('TG-2', 'Scenario 2', 'TC-2'), 'Excluded by Excel — Run Shakeout = No');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const auditLinks = page.locator('a[href*="/audit/"]').first();
    await expect(auditLinks).toBeVisible({ timeout: 30000 });
    const count = await page.locator('a[href*="/audit/"]').count();
    expect(count).toBeGreaterThan(0);
  });

  test('Workspace — Audit Groups page loads', async ({ page }) => {
    test.skip(!shouldRun('TG-2', 'Scenario 2', 'TC-3'), 'Excluded by Excel — Run Shakeout = No');

    await page.goto('/audit-groups');
    await page.waitForLoadState('networkidle');

    // Wait for page content to render (main area visible)
    await expect(page.locator('main').first()).toBeVisible({ timeout: 30000 });
    const auditGroupsError = page.getByText(/error|500|something went wrong/i);
    await expect(auditGroupsError).not.toBeVisible({ timeout: 3000 });
  });

  test('Workspace — Pulse page loads with Active audits', async ({ page }) => {
    test.skip(!shouldRun('TG-2', 'Scenario 2', 'TC-4'), 'Excluded by Excel — Run Shakeout = No');

    await page.goto('/pulse');
    await page.waitForLoadState('networkidle');

    const activeAuditsText = page.getByText(/active audit/i).first();
    await expect(activeAuditsText).toBeVisible({ timeout: 30000 });
  });

  test('Workspace — Policies page loads', async ({ page }) => {
    test.skip(!shouldRun('TG-2', 'Scenario 2', 'TC-5'), 'Excluded by Excel — Run Shakeout = No');

    await page.goto('/policies');
    await page.waitForLoadState('networkidle');

    const createPolicyBtn = page.locator('button').filter({ hasText: /create.*policy|new.*policy/i }).first();
    await expect(createPolicyBtn).toBeVisible({ timeout: 30000 });
  });

  test('Workspace — Integrations page loads', async ({ page }) => {
    test.skip(!shouldRun('TG-2', 'Scenario 2', 'TC-6'), 'Excluded by Excel — Run Shakeout = No');

    await page.goto('/integrations');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('main').first()).toBeVisible({ timeout: 30000 });
    const errorText = page.getByText(/error|500|something went wrong/i);
    await expect(errorText).not.toBeVisible({ timeout: 3000 });
  });
});

test.describe('TG-3: Contributor Navigation — Restricted Access', () => {
  test.use({ storageState: getContributorSessionPath() });

  test.beforeEach(({}, testInfo) => {
    const gateReason = checkGate();
    if (gateReason) {
      testInfo.skip(true, gateReason);
    }
  });

  test('Contributor login — Admin not visible', async ({ page }) => {
    test.skip(!shouldRun('TG-3', 'Scenario 3', 'TC-2'), 'Excluded by Excel — Run Shakeout = No');

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dismissWizard(page);

    // Wait for sidebar to render before asserting absence
    await expect(page.locator('aside, nav').first()).toBeVisible({ timeout: 30000 });
    const adminBtn = page.locator('aside button, nav button').filter({ hasText: /^Admin$/ });
    await expect(adminBtn).not.toBeVisible({ timeout: 5000 });
  });

  test('Contributor — Policy tab not visible', async ({ page }) => {
    test.skip(!shouldRun('TG-3', 'Scenario 3', 'TC-3'), 'Excluded by Excel — Run Shakeout = No');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('aside, nav').first()).toBeVisible({ timeout: 30000 });
    const policyLink = page.locator('a[href="/policies"]');
    await expect(policyLink).not.toBeVisible({ timeout: 5000 });
  });

  test('Contributor — Pulse tab not visible', async ({ page }) => {
    test.skip(!shouldRun('TG-3', 'Scenario 3', 'TC-4'), 'Excluded by Excel — Run Shakeout = No');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('aside, nav').first()).toBeVisible({ timeout: 30000 });
    const pulseLink = page.locator('a[href="/pulse"]');
    await expect(pulseLink).not.toBeVisible({ timeout: 5000 });
  });

  test('Contributor — Integrations not visible', async ({ page }) => {
    test.skip(!shouldRun('TG-3', 'Scenario 3', 'TC-5'), 'Excluded by Excel — Run Shakeout = No');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('aside, nav').first()).toBeVisible({ timeout: 30000 });
    const intLink = page.locator('a[href="/integrations"]');
    await expect(intLink).not.toBeVisible({ timeout: 5000 });
  });
});

test.describe('TG-4: Admin Tab — Sub-Pages Load', () => {
  test.use({ storageState: getAdminSessionPath() });

  test.beforeEach(({}, testInfo) => {
    const gateReason = checkGate();
    if (gateReason) {
      testInfo.skip(true, gateReason);
    }
  });

  test('Admin — Users tab loads', async ({ page }) => {
    test.skip(!shouldRun('TG-4', 'Scenario 4', 'TC-1'), 'Excluded by Excel — Run Shakeout = No');

    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    const addUserBtn = page.locator('button').filter({ hasText: /add user|invite/i }).first();
    await expect(addUserBtn).toBeVisible({ timeout: 30000 });
  });

  test('Admin — Roles tab loads', async ({ page }) => {
    test.skip(!shouldRun('TG-4', 'Scenario 4', 'TC-2'), 'Excluded by Excel — Run Shakeout = No');

    await page.goto('/admin/roles');
    await page.waitForLoadState('networkidle');

    const createRoleBtn = page.locator('button').filter({ hasText: /create.*role|new.*role/i }).first();
    await expect(createRoleBtn).toBeVisible({ timeout: 30000 });
  });

  test('Admin — Integrations tab loads', async ({ page }) => {
    test.skip(!shouldRun('TG-4', 'Scenario 4', 'TC-3'), 'Excluded by Excel — Run Shakeout = No');

    await page.goto('/admin/integrations');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('main').first()).toBeVisible({ timeout: 30000 });
    const errorText = page.getByText(/error|500|something went wrong/i);
    await expect(errorText).not.toBeVisible({ timeout: 3000 });
  });

  test('Admin — Features tab loads', async ({ page }) => {
    test.skip(!shouldRun('TG-4', 'Scenario 4', 'TC-4'), 'Excluded by Excel — Run Shakeout = No');

    await page.goto('/admin/features');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('main').first()).toBeVisible({ timeout: 30000 });
    const errorText = page.getByText(/error|500|something went wrong/i);
    await expect(errorText).not.toBeVisible({ timeout: 3000 });
  });

  test('Admin — Activity tab loads', async ({ page }) => {
    test.skip(!shouldRun('TG-4', 'Scenario 4', 'TC-5'), 'Excluded by Excel — Run Shakeout = No');

    await page.goto('/admin/activity');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('main').first()).toBeVisible({ timeout: 30000 });
    const errorText = page.getByText(/error|500|something went wrong/i);
    await expect(errorText).not.toBeVisible({ timeout: 3000 });
  });

  test('Admin — Organization tab loads', async ({ page }) => {
    test.skip(!shouldRun('TG-4', 'Scenario 4', 'TC-6'), 'Excluded by Excel — Run Shakeout = No');

    await page.goto('/admin/organization');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('main').first()).toBeVisible({ timeout: 30000 });
    const errorText = page.getByText(/error|500|something went wrong/i);
    await expect(errorText).not.toBeVisible({ timeout: 3000 });
  });
});
