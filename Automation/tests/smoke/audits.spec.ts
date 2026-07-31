import { test, expect } from '@playwright/test';
import { login, dismissWizard, collectConsoleErrors } from '../../src/helpers/auth';

/**
 * Audit Lifecycle Smoke Tests.
 * Verifies: list audits, open audit, view tabs, see controls, open control detail.
 * Works on: staging, prod.
 */

test.describe('Smoke: Audit List', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin');
    await dismissWizard(page);
  });

  test('homepage shows audit cards or navigation to audits', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for audit cards on homepage or in sidebar
    const auditContent = page.locator(
      'a[href*="/audit/"], [role="link"], [data-testid*="audit"]'
    );
    const auditNav = page.locator('nav a, aside a').filter({ hasText: /audit/i });

    const hasAuditCards = (await auditContent.count()) > 0;
    const hasAuditNav = (await auditNav.count()) > 0;

    expect(hasAuditCards || hasAuditNav).toBeTruthy();
  });

  test('no JS errors on audit list', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    expect(errors).toEqual([]);
  });
});

test.describe('Smoke: Audit Detail', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin');
    await dismissWizard(page);
  });

  test('can open first audit and see tabs', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find and click first audit card
    const auditLink = page.locator('a[href*="/audit/"]').first();
    if (!(await auditLink.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip();
      return;
    }

    await auditLink.click();
    await page.waitForURL(/\/audit\//);
    await page.waitForLoadState('networkidle');

    // Should see tabs (Dashboard, Workspace, Internal Audit, etc.)
    const tabs = page.getByRole('tab');
    await tabs.first().waitFor({ state: 'visible', timeout: 10000 });
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThanOrEqual(3);
  });

  test('audit Dashboard tab shows content', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const auditLink = page.locator('a[href*="/audit/"]').first();
    if (!(await auditLink.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip();
      return;
    }

    await auditLink.click();
    await page.waitForURL(/\/audit\//);
    await page.waitForLoadState('networkidle');

    // Dashboard tab should be active by default or click it
    const dashTab = page.getByRole('tab', { name: /dashboard/i });
    if (await dashTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dashTab.click();
      await page.waitForTimeout(2000);
    }

    // Should have some dashboard content (KPIs, charts, stats)
    const content = page.locator('main').first();
    await expect(content).toBeVisible();
  });

  test('audit Workspace tab shows controls table', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const auditLink = page.locator('a[href*="/audit/"]').first();
    if (!(await auditLink.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip();
      return;
    }

    await auditLink.click();
    await page.waitForURL(/\/audit\//);
    await page.waitForLoadState('networkidle');

    // Click Workspace tab
    const wsTab = page.getByRole('tab', { name: /workspace/i });
    if (!(await wsTab.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip();
      return;
    }

    await wsTab.click();
    await page.waitForTimeout(3000);

    // Should show a table or list of controls
    const table = page.locator('table, [role="table"], [role="grid"]').first();
    await expect(table).toBeVisible({ timeout: 10000 });
  });

  test('can click a control and see detail/evidence panel', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const auditLink = page.locator('a[href*="/audit/"]').first();
    if (!(await auditLink.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip();
      return;
    }

    await auditLink.click();
    await page.waitForURL(/\/audit\//);
    await page.waitForLoadState('networkidle');

    // Navigate to Workspace
    const wsTab = page.getByRole('tab', { name: /workspace/i });
    if (await wsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await wsTab.click();
      await page.waitForTimeout(3000);
    }

    // Click first control row
    const controlRow = page.locator('table tbody tr, [role="row"]').first();
    if (await controlRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await controlRow.click();
      await page.waitForTimeout(3000);

      // Should navigate to control detail or open a panel
      const evidenceSection = page.getByText(/evidence|upload|create new/i).first();
      const controlDetail = page.locator('[data-testid*="control"], h1, h2, h3').filter({ hasText: /./}).first();
      const hasContent = await evidenceSection.isVisible({ timeout: 5000 }).catch(() => false)
        || await controlDetail.isVisible({ timeout: 3000 }).catch(() => false);

      expect(hasContent).toBeTruthy();
    }
  });

  test('Internal Audit tab is accessible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const auditLink = page.locator('a[href*="/audit/"]').first();
    if (!(await auditLink.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip();
      return;
    }

    await auditLink.click();
    await page.waitForURL(/\/audit\//);
    await page.waitForLoadState('networkidle');

    const iaTab = page.getByRole('tab', { name: /internal audit|IA/i });
    if (await iaTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await iaTab.click();
      await page.waitForTimeout(2000);
      // Should not show an error page
      const error = page.getByText(/error|500|something went wrong/i);
      await expect(error).not.toBeVisible({ timeout: 3000 });
    }
  });

  test('Documents tab is accessible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const auditLink = page.locator('a[href*="/audit/"]').first();
    if (!(await auditLink.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip();
      return;
    }

    await auditLink.click();
    await page.waitForURL(/\/audit\//);
    await page.waitForLoadState('networkidle');

    const docsTab = page.getByRole('tab', { name: /document/i });
    if (await docsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await docsTab.click();
      await page.waitForTimeout(2000);
      const error = page.getByText(/error|500|something went wrong/i);
      await expect(error).not.toBeVisible({ timeout: 3000 });
    }
  });

  test('Action Plans tab is accessible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const auditLink = page.locator('a[href*="/audit/"]').first();
    if (!(await auditLink.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip();
      return;
    }

    await auditLink.click();
    await page.waitForURL(/\/audit\//);
    await page.waitForLoadState('networkidle');

    const apTab = page.getByRole('tab', { name: /action plan/i });
    if (await apTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await apTab.click();
      await page.waitForTimeout(2000);
      const error = page.getByText(/error|500|something went wrong/i);
      await expect(error).not.toBeVisible({ timeout: 3000 });
    }
  });
});
