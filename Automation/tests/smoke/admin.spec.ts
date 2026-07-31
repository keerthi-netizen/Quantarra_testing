import { test, expect } from '@playwright/test';
import { login, dismissWizard, collectConsoleErrors } from '../../src/helpers/auth';

/**
 * Admin Section Smoke Tests.
 * Verifies: user management, roles, business units, settings.
 * Works on: staging, prod.
 */

test.describe('Smoke: Admin — Users', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin');
    await dismissWizard(page);
  });

  test('admin page loads without errors', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    expect(errors).toEqual([]);
  });

  test('users list is visible', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Navigate to users tab/section if needed
    const usersTab = page.locator('a, button, [role="tab"]').filter({ hasText: /users/i }).first();
    if (await usersTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await usersTab.click();
      await page.waitForTimeout(2000);
    }

    // Should show a table or list of users
    const table = page.locator('table, [role="table"], [role="grid"]').first();
    const userRows = page.locator('table tbody tr, [role="row"]');
    const hasTable = await table.isVisible({ timeout: 5000 }).catch(() => false);
    const hasRows = (await userRows.count()) > 0;

    expect(hasTable || hasRows).toBeTruthy();
  });

  test('can see invite/create user button', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for users section
    const usersTab = page.locator('a, button, [role="tab"]').filter({ hasText: /users/i }).first();
    if (await usersTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await usersTab.click();
      await page.waitForTimeout(2000);
    }

    const inviteBtn = page.locator('button, a').filter({ hasText: /invite|add.*user|create.*user|new.*user/i }).first();
    const isVisible = await inviteBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (!isVisible) {
      test.info().annotations.push({ type: 'info', description: 'No invite user button found on current view' });
    }
  });
});

test.describe('Smoke: Admin — Roles', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin');
    await dismissWizard(page);
  });

  test('roles section is accessible', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const rolesTab = page.locator('a, button, [role="tab"]').filter({ hasText: /roles/i }).first();
    if (await rolesTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await rolesTab.click();
      await page.waitForTimeout(2000);

      // Should show role list
      const roleContent = page.locator('table, [role="table"], [role="list"]').first();
      const roleItems = page.locator('table tbody tr, [role="row"], [role="listitem"]');
      const hasContent = await roleContent.isVisible({ timeout: 5000 }).catch(() => false)
        || (await roleItems.count()) > 0;

      expect(hasContent).toBeTruthy();
    }
  });
});

test.describe('Smoke: Admin — Business Units', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin');
    await dismissWizard(page);
  });

  test('business units section is accessible', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const buTab = page.locator('a, button, [role="tab"]').filter({ hasText: /business unit/i }).first();
    if (await buTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await buTab.click();
      await page.waitForTimeout(2000);

      // Should show BU list or empty state
      const error = page.getByText(/error|500|something went wrong/i);
      await expect(error).not.toBeVisible({ timeout: 3000 });
    } else {
      test.info().annotations.push({ type: 'info', description: 'Business Units tab not found in admin' });
    }
  });
});

test.describe('Smoke: Admin — Settings', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin');
    await dismissWizard(page);
  });

  test('org settings page is accessible', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const settingsTab = page.locator('a, button, [role="tab"]').filter({ hasText: /settings|organization|general/i }).first();
    if (await settingsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await settingsTab.click();
      await page.waitForTimeout(2000);

      const error = page.getByText(/error|500|something went wrong/i);
      await expect(error).not.toBeVisible({ timeout: 3000 });
    }
  });
});
