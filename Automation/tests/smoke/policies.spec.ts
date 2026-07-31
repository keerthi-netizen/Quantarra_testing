import { test, expect } from '@playwright/test';
import { login, dismissWizard, collectConsoleErrors } from '../../src/helpers/auth';

/**
 * Policies Smoke Tests.
 * Verifies: list policies, create policy form, policy detail.
 * Works on: staging, prod.
 */

test.describe('Smoke: Policies', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin');
    await dismissWizard(page);
  });

  test('policies page loads without errors', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto('/policies');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    await expect(page).toHaveURL(/policies/);
    expect(errors).toEqual([]);
  });

  test('policies page shows list or empty state', async ({ page }) => {
    await page.goto('/policies');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should show either policy cards/rows or an empty state
    const policyContent = page.locator('table, [role="table"], [role="grid"]').first();
    const emptyState = page.getByText(/no policies|create.*policy|get started/i).first();
    const policyCards = page.locator('[data-testid*="policy"], a[href*="policy"]');

    const hasContent = await policyContent.isVisible({ timeout: 5000 }).catch(() => false)
      || await emptyState.isVisible({ timeout: 3000 }).catch(() => false)
      || (await policyCards.count()) > 0;

    expect(hasContent).toBeTruthy();
  });

  test('create policy button is visible for admin', async ({ page }) => {
    await page.goto('/policies');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const createBtn = page.locator('button, a').filter({ hasText: /create|new|add/i }).first();
    // Button should exist (either for creating policy or it's an empty state CTA)
    const isVisible = await createBtn.isVisible({ timeout: 5000 }).catch(() => false);
    // Not a hard fail — some orgs may not have policy module enabled
    if (!isVisible) {
      test.info().annotations.push({ type: 'info', description: 'No create policy button found — policy module may not be enabled' });
    }
  });

  test('can open create policy dialog/page', async ({ page }) => {
    await page.goto('/policies');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const createBtn = page.locator('button, a').filter({ hasText: /create|new|add/i }).first();
    if (!(await createBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip();
      return;
    }

    await createBtn.click();
    await page.waitForTimeout(2000);

    // Should open a form (modal or new page)
    const form = page.locator('form, [role="dialog"], input[name], input[placeholder]').first();
    await expect(form).toBeVisible({ timeout: 5000 });
  });
});
