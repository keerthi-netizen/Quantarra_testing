import { test, expect, type Page } from '@playwright/test';
import { dismissWizard } from '../../src/helpers/auth';
import { shouldRun } from './excel-filter';
import { getAdminSessionPath, checkGate } from './session-setup';

/**
 * Daily Shakeout — TG-7: Audit Workspace — Filters (Scenario 7)
 *
 * Verifies the workspace Controls filter Sheet: open, select "In progress"
 * submission status, apply, verify filtered results + count badge, persistence
 * across control navigation, and clear-all.
 *
 * Session strategy: Login ONCE via storageState (created by 00-auth-setup).
 * Wait strategy: explicit waits only (up to 30s). No hard sleeps beyond small
 * settle delays where the list re-queries.
 *
 * UI facts (from apps/web):
 * - Filter trigger: [data-testid="workspace-filter-btn"] (only on Controls sub-tab)
 * - Count badge:    [data-testid="workspace-filter-badge"]
 * - Filter Sheet:   title "Filters"; legend "Submission status";
 *                   status option label "In progress"; footer "Clear all" + "Apply filter"
 * - Controls chips: testIdPrefix "controls-chip" (e.g. "All controls")
 */

test.describe('TG-7: Audit Workspace — Filters', () => {
  test.use({ storageState: getAdminSessionPath() });

  test.beforeEach(({}, testInfo) => {
    const gateReason = checkGate();
    if (gateReason) {
      testInfo.skip(true, gateReason);
    }
  });

  const TARGET_FRAMEWORK = 'SOC 2 Type 2';

  /** Navigate to home and wait for audit tiles. */
  async function goHomeAndWaitForAudits(page: Page): Promise<void> {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('a[href*="/audit/"]').first()).toBeVisible({ timeout: 30000 });
  }

  /** Navigate to the SOC 2 Type 2 audit (falls back to first audit). */
  async function navigateToAudit(page: Page): Promise<void> {
    await goHomeAndWaitForAudits(page);

    const searchBox = page.locator('input[placeholder*="Search audit"], input[placeholder*="Search"]').first();
    if (await searchBox.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchBox.fill(TARGET_FRAMEWORK);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
    }

    const soc2Audit = page.locator('a[href*="/audit/"]').filter({ hasText: /SOC 2 Type 2/i }).first();
    const hasSoc2 = await soc2Audit.isVisible({ timeout: 5000 }).catch(() => false);
    const target = hasSoc2 ? soc2Audit : page.locator('a[href*="/audit/"]').first();
    if (!hasSoc2) {
      console.log(`  ⚠️ No "${TARGET_FRAMEWORK}" audit found — falling back to first available audit`);
    }

    await target.click();
    await page.waitForURL(/\/audit\//, { timeout: 30000, waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('tab').first()).toBeVisible({ timeout: 30000 });
  }

  /**
   * Navigate to the audit, open the Workspace tab, and select the Controls sub-tab.
   * Leaves the page on Audit Workspace → Controls → All controls, with the control
   * list rendered.
   */
  async function gotoWorkspaceControls(page: Page): Promise<void> {
    await navigateToAudit(page);

    const workspaceTab = page.getByRole('tab', { name: /audit workspace|workspace/i });
    await workspaceTab.click();
    await page.waitForLoadState('networkidle');

    const wsPanel = page.locator('#tabpanel-ws');
    await expect(wsPanel).toBeVisible({ timeout: 15000 });

    // Select the Controls (or Requirements) sub-tab so the filter button appears.
    const controlsSubTab = wsPanel.locator('text=/Controls|Requirements/i').first();
    if (await controlsSubTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await controlsSubTab.click();
      await page.waitForLoadState('networkidle');
    }

    // Wait for the control list to render (the filter button is Controls-only, and
    // each control row carries a link to /audit/:id/control/:controlId).
    await expect(page.getByTestId('workspace-filter-btn')).toBeVisible({ timeout: 15000 });
    await controlRows(page).first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  }

  /** Locator for control rows — each workspace control row contains a control link. */
  function controlRows(page: Page) {
    return page.locator('#tabpanel-ws a[href*="/control/"]');
  }

  /** Open the filter Sheet and wait for it to render. */
  async function openFilterSheet(page: Page): Promise<void> {
    const filterBtn = page.getByTestId('workspace-filter-btn');
    await expect(filterBtn).toBeVisible({ timeout: 15000 });
    await filterBtn.click();
    await expect(page.getByRole('dialog').getByText('Filters', { exact: true })).toBeVisible({ timeout: 10000 });
  }

  test('TC-2: Navigate to Audit Workspace → Controls → All controls', async ({ page }) => {
    test.skip(!shouldRun('TG-7', 'Scenario 7', 'TC-2'), 'Excluded by Excel — Run Shakeout = No');

    await gotoWorkspaceControls(page);

    const allControls = page.locator('text=/All controls|All requirements/i').first();
    await expect(allControls).toBeVisible({ timeout: 15000 });
  });

  test('TC-3/TC-4: Filter button opens the filter slide-over', async ({ page }) => {
    test.skip(!shouldRun('TG-7', 'Scenario 7', 'TC-3'), 'Excluded by Excel — Run Shakeout = No');

    await gotoWorkspaceControls(page);
    await openFilterSheet(page);

    // TC-4: the filter Sheet (slide bar) is visible with its known sections.
    const sheet = page.getByRole('dialog');
    await expect(sheet.getByText('Submission status')).toBeVisible({ timeout: 10000 });
    await expect(sheet.getByRole('button', { name: /apply filter/i })).toBeVisible();
  });

  test('TC-5/TC-6: Select "In progress" status, Apply, and slide bar closes', async ({ page }) => {
    test.skip(!shouldRun('TG-7', 'Scenario 7', 'TC-5'), 'Excluded by Excel — Run Shakeout = No');

    await gotoWorkspaceControls(page);
    await openFilterSheet(page);

    const sheet = page.getByRole('dialog');
    // Submission status → "In progress" checkbox (label contains the text).
    const inProgress = sheet.getByText('In progress', { exact: true });
    await expect(inProgress).toBeVisible({ timeout: 10000 });
    await inProgress.click();

    await sheet.getByRole('button', { name: /apply filter/i }).click();

    // TC-6: the slide bar disappears after applying.
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10000 });
  });

  test('TC-8: Filter button shows count badge "1" after applying one filter', async ({ page }) => {
    test.skip(!shouldRun('TG-7', 'Scenario 7', 'TC-8'), 'Excluded by Excel — Run Shakeout = No');

    await gotoWorkspaceControls(page);
    await openFilterSheet(page);

    const sheet = page.getByRole('dialog');
    await sheet.getByText('In progress', { exact: true }).click();
    await sheet.getByRole('button', { name: /apply filter/i }).click();
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10000 });

    const badge = page.getByTestId('workspace-filter-badge');
    await expect(badge).toBeVisible({ timeout: 10000 });
    await expect(badge).toHaveText('1');
  });

  test('TC-9/TC-10: Filter persists after opening a control and navigating back', async ({ page }) => {
    test.skip(!shouldRun('TG-7', 'Scenario 7', 'TC-9'), 'Excluded by Excel — Run Shakeout = No');

    await gotoWorkspaceControls(page);
    await openFilterSheet(page);

    const sheet = page.getByRole('dialog');
    await sheet.getByText('In progress', { exact: true }).click();
    await sheet.getByRole('button', { name: /apply filter/i }).click();
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10000 });
    await expect(page.getByTestId('workspace-filter-badge')).toHaveText('1', { timeout: 10000 });

    // TC-9: open the first control row.
    const firstControl = controlRows(page).first();
    if (!(await firstControl.isVisible({ timeout: 10000 }).catch(() => false))) {
      test.skip(true, 'No controls with "In progress" status to open');
      return;
    }
    await firstControl.click();
    await page.waitForLoadState('networkidle');

    // TC-10: navigate back — the filter (badge "1") should still be applied.
    await page.goBack();
    await page.waitForLoadState('networkidle');

    const badge = page.getByTestId('workspace-filter-badge');
    await expect(badge).toBeVisible({ timeout: 10000 });
    await expect(badge).toHaveText('1');
  });

  test('TC-11/TC-12/TC-13: Clear all removes the filter and closes the slide bar', async ({ page }) => {
    test.skip(!shouldRun('TG-7', 'Scenario 7', 'TC-12'), 'Excluded by Excel — Run Shakeout = No');

    await gotoWorkspaceControls(page);

    // Apply a filter first so there is something to clear.
    await openFilterSheet(page);
    let sheet = page.getByRole('dialog');
    await sheet.getByText('In progress', { exact: true }).click();
    await sheet.getByRole('button', { name: /apply filter/i }).click();
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10000 });
    await expect(page.getByTestId('workspace-filter-badge')).toHaveText('1', { timeout: 10000 });

    // TC-11: reopen the filter panel.
    await openFilterSheet(page);
    sheet = page.getByRole('dialog');

    // TC-12: Clear all, then Apply filter.
    await sheet.getByRole('button', { name: /clear all/i }).click();
    await sheet.getByRole('button', { name: /apply filter/i }).click();

    // TC-13: slide bar closes and the badge is gone (no active filters).
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10000 });
    await expect(page.getByTestId('workspace-filter-badge')).toHaveCount(0, { timeout: 10000 });
  });

  test('TC-14: All controls tab shows controls of all statuses after clearing', async ({ page }) => {
    test.skip(!shouldRun('TG-7', 'Scenario 7', 'TC-14'), 'Excluded by Excel — Run Shakeout = No');

    await gotoWorkspaceControls(page);

    // No filter applied → the control list should be non-empty and no badge shown.
    await expect(page.getByTestId('workspace-filter-badge')).toHaveCount(0, { timeout: 10000 });

    const count = await controlRows(page).count();
    expect(count).toBeGreaterThan(0);
  });
});
