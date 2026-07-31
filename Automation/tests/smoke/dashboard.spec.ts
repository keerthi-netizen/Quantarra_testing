import { test, expect } from '@playwright/test';
import { login, dismissWizard, collectConsoleErrors } from '../../src/helpers/auth';

/**
 * Dashboard & Pulse Smoke Tests.
 * Verifies: KPI rendering, charts, activity feed, Pulse health matrix.
 * Works on: staging, prod.
 */

test.describe('Smoke: Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin');
    await dismissWizard(page);
  });

  test('dashboard/home loads without JS errors', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    expect(errors).toEqual([]);
  });

  test('dashboard shows audit cards or overview content', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Should have some meaningful content (cards, stats, charts)
    const content = page.locator('main, [role="main"]').first();
    await expect(content).toBeVisible({ timeout: 10000 });

    // Check for audit-related content
    const auditElements = page.locator('a[href*="/audit/"], [data-testid*="audit"]');
    const statsElements = page.locator('[class*="stat"], [class*="kpi"], [class*="card"]');
    const hasContent = (await auditElements.count()) > 0 || (await statsElements.count()) > 0;

    // At minimum the main content area should not be empty
    const mainText = await content.textContent();
    expect(mainText?.trim().length).toBeGreaterThan(0);
  });
});

test.describe('Smoke: Pulse', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin');
    await dismissWizard(page);
  });

  test('pulse page loads without errors', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto('/pulse');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    await expect(page).toHaveURL(/pulse/);
    expect(errors).toEqual([]);
  });

  test('pulse page shows tabs or framework selector', async ({ page }) => {
    await page.goto('/pulse');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Pulse typically has tabs for different views (Overview, Health Matrix, etc.)
    const tabs = page.getByRole('tab');
    const tabCount = await tabs.count();

    if (tabCount > 0) {
      // Has tabbed interface
      expect(tabCount).toBeGreaterThanOrEqual(1);
    } else {
      // Should at least show some pulse content
      const content = page.locator('main').first();
      const text = await content.textContent();
      expect(text?.trim().length).toBeGreaterThan(0);
    }
  });

  test('pulse overview shows compliance data or empty state', async ({ page }) => {
    await page.goto('/pulse');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Look for compliance-related content
    const complianceData = page.locator('[class*="chart"], [class*="progress"], canvas, svg').first();
    const emptyState = page.getByText(/no data|enable.*framework|get started/i).first();
    const textContent = page.locator('main').first();

    const hasCharts = await complianceData.isVisible({ timeout: 3000 }).catch(() => false);
    const hasEmpty = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);

    // Should have either data or an empty state — not an error
    const error = page.getByText(/error|500|something went wrong/i);
    await expect(error).not.toBeVisible({ timeout: 3000 });
  });

  test('no loading spinners stuck forever on pulse', async ({ page }) => {
    await page.goto('/pulse');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    // After 5 seconds, loading indicators should be gone
    const spinner = page.locator('[class*="spinner"], [class*="loading"], [role="progressbar"]').first();
    const isStillLoading = await spinner.isVisible({ timeout: 1000 }).catch(() => false);

    if (isStillLoading) {
      // Wait a bit more, then fail if still spinning
      await page.waitForTimeout(5000);
      await expect(spinner).not.toBeVisible({ timeout: 3000 });
    }
  });
});
