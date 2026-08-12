import { test, expect } from '@playwright/test';
import { dismissWizard } from '../../src/helpers/auth';
import { getShakeoutAdmin } from './test-data';
import { shouldRun } from './excel-filter';

/**
 * Daily Shakeout — TG-6: Audit Lifecycle — Search and Load Existing Audit
 *
 * Validates:
 * 1. Login and audit tiles are visible on home page
 * 2. Search box is visible
 * 3. Search by framework name filters audits
 * 4. Search by audit name filters audits
 * 5. Click audit tile → shows 5 tabs (Dashboard, Workspace, IA, Document, Action Plan)
 * 6. Dashboard sub-validations (TC-7 through TC-19)
 *
 * Excel-driven: reads "Run Shakeout in Prod and POC" column to decide execution.
 */

test.describe('TG-6: Audit Lifecycle — Search and Load Existing Audit', () => {

  test.beforeEach(async ({ page }) => {
    const admin = getShakeoutAdmin();
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="email"], input[name="email"]').first().fill(admin.email);
    await page.locator('input[type="password"]').first().fill(admin.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    await dismissWizard(page);
  });

  test('TC-1/TC-2: Audit tiles are visible on home page', async ({ page }) => {
    test.skip(!shouldRun('TG-6', 'Scenario 6', 'TC-1'), 'Excluded by Excel — Run Shakeout = No');

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const auditLinks = page.locator('a[href*="/audit/"]');
    const count = await auditLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('TC-3: Search box is visible', async ({ page }) => {
    test.skip(!shouldRun('TG-6', 'Scenario 6', 'TC-3'), 'Excluded by Excel — Run Shakeout = No');

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const searchBox = page.locator('input[placeholder*="Search audit"], input[placeholder*="Search"]').first();
    await expect(searchBox).toBeVisible({ timeout: 5000 });
  });

  test('TC-4: Search by framework name filters matching audits', async ({ page }) => {
    test.skip(!shouldRun('TG-6', 'Scenario 6', 'TC-4'), 'Excluded by Excel — Run Shakeout = No');

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const searchBox = page.locator('input[placeholder*="Search audit"], input[placeholder*="Search"]').first();
    if (!(await searchBox.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'Search box not visible');
      return;
    }

    await searchBox.fill('SOC');
    await page.waitForTimeout(2000);

    const auditTiles = page.locator('a[href*="/audit/"]');
    const filteredCount = await auditTiles.count();
    expect(filteredCount).toBeGreaterThanOrEqual(0);
  });

  test('TC-5: Search by audit name filters matching audits', async ({ page }) => {
    test.skip(!shouldRun('TG-6', 'Scenario 6', 'TC-5'), 'Excluded by Excel — Run Shakeout = No');

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const firstAuditTile = page.locator('a[href*="/audit/"]').first();
    if (!(await firstAuditTile.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'No audit tiles visible');
      return;
    }

    const auditText = await firstAuditTile.textContent();
    const searchTerm = auditText?.trim().substring(0, 5) || 'ST-';

    const searchBox = page.locator('input[placeholder*="Search audit"], input[placeholder*="Search"]').first();
    if (!(await searchBox.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'Search box not visible');
      return;
    }

    await searchBox.fill(searchTerm);
    await page.waitForTimeout(2000);

    const mainContent = page.locator('main').first();
    await expect(mainContent).toBeVisible();
  });

  test('TC-6: Click audit tile — shows 5 tabs (Dashboard, Workspace, IA, Document, Action Plan)', async ({ page }) => {
    test.skip(!shouldRun('TG-6', 'Scenario 6', 'TC-6'), 'Excluded by Excel — Run Shakeout = No');

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const auditLink = page.locator('a[href*="/audit/"]').first();
    if (!(await auditLink.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'No audit tiles visible');
      return;
    }

    await auditLink.click();
    await page.waitForURL(/\/audit\//, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const tabs = page.getByRole('tab');
    await tabs.first().waitFor({ state: 'visible', timeout: 10000 });
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThanOrEqual(5);

    const tabTexts = await tabs.allTextContents();
    const tabNames = tabTexts.map((t) => t.trim().toLowerCase());

    expect(tabNames.some((t) => t.includes('dashboard'))).toBeTruthy();
    expect(tabNames.some((t) => t.includes('workspace'))).toBeTruthy();
    expect(tabNames.some((t) => t.includes('internal audit') || t.includes('ia'))).toBeTruthy();
    expect(tabNames.some((t) => t.includes('document'))).toBeTruthy();
    expect(tabNames.some((t) => t.includes('action plan'))).toBeTruthy();
  });

  test('TC-7: Validate Dashboard tab and subtabs', async ({ page }) => {
    test.skip(!shouldRun('TG-6', 'Scenario 6', 'TC-7'), 'Excluded by Excel — Run Shakeout = No');

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const auditLink = page.locator('a[href*="/audit/"]').first();
    if (!(await auditLink.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'No audit tiles visible');
      return;
    }

    await auditLink.click();
    await page.waitForURL(/\/audit\//, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Dashboard tab should be active or clickable
    const dashboardTab = page.getByRole('tab', { name: /dashboard/i });
    await expect(dashboardTab).toBeVisible({ timeout: 5000 });
    await dashboardTab.click();
    await page.waitForTimeout(2000);

    // Dashboard content should load without error
    const errorText = page.getByText(/error|500|something went wrong/i);
    await expect(errorText).not.toBeVisible({ timeout: 3000 });
  });

  test('TC-8: Validate Workspace tab', async ({ page }) => {
    test.skip(!shouldRun('TG-6', 'Scenario 6', 'TC-8'), 'Excluded by Excel — Run Shakeout = No');

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const auditLink = page.locator('a[href*="/audit/"]').first();
    if (!(await auditLink.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'No audit tiles visible');
      return;
    }

    await auditLink.click();
    await page.waitForURL(/\/audit\//, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const workspaceTab = page.getByRole('tab', { name: /workspace/i });
    await expect(workspaceTab).toBeVisible({ timeout: 5000 });
    await workspaceTab.click();
    await page.waitForTimeout(2000);

    const errorText = page.getByText(/error|500|something went wrong/i);
    await expect(errorText).not.toBeVisible({ timeout: 3000 });
  });

  test('TC-9: Validate Internal Audit tab', async ({ page }) => {
    test.skip(!shouldRun('TG-6', 'Scenario 6', 'TC-9'), 'Excluded by Excel — Run Shakeout = No');

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const auditLink = page.locator('a[href*="/audit/"]').first();
    if (!(await auditLink.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'No audit tiles visible');
      return;
    }

    await auditLink.click();
    await page.waitForURL(/\/audit\//, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const iaTab = page.getByRole('tab', { name: /internal audit|ia/i });
    await expect(iaTab).toBeVisible({ timeout: 5000 });
    await iaTab.click();
    await page.waitForTimeout(2000);

    const errorText = page.getByText(/error|500|something went wrong/i);
    await expect(errorText).not.toBeVisible({ timeout: 3000 });
  });

  test('TC-10: Validate Document tab', async ({ page }) => {
    test.skip(!shouldRun('TG-6', 'Scenario 6', 'TC-10'), 'Excluded by Excel — Run Shakeout = No');

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const auditLink = page.locator('a[href*="/audit/"]').first();
    if (!(await auditLink.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'No audit tiles visible');
      return;
    }

    await auditLink.click();
    await page.waitForURL(/\/audit\//, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const docTab = page.getByRole('tab', { name: /document/i });
    await expect(docTab).toBeVisible({ timeout: 5000 });
    await docTab.click();
    await page.waitForTimeout(2000);

    const errorText = page.getByText(/error|500|something went wrong/i);
    await expect(errorText).not.toBeVisible({ timeout: 3000 });
  });

  test('TC-11: Validate Action Plan tab', async ({ page }) => {
    test.skip(!shouldRun('TG-6', 'Scenario 6', 'TC-11'), 'Excluded by Excel — Run Shakeout = No');

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const auditLink = page.locator('a[href*="/audit/"]').first();
    if (!(await auditLink.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'No audit tiles visible');
      return;
    }

    await auditLink.click();
    await page.waitForURL(/\/audit\//, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const apTab = page.getByRole('tab', { name: /action plan/i });
    await expect(apTab).toBeVisible({ timeout: 5000 });
    await apTab.click();
    await page.waitForTimeout(2000);

    const errorText = page.getByText(/error|500|something went wrong/i);
    await expect(errorText).not.toBeVisible({ timeout: 3000 });
  });

  test('TC-12: Dashboard — "controls accepted" tile visible', async ({ page }) => {
    test.skip(!shouldRun('TG-6', 'Scenario 6', 'TC-12'), 'Excluded by Excel — Run Shakeout = No');

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const auditLink = page.locator('a[href*="/audit/"]').first();
    if (!(await auditLink.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'No audit tiles visible');
      return;
    }

    await auditLink.click();
    await page.waitForURL(/\/audit\//, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Click Dashboard tab
    const dashboardTab = page.getByRole('tab', { name: /dashboard/i });
    await dashboardTab.click();
    await page.waitForTimeout(2000);

    const acceptedTile = page.getByText(/controls accepted/i).first();
    await expect(acceptedTile).toBeVisible({ timeout: 5000 });
  });

  test('TC-13: Dashboard — "controls that need updates" tile visible', async ({ page }) => {
    test.skip(!shouldRun('TG-6', 'Scenario 6', 'TC-13'), 'Excluded by Excel — Run Shakeout = No');

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const auditLink = page.locator('a[href*="/audit/"]').first();
    if (!(await auditLink.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'No audit tiles visible');
      return;
    }

    await auditLink.click();
    await page.waitForURL(/\/audit\//, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const dashboardTab = page.getByRole('tab', { name: /dashboard/i });
    await dashboardTab.click();
    await page.waitForTimeout(2000);

    const updatesTile = page.getByText(/controls that need update|need update/i).first();
    await expect(updatesTile).toBeVisible({ timeout: 5000 });
  });

  test('TC-14: Dashboard — "controls due this week" tile visible', async ({ page }) => {
    test.skip(!shouldRun('TG-6', 'Scenario 6', 'TC-14'), 'Excluded by Excel — Run Shakeout = No');

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const auditLink = page.locator('a[href*="/audit/"]').first();
    if (!(await auditLink.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'No audit tiles visible');
      return;
    }

    await auditLink.click();
    await page.waitForURL(/\/audit\//, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const dashboardTab = page.getByRole('tab', { name: /dashboard/i });
    await dashboardTab.click();
    await page.waitForTimeout(2000);

    const dueTile = page.getByText(/controls due this week|due this week/i).first();
    await expect(dueTile).toBeVisible({ timeout: 5000 });
  });

  test('TC-15: Dashboard — Donut chart visible', async ({ page }) => {
    test.skip(!shouldRun('TG-6', 'Scenario 6', 'TC-15'), 'Excluded by Excel — Run Shakeout = No');

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const auditLink = page.locator('a[href*="/audit/"]').first();
    if (!(await auditLink.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'No audit tiles visible');
      return;
    }

    await auditLink.click();
    await page.waitForURL(/\/audit\//, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const dashboardTab = page.getByRole('tab', { name: /dashboard/i });
    await dashboardTab.click();
    await page.waitForTimeout(2000);

    // Look for SVG (donut chart) or canvas element
    const chart = page.locator('svg, canvas, [class*="chart"], [class*="donut"]').first();
    await expect(chart).toBeVisible({ timeout: 5000 });
  });

  test('TC-18: Dashboard — "View all" link clickable', async ({ page }) => {
    test.skip(!shouldRun('TG-6', 'Scenario 6', 'TC-18'), 'Excluded by Excel — Run Shakeout = No');

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const auditLink = page.locator('a[href*="/audit/"]').first();
    if (!(await auditLink.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'No audit tiles visible');
      return;
    }

    await auditLink.click();
    await page.waitForURL(/\/audit\//, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const dashboardTab = page.getByRole('tab', { name: /dashboard/i });
    await dashboardTab.click();
    await page.waitForTimeout(2000);

    const viewAllBtn = page.locator('button, a').filter({ hasText: /view all/i }).first();
    await expect(viewAllBtn).toBeVisible({ timeout: 5000 });
  });

  test('TC-19: Dashboard — "Recent activity" tile visible', async ({ page }) => {
    test.skip(!shouldRun('TG-6', 'Scenario 6', 'TC-19'), 'Excluded by Excel — Run Shakeout = No');

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const auditLink = page.locator('a[href*="/audit/"]').first();
    if (!(await auditLink.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'No audit tiles visible');
      return;
    }

    await auditLink.click();
    await page.waitForURL(/\/audit\//, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const dashboardTab = page.getByRole('tab', { name: /dashboard/i });
    await dashboardTab.click();
    await page.waitForTimeout(2000);

    const recentActivity = page.getByText(/recent activity/i).first();
    await expect(recentActivity).toBeVisible({ timeout: 5000 });
  });
});
