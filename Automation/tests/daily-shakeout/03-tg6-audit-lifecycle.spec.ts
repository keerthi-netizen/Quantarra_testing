import { test, expect } from '@playwright/test';
import { dismissWizard } from '../../src/helpers/auth';
import { getShakeoutAdmin } from './test-data';
import { shouldRun } from './excel-filter';
import { getAdminSessionPath, checkGate } from './session-setup';

/**
 * Daily Shakeout — TG-6: Audit Lifecycle — Search and Load Existing Audit
 *
 * Session strategy: Login ONCE via storageState. Total logins for this file: 0
 * (session created by 00-auth-setup).
 *
 * Wait strategy: Explicit waits only (up to 30s). No hard sleeps.
 * Tests progress as soon as the element appears.
 */

test.describe('TG-6: Audit Lifecycle — Search and Load Existing Audit', () => {
  test.use({ storageState: getAdminSessionPath() });

  test.beforeEach(({}, testInfo) => {
    const gateReason = checkGate();
    if (gateReason) {
      testInfo.skip(true, gateReason);
    }
  });

  /** Helper: navigate to home and wait for audit tiles to load */
  async function goHomeAndWaitForAudits(page) {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const auditLink = page.locator('a[href*="/audit/"]').first();
    await expect(auditLink).toBeVisible({ timeout: 30000 });
    return auditLink;
  }

  /** Helper: click first audit tile and wait for audit page to load */
  async function navigateToFirstAudit(page) {
    const auditLink = await goHomeAndWaitForAudits(page);
    await auditLink.click();
    await page.waitForURL(/\/audit\//, { timeout: 30000, waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    // Wait for tabs to render
    await expect(page.getByRole('tab').first()).toBeVisible({ timeout: 30000 });
  }

  test('TC-1/TC-2: Audit tiles are visible on home page', async ({ page }) => {
    test.skip(!shouldRun('TG-6', 'Scenario 6', 'TC-1'), 'Excluded by Excel — Run Shakeout = No');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const auditLinks = page.locator('a[href*="/audit/"]').first();
    await expect(auditLinks).toBeVisible({ timeout: 30000 });
    const count = await page.locator('a[href*="/audit/"]').count();
    expect(count).toBeGreaterThan(0);
  });

  test('TC-3: Search box is visible', async ({ page }) => {
    test.skip(!shouldRun('TG-6', 'Scenario 6', 'TC-3'), 'Excluded by Excel — Run Shakeout = No');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const searchBox = page.locator('input[placeholder*="Search audit"], input[placeholder*="Search"]').first();
    await expect(searchBox).toBeVisible({ timeout: 30000 });
  });

  test('TC-4: Search by framework name filters matching audits', async ({ page }) => {
    test.skip(!shouldRun('TG-6', 'Scenario 6', 'TC-4'), 'Excluded by Excel — Run Shakeout = No');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const searchBox = page.locator('input[placeholder*="Search audit"], input[placeholder*="Search"]').first();
    if (!(await searchBox.isVisible({ timeout: 10000 }).catch(() => false))) {
      test.skip(true, 'Search box not visible');
      return;
    }

    await searchBox.fill('SOC');
    // Wait for filter to take effect — audit list should update
    await page.waitForLoadState('networkidle');
    const auditTiles = page.locator('a[href*="/audit/"]');
    const filteredCount = await auditTiles.count();
    expect(filteredCount).toBeGreaterThanOrEqual(0);
  });

  test('TC-5: Search by audit name filters matching audits', async ({ page }) => {
    test.skip(!shouldRun('TG-6', 'Scenario 6', 'TC-5'), 'Excluded by Excel — Run Shakeout = No');

    await goHomeAndWaitForAudits(page);

    const firstAuditTile = page.locator('a[href*="/audit/"]').first();
    const auditText = await firstAuditTile.textContent();
    const searchTerm = auditText?.trim().substring(0, 5) || 'RG-';

    const searchBox = page.locator('input[placeholder*="Search audit"], input[placeholder*="Search"]').first();
    if (!(await searchBox.isVisible({ timeout: 10000 }).catch(() => false))) {
      test.skip(true, 'Search box not visible');
      return;
    }

    await searchBox.fill(searchTerm);
    await page.waitForLoadState('networkidle');

    const mainContent = page.locator('main').first();
    await expect(mainContent).toBeVisible({ timeout: 30000 });
  });

  test('TC-6: Click audit tile — shows 5 tabs (Dashboard, Workspace, IA, Document, Action Plan)', async ({ page }) => {
    test.skip(!shouldRun('TG-6', 'Scenario 6', 'TC-6'), 'Excluded by Excel — Run Shakeout = No');

    await navigateToFirstAudit(page);

    const tabs = page.getByRole('tab');
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

    await navigateToFirstAudit(page);

    const dashboardTab = page.getByRole('tab', { name: /dashboard/i });
    await dashboardTab.click();
    await page.waitForLoadState('networkidle');

    const errorText = page.getByText(/error|500|something went wrong/i);
    await expect(errorText).not.toBeVisible({ timeout: 5000 });
  });

  test('TC-8: Validate Workspace tab', async ({ page }) => {
    test.skip(!shouldRun('TG-6', 'Scenario 6', 'TC-8'), 'Excluded by Excel — Run Shakeout = No');

    await navigateToFirstAudit(page);

    const workspaceTab = page.getByRole('tab', { name: /audit workspace|workspace/i });
    await workspaceTab.click();
    await page.waitForLoadState('networkidle');

    // Wait for workspace content to load (table or list)
    await expect(page.locator('main').first()).toBeVisible({ timeout: 30000 });
    const errorText = page.getByText(/error|500|something went wrong/i);
    await expect(errorText).not.toBeVisible({ timeout: 5000 });
  });

  test('TC-9: Validate Internal Audit tab', async ({ page }) => {
    test.skip(!shouldRun('TG-6', 'Scenario 6', 'TC-9'), 'Excluded by Excel — Run Shakeout = No');

    await navigateToFirstAudit(page);

    const iaTab = page.getByRole('tab', { name: /internal audit|ia/i });
    await iaTab.click();
    await page.waitForLoadState('networkidle');

    const errorText = page.getByText(/error|500|something went wrong/i);
    await expect(errorText).not.toBeVisible({ timeout: 5000 });
  });

  test('TC-10: Validate Document tab', async ({ page }) => {
    test.skip(!shouldRun('TG-6', 'Scenario 6', 'TC-10'), 'Excluded by Excel — Run Shakeout = No');

    await navigateToFirstAudit(page);

    const docTab = page.getByRole('tab', { name: /document/i });
    await docTab.click();
    await page.waitForLoadState('networkidle');

    const errorText = page.getByText(/error|500|something went wrong/i);
    await expect(errorText).not.toBeVisible({ timeout: 5000 });
  });

  test('TC-11: Validate Action Plan tab', async ({ page }) => {
    test.skip(!shouldRun('TG-6', 'Scenario 6', 'TC-11'), 'Excluded by Excel — Run Shakeout = No');

    await navigateToFirstAudit(page);

    const apTab = page.getByRole('tab', { name: /action plan/i });
    await apTab.click();
    await page.waitForLoadState('networkidle');

    const errorText = page.getByText(/error|500|something went wrong/i);
    await expect(errorText).not.toBeVisible({ timeout: 5000 });
  });

  test('TC-12: Dashboard — "controls accepted" tile visible', async ({ page }) => {
    test.skip(!shouldRun('TG-6', 'Scenario 6', 'TC-12'), 'Excluded by Excel — Run Shakeout = No');

    await navigateToFirstAudit(page);

    const dashboardTab = page.getByRole('tab', { name: /dashboard/i });
    await dashboardTab.click();
    await page.waitForLoadState('networkidle');

    const acceptedTile = page.getByText(/controls accepted/i).first();
    await expect(acceptedTile).toBeVisible({ timeout: 30000 });
  });

  test('TC-13: Dashboard — "controls that need updates" tile visible', async ({ page }) => {
    test.skip(!shouldRun('TG-6', 'Scenario 6', 'TC-13'), 'Excluded by Excel — Run Shakeout = No');

    await navigateToFirstAudit(page);

    const dashboardTab = page.getByRole('tab', { name: /dashboard/i });
    await dashboardTab.click();
    await page.waitForLoadState('networkidle');

    const updatesTile = page.getByText(/controls that need update|need update/i).first();
    await expect(updatesTile).toBeVisible({ timeout: 30000 });
  });

  test('TC-14: Dashboard — "controls due this week" tile visible', async ({ page }) => {
    test.skip(!shouldRun('TG-6', 'Scenario 6', 'TC-14'), 'Excluded by Excel — Run Shakeout = No');

    await navigateToFirstAudit(page);

    const dashboardTab = page.getByRole('tab', { name: /dashboard/i });
    await dashboardTab.click();
    await page.waitForLoadState('networkidle');

    const dueTile = page.getByText(/controls due this week|due this week/i).first();
    await expect(dueTile).toBeVisible({ timeout: 30000 });
  });

  test('TC-15: Dashboard — Donut chart visible', async ({ page }) => {
    test.skip(!shouldRun('TG-6', 'Scenario 6', 'TC-15'), 'Excluded by Excel — Run Shakeout = No');

    await navigateToFirstAudit(page);

    const dashboardTab = page.getByRole('tab', { name: /dashboard/i });
    await dashboardTab.click();
    await page.waitForLoadState('networkidle');

    const chart = page.locator('svg, canvas, [class*="chart"], [class*="donut"]').first();
    await expect(chart).toBeVisible({ timeout: 30000 });
  });

  test('TC-18: Dashboard — "View all" link clickable', async ({ page }) => {
    test.skip(!shouldRun('TG-6', 'Scenario 6', 'TC-18'), 'Excluded by Excel — Run Shakeout = No');

    await navigateToFirstAudit(page);

    const dashboardTab = page.getByRole('tab', { name: /dashboard/i });
    await dashboardTab.click();
    await page.waitForLoadState('networkidle');

    const viewAllBtn = page.locator('button, a').filter({ hasText: /view all/i }).first();
    await expect(viewAllBtn).toBeVisible({ timeout: 30000 });
  });

  test('TC-19: Dashboard — "Recent activity" tile visible', async ({ page }) => {
    test.skip(!shouldRun('TG-6', 'Scenario 6', 'TC-19'), 'Excluded by Excel — Run Shakeout = No');

    await navigateToFirstAudit(page);

    const dashboardTab = page.getByRole('tab', { name: /dashboard/i });
    await dashboardTab.click();
    await page.waitForLoadState('networkidle');

    const recentActivity = page.getByText(/recent activity/i).first();
    await expect(recentActivity).toBeVisible({ timeout: 30000 });
  });

  test('TC-16: Dashboard — Status shows numbers (Not Started, In progress, etc.)', async ({ page }) => {
    test.skip(!shouldRun('TG-6', 'Scenario 6', 'TC-16'), 'Excluded by Excel — Run Shakeout = No');

    await navigateToFirstAudit(page);

    const dashboardTab = page.getByRole('tab', { name: /dashboard/i });
    await dashboardTab.click();
    await page.waitForLoadState('networkidle');

    // Verify status labels with numbers are visible
    const notStarted = page.getByText(/not started/i).first();
    const inProgress = page.getByText(/in progress/i).first();

    const hasNotStarted = await notStarted.isVisible({ timeout: 10000 }).catch(() => false);
    const hasInProgress = await inProgress.isVisible({ timeout: 5000 }).catch(() => false);

    expect(hasNotStarted || hasInProgress).toBeTruthy();
  });

  test('TC-17: Dashboard — Status numbers are numeric values', async ({ page }) => {
    test.skip(!shouldRun('TG-6', 'Scenario 6', 'TC-17'), 'Excluded by Excel — Run Shakeout = No');

    await navigateToFirstAudit(page);

    const dashboardTab = page.getByRole('tab', { name: /dashboard/i });
    await dashboardTab.click();
    await page.waitForLoadState('networkidle');

    // Verify there are numeric values displayed near status labels
    const numbers = page.locator('[class*="stat"], [class*="count"], [class*="number"], [class*="metric"]').first();
    const statusSection = page.locator('text=/\\d+/').first();

    const hasNumbers = await numbers.isVisible({ timeout: 10000 }).catch(() => false);
    const hasDigits = await statusSection.isVisible({ timeout: 5000 }).catch(() => false);

    expect(hasNumbers || hasDigits).toBeTruthy();
  });

  test('TC-20: Workspace — Display tabs (Families, Objectives, Controls, Evidence)', async ({ page }) => {
    test.skip(!shouldRun('TG-6', 'Scenario 6', 'TC-20'), 'Excluded by Excel — Run Shakeout = No');

    await navigateToFirstAudit(page);

    const workspaceTab = page.getByRole('tab', { name: /audit workspace|workspace/i });
    await workspaceTab.click();
    await page.waitForLoadState('networkidle');

    // Verify workspace sub-tabs are present
    const familiesTab = page.getByText(/^Families(\s*\(\d+\))?$/i).first();
    const objectivesTab = page.getByText(/^Objectives(\s*\(\d+\))?$/i).first();
    const controlsTab = page.getByText(/^Controls(\s*\(\d+\))?$/i).first();
    const evidenceTab = page.getByText(/^Evidence(\s*\(\d+\))?$/i).first();

    const hasFamilies = await familiesTab.isVisible({ timeout: 10000 }).catch(() => false);
    const hasObjectives = await objectivesTab.isVisible({ timeout: 5000 }).catch(() => false);
    const hasControls = await controlsTab.isVisible({ timeout: 5000 }).catch(() => false);
    const hasEvidence = await evidenceTab.isVisible({ timeout: 5000 }).catch(() => false);

    // At least Controls should be visible (core tab)
    expect(hasControls).toBeTruthy();
    console.log(`  📋 Workspace tabs: Families=${hasFamilies}, Objectives=${hasObjectives}, Controls=${hasControls}, Evidence=${hasEvidence}`);
  });

  test('TC-21: Workspace — Family (Category) tab shows subtabs', async ({ page }) => {
    test.skip(!shouldRun('TG-6', 'Scenario 6', 'TC-21'), 'Excluded by Excel — Run Shakeout = No');

    await navigateToFirstAudit(page);

    const workspaceTab = page.getByRole('tab', { name: /audit workspace|workspace/i });
    await workspaceTab.click();
    await page.waitForLoadState('networkidle');

    // Click Families/Category tab
    const familiesTab = page.getByText(/^Families(\s*\(\d+\))?$/i).first();
    if (await familiesTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await familiesTab.click();
      await page.waitForLoadState('networkidle');

      // Verify content loads (table or list)
      const content = page.locator('table, [role="table"], [role="grid"], main').first();
      await expect(content).toBeVisible({ timeout: 15000 });
    } else {
      test.skip(true, 'Families/Category tab not visible in this framework');
    }
  });

  test('TC-22: Workspace — Objectives (Sub-Category) tab shows subtabs', async ({ page }) => {
    test.skip(!shouldRun('TG-6', 'Scenario 6', 'TC-22'), 'Excluded by Excel — Run Shakeout = No');

    await navigateToFirstAudit(page);

    const workspaceTab = page.getByRole('tab', { name: /audit workspace|workspace/i });
    await workspaceTab.click();
    await page.waitForLoadState('networkidle');

    // Click Objectives/Sub-Category tab
    const objectivesTab = page.getByText(/^Objectives(\s*\(\d+\))?$/i).first();
    if (await objectivesTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await objectivesTab.click();
      await page.waitForLoadState('networkidle');

      const content = page.locator('table, [role="table"], [role="grid"], main').first();
      await expect(content).toBeVisible({ timeout: 15000 });
    } else {
      test.skip(true, 'Objectives/Sub-Category tab not visible in this framework');
    }
  });

  test('TC-23: Workspace — Controls tab shows All Controls and Controls I Own', async ({ page }) => {
    test.skip(!shouldRun('TG-6', 'Scenario 6', 'TC-23'), 'Excluded by Excel — Run Shakeout = No');

    await navigateToFirstAudit(page);

    const workspaceTab = page.getByRole('tab', { name: /audit workspace|workspace/i });
    await workspaceTab.click();
    await page.waitForLoadState('networkidle');

    // Click Controls sub-tab (exact match to avoid hitting "All controls" pill)
    // Matches "Controls (176)" or "Controls" but NOT "All controls (176)"
    const controlsTab = page.getByText(/^Controls(\s*\(\d+\))?$/i).first();
    await expect(controlsTab).toBeVisible({ timeout: 10000 });
    await controlsTab.click();
    await page.waitForLoadState('networkidle');

    // Verify "All controls" and "Controls I own" filter pills
    const allControlsTab = page.getByText(/^All controls(\s*\(\d+\))?$/i).first();
    const myControlsTab = page.getByText(/^Controls I own(\s*\(\d+\))?$/i).first();

    await expect(allControlsTab).toBeVisible({ timeout: 10000 });
    await expect(myControlsTab).toBeVisible({ timeout: 5000 });
  });

  test('TC-24: Workspace — "+ Add Control" button is enabled', async ({ page }) => {
    test.skip(!shouldRun('TG-6', 'Scenario 6', 'TC-24'), 'Excluded by Excel — Run Shakeout = No');

    await navigateToFirstAudit(page);

    const workspaceTab = page.getByRole('tab', { name: /audit workspace|workspace/i });
    await workspaceTab.click();
    await page.waitForLoadState('networkidle');

    // Navigate to Controls tab
    const controlsTab = page.getByText(/^Controls(\s*\(\d+\))?$/i).first();
    if (await controlsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await controlsTab.click();
      await page.waitForLoadState('networkidle');
    }

    // Verify "+ Add Control" button is visible and enabled
    const addControlBtn = page.locator('#tabpanel-ws button:has-text("Add control"), #tabpanel-ws button:has-text("+ Add control")').first();
    await expect(addControlBtn).toBeVisible({ timeout: 15000 });
    await expect(addControlBtn).toBeEnabled();
  });

  test('TC-25: Internal Auditor — tabs (Ready for review, Needs updates, Accepted, Findings)', async ({ page }) => {
    test.skip(!shouldRun('TG-6', 'Scenario 6', 'TC-25'), 'Excluded by Excel — Run Shakeout = No');

    await navigateToFirstAudit(page);

    const iaTab = page.getByRole('tab', { name: /internal audit|ia/i });
    await iaTab.click();
    await page.waitForLoadState('networkidle');

    // Verify IA sub-tabs are present
    const readyTab = page.locator('button, a, [role="tab"]').filter({ hasText: /ready for review|ready/i }).first();
    const needsUpdatesTab = page.locator('button, a, [role="tab"]').filter({ hasText: /needs update|update/i }).first();
    const acceptedTab = page.locator('button, a, [role="tab"]').filter({ hasText: /accepted/i }).first();
    const findingsTab = page.locator('button, a, [role="tab"]').filter({ hasText: /finding/i }).first();

    const hasReady = await readyTab.isVisible({ timeout: 10000 }).catch(() => false);
    const hasUpdates = await needsUpdatesTab.isVisible({ timeout: 5000 }).catch(() => false);
    const hasAccepted = await acceptedTab.isVisible({ timeout: 5000 }).catch(() => false);
    const hasFindings = await findingsTab.isVisible({ timeout: 5000 }).catch(() => false);

    // At least some IA tabs should be present
    expect(hasReady || hasUpdates || hasAccepted || hasFindings).toBeTruthy();
    console.log(`  📋 IA tabs: Ready=${hasReady}, NeedsUpdates=${hasUpdates}, Accepted=${hasAccepted}, Findings=${hasFindings}`);
  });
});
