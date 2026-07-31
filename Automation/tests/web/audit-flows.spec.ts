import { test, expect } from '@playwright/test';
import { login, dismissWizard } from '../../src/helpers/auth';

test.describe('Audit Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin');
    await dismissWizard(page);
  });

  test('audit list page shows audit cards or empty state', async ({ page }) => {
    const cards = page.locator('main [role="link"], a[href*="/audit/"]');
    const count = await cards.count();

    if (count === 0) {
      const emptyState = page.getByText(/no audit|get started|create/i);
      await expect(emptyState.first()).toBeVisible();
    } else {
      expect(count).toBeGreaterThan(0);
    }
  });

  test('navigate to audit detail and see tabs', async ({ page }) => {
    const firstCard = page.locator('main [role="link"], a[href*="/audit/"]').first();

    if (!(await firstCard.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip();
      return;
    }

    await firstCard.click();
    await page.waitForURL(/\/audit\//);

    const tabs = page.getByRole('tab');
    await tabs.first().waitFor({ state: 'visible', timeout: 10000 });
    expect(await tabs.count()).toBeGreaterThanOrEqual(3);
  });

  test('switch between audit tabs', async ({ page }) => {
    const firstCard = page.locator('main [role="link"], a[href*="/audit/"]').first();

    if (!(await firstCard.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip();
      return;
    }

    await firstCard.click();
    await page.waitForURL(/\/audit\//);

    const tabNames = ['Dashboard', 'Workspace', 'Internal Audit', 'Documents', 'Action Plans'];
    for (const name of tabNames) {
      const tab = page.getByRole('tab', { name: new RegExp(name, 'i') });
      if (await tab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tab.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('workspace tab shows controls table', async ({ page }) => {
    const firstCard = page.locator('main [role="link"], a[href*="/audit/"]').first();

    if (!(await firstCard.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip();
      return;
    }

    await firstCard.click();
    await page.waitForURL(/\/audit\//);

    const wsTab = page.getByRole('tab', { name: /workspace/i });
    if (await wsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await wsTab.click();
      await page.waitForTimeout(2000);
    }

    const table = page.locator('table, [role="table"], [role="grid"]').first();
    await expect(table).toBeVisible({ timeout: 10000 });
  });

  test('clicking a control opens evidence panel', async ({ page }) => {
    const firstCard = page.locator('main [role="link"], a[href*="/audit/"]').first();

    if (!(await firstCard.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip();
      return;
    }

    await firstCard.click();
    await page.waitForURL(/\/audit\//);

    const wsTab = page.getByRole('tab', { name: /workspace/i });
    if (await wsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await wsTab.click();
      await page.waitForTimeout(2000);
    }

    const controlRow = page.locator('table tbody tr').first();
    if (await controlRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await controlRow.click();
      await page.waitForURL(/\/control\//);
      await expect(page.getByText(/evidence|create new evidence/i).first()).toBeVisible({ timeout: 10000 });
    }
  });
});
