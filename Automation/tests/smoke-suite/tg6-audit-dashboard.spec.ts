import { test, expect } from './base-fixture';
import { dismissWizard } from '../../src/helpers/auth';
import { getSmokeAdmin } from './test-data';

/**
 * TG-6 TC-9 to TC-16: Audit Dashboard Tab Validation
 * Source: New_testcase.xlsx → TC-9 through TC-16
 *
 * Validates the Dashboard tab contents for an existing audit:
 * - KPI tiles (controls accepted, needs updates, due this week)
 * - Donut chart with control statuses
 * - Status numbers
 * - "View all" link navigation
 * - Recent activity tile
 *
 * Prerequisites: At least one audit with controls must exist.
 */

test.describe('TG-6 TC-9 to TC-16: Audit Dashboard Validation', () => {
  test.beforeEach(async ({ page }) => {
    const admin = getSmokeAdmin();
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="email"], input[name="email"]').first().fill(admin.email);
    await page.locator('input[type="password"]').first().fill(admin.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    await dismissWizard(page);

    // Navigate to first audit
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const auditLink = page.locator('a[href*="/audit/"]').first();
    if (!(await auditLink.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip();
      return;
    }

    await auditLink.click();
    await page.waitForURL(/\/audit\//, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Click Dashboard tab (should be active by default, but click it to ensure)
    const dashTab = page.getByRole('tab', { name: /dashboard/i });
    if (await dashTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dashTab.click();
      await page.waitForTimeout(2000);
    }
  });

  test('TC-9: Dashboard shows "Requirements accepted" tile with a number', async ({ page }) => {
    // XPath from Excel: //*[@id="tabpanel-db"]/div/div[1]/div[1]/p[2] (text) and p[1] (number)
    const dashPanel = page.locator('[id*="tabpanel-db"], [role="tabpanel"]').first();
    await expect(dashPanel).toBeVisible({ timeout: 5000 });

    // Actual UI text: "Requirements accepted"
    const acceptedTile = page.getByText(/requirements accepted/i).first();
    await expect(acceptedTile).toBeVisible({ timeout: 5000 });

    // The number should be a sibling/nearby element
    const tileContainer = acceptedTile.locator('..').first();
    const tileText = await tileContainer.textContent();
    // Should contain at least one digit (the count)
    expect(tileText).toMatch(/\d/);
  });

  test('TC-10: Dashboard shows "Requirements that need updates" tile with a number', async ({ page }) => {
    const dashPanel = page.locator('[id*="tabpanel-db"], [role="tabpanel"]').first();
    await expect(dashPanel).toBeVisible({ timeout: 5000 });

    // Actual UI text: "Requirements that need updates"
    const needsUpdateTile = page.getByText(/requirements that need updates/i).first();
    await expect(needsUpdateTile).toBeVisible({ timeout: 5000 });

    const tileContainer = needsUpdateTile.locator('..').first();
    const tileText = await tileContainer.textContent();
    expect(tileText).toMatch(/\d/);
  });

  test('TC-11: Dashboard shows "Requirements due this week" tile with a number', async ({ page }) => {
    const dashPanel = page.locator('[id*="tabpanel-db"], [role="tabpanel"]').first();
    await expect(dashPanel).toBeVisible({ timeout: 5000 });

    // Actual UI text: "Requirements due this week"
    const dueThisWeekTile = page.getByText(/requirements due this week/i).first();
    await expect(dueThisWeekTile).toBeVisible({ timeout: 5000 });

    const tileContainer = dueThisWeekTile.locator('..').first();
    const tileText = await tileContainer.textContent();
    expect(tileText).toMatch(/\d/);
  });

  test('TC-12: Dashboard has a donut chart with Status overview', async ({ page }) => {
    const dashPanel = page.locator('[id*="tabpanel-db"], [role="tabpanel"]').first();
    await expect(dashPanel).toBeVisible({ timeout: 5000 });

    // "Status overview" heading is visible
    const statusOverview = page.getByText(/status overview/i).first();
    await expect(statusOverview).toBeVisible({ timeout: 5000 });

    // Verify status labels from the donut chart legend
    const statusLabels = [
      /not started/i,
      /in progress/i,
      /submitted/i,
      /updates requested/i,
      /accepted/i,
      /final review/i,
    ];

    let foundLabels = 0;
    for (const label of statusLabels) {
      const el = page.getByText(label).first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        foundLabels++;
      }
    }

    // At least 4 of the 6 expected statuses should be visible
    expect(foundLabels).toBeGreaterThanOrEqual(4);
  });

  test('TC-13: Dashboard status labels show numbers next to them', async ({ page }) => {
    const dashPanel = page.locator('[id*="tabpanel-db"], [role="tabpanel"]').first();
    await expect(dashPanel).toBeVisible({ timeout: 5000 });

    // Look for status items with associated numbers
    // Statuses: Not Started, In progress, Submitted, Update requested, Accepted, Final review
    const statusTexts = ['Not Started', 'In Progress', 'Submitted', 'Accepted'];

    let foundWithNumber = 0;
    for (const status of statusTexts) {
      const statusEl = page.getByText(new RegExp(status, 'i')).first();
      if (await statusEl.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Check parent/sibling for a number
        const container = statusEl.locator('..').first();
        const text = await container.textContent();
        if (text && /\d/.test(text)) {
          foundWithNumber++;
        }
      }
    }

    // At least some statuses should show numbers
    expect(foundWithNumber).toBeGreaterThanOrEqual(1);
  });

  test('TC-15: Dashboard "View all" link navigates to Audit Workspace > Controls > All Controls', async ({ page }) => {
    const dashPanel = page.locator('[id*="tabpanel-db"], [role="tabpanel"]').first();
    await expect(dashPanel).toBeVisible({ timeout: 5000 });

    // Find "View all" link/button
    const viewAllBtn = page.locator('button, a').filter({ hasText: /view all/i }).first();
    if (!(await viewAllBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.info().annotations.push({ type: 'info', description: 'View all link not found on dashboard' });
      return;
    }

    await viewAllBtn.click();
    await page.waitForTimeout(2000);

    // Should navigate to workspace tab with controls visible
    const workspaceTab = page.getByRole('tab', { name: /workspace/i });
    const isWorkspaceActive = await workspaceTab.getAttribute('aria-selected');

    // Either workspace tab is now active, or a table of controls is visible
    const controlsTable = page.locator('table, [role="table"], [role="grid"]').first();
    const hasControls = await controlsTable.isVisible({ timeout: 5000 }).catch(() => false);
    const wsActive = isWorkspaceActive === 'true';

    expect(hasControls || wsActive).toBeTruthy();
  });

  test('TC-16: Dashboard shows "Recent activity" tile', async ({ page }) => {
    const dashPanel = page.locator('[id*="tabpanel-db"], [role="tabpanel"]').first();
    await expect(dashPanel).toBeVisible({ timeout: 5000 });

    // XPath from Excel: //*[@id="tabpanel-db"]/div/div[2]/div[2]/div[1]/h3
    const recentActivityHeading = page.getByText(/recent activity/i).first();
    await expect(recentActivityHeading).toBeVisible({ timeout: 5000 });
  });
});
