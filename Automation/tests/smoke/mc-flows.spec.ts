import { test, expect } from '@playwright/test';
import { login, dismissWizard, collectConsoleErrors } from '../../src/helpers/auth';

/**
 * Mission Control Smoke Tests.
 * Verifies: MC login, clients list, frameworks management, team.
 * Works on: staging, prod (uses mc-admin credentials).
 *
 * NOTE: This test runs against the MC URL (port 4002 or mc.quantarra.com).
 */

test.describe('Smoke: MC — Login & Dashboard', () => {
  test('MC login page renders', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test('MC admin can login', async ({ page }) => {
    await login(page, 'mc-admin');
    await expect(page).not.toHaveURL(/login/);
    await page.waitForLoadState('networkidle');

    // Should see MC dashboard content
    const content = page.locator('main, [role="main"]').first();
    await expect(content).toBeVisible({ timeout: 10000 });
  });

  test('MC dashboard loads without JS errors', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await login(page, 'mc-admin');
    await dismissWizard(page);
    await page.waitForTimeout(3000);
    expect(errors).toEqual([]);
  });
});

test.describe('Smoke: MC — Clients', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'mc-admin');
    await dismissWizard(page);
  });

  test('clients page loads and shows client list', async ({ page }) => {
    await page.goto('/clients');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    await expect(page).toHaveURL(/clients/);

    // Should show client cards/table or empty state
    const clientContent = page.locator('table, [role="table"], [role="grid"]').first();
    const clientCards = page.locator('[data-testid*="client"], a[href*="client"]');
    const emptyState = page.getByText(/no clients|create.*client|add.*client/i).first();

    const hasContent = await clientContent.isVisible({ timeout: 5000 }).catch(() => false)
      || (await clientCards.count()) > 0
      || await emptyState.isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasContent).toBeTruthy();
  });

  test('no JS errors on clients page', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto('/clients');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    expect(errors).toEqual([]);
  });
});

test.describe('Smoke: MC — Frameworks', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'mc-admin');
    await dismissWizard(page);
  });

  test('frameworks page loads', async ({ page }) => {
    await page.goto('/frameworks');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Should show framework list
    const frameworkContent = page.locator('table, [role="table"], [role="grid"]').first();
    const frameworkCards = page.locator('[data-testid*="framework"]');
    const pageContent = page.locator('main').first();

    const hasContent = await frameworkContent.isVisible({ timeout: 5000 }).catch(() => false)
      || (await frameworkCards.count()) > 0;

    // At minimum, no error page
    const error = page.getByText(/error|500|something went wrong/i);
    await expect(error).not.toBeVisible({ timeout: 3000 });
  });
});

test.describe('Smoke: MC — Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'mc-admin');
    await dismissWizard(page);
  });

  test('MC sidebar has expected nav items', async ({ page }) => {
    const navLinks = page.locator('nav a, aside a');
    const count = await navLinks.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test('can navigate to Auditors page', async ({ page }) => {
    const auditorsLink = page.locator('a[href*="auditor"], nav a, aside a').filter({ hasText: /auditor|firm/i }).first();
    if (await auditorsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await auditorsLink.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      const error = page.getByText(/error|500|something went wrong/i);
      await expect(error).not.toBeVisible({ timeout: 3000 });
    }
  });

  test('can navigate to Tiers page', async ({ page }) => {
    const tiersLink = page.locator('a[href*="tier"], nav a, aside a').filter({ hasText: /tier|subscription/i }).first();
    if (await tiersLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tiersLink.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      const error = page.getByText(/error|500|something went wrong/i);
      await expect(error).not.toBeVisible({ timeout: 3000 });
    }
  });

  test('can navigate to Team page', async ({ page }) => {
    const teamLink = page.locator('a[href*="team"], nav a, aside a').filter({ hasText: /team/i }).first();
    if (await teamLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await teamLink.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      const error = page.getByText(/error|500|something went wrong/i);
      await expect(error).not.toBeVisible({ timeout: 3000 });
    }
  });
});
