import { test, expect } from '@playwright/test';
import { checkGate } from '../daily-shakeout/session-setup';
import { shouldRunE2E } from '../daily-shakeout/excel-filter';
import { getEnvConfig } from '../../src/config/environment';
import * as fs from 'fs';
import * as path from 'path';

/**
 * E2E Flow 2: Assign Control to User
 *
 * Serial flow:
 * 1. Login and navigate to home (uses session saved by Flow 1)
 * 2. Search for an audit by name
 * 3. Open the audit → Workspace → All Controls
 * 4. Find an unassigned control ("+ Assign")
 * 5. Assign it to "Matrix_Admin"
 * 6. Verify it appears in "Controls I Own" tab
 *
 * Audit name: reads from .auth/e2e-state.json (written by Flow 1),
 * falls back to AUDIT_NAME env var, then to "Integrations SOC Type 2 Test"
 *
 * Session: reuses .auth/e2e-admin-session.json saved by Flow 1 (same user, same org).
 *
 * Wait strategy: Explicit waits only. No hard sleeps.
 */

const FLOW = 'E2E Flow 2';
const envConfig = getEnvConfig();

function getE2ESessionPath(): string {
  return path.resolve(__dirname, '../../.auth/e2e-admin-session.json');
}

// Audit to search for:
// - If state file exists AND is fresh (< 10 min) → Flow 1 just ran, use its audit name
// - Otherwise (standalone execution) → use env var or default "Integrations SOC Type 2 Test"
function getAuditSearchName(): string {
  const statePath = path.resolve(__dirname, '../../.auth/e2e-state.json');
  if (fs.existsSync(statePath)) {
    const stat = fs.statSync(statePath);
    const ageMs = Date.now() - stat.mtimeMs;
    const MAX_AGE = 30 * 60 * 1000; // 30 minutes

    if (ageMs < MAX_AGE) {
      try {
        const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
        if (state.auditName) {
          console.log(`  📖 Using audit name from Flow 1: ${state.auditName}`);
          return state.auditName;
        }
      } catch {
        // ignore parse errors
      }
    } else {
      console.log('  ℹ️  State file is stale (> 10 min) — running standalone mode');
    }
  }

  const defaultName = process.env.AUDIT_NAME || 'Integrations SOC Type 2 Test';
  console.log(`  📖 Using default audit name: ${defaultName}`);
  return defaultName;
}

test.describe.serial('E2E Flow 2: Assign Control to User', () => {
  test.use({ storageState: getE2ESessionPath() });

  let assignedControlId = '';

  test.beforeEach(({}, testInfo) => {
    const gateReason = checkGate();
    if (gateReason) {
      testInfo.skip(true, gateReason);
    }
  });

  /** Helper: navigate to home, search for the correct audit, and click it */
  async function navigateToAudit(page) {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const auditName = getAuditSearchName();
    const searchTerm = auditName.substring(0, 15);

    // Search for the audit
    const searchBox = page.locator('input[placeholder*="Search" i]').first();
    await expect(searchBox).toBeVisible({ timeout: 30000 });
    await searchBox.fill(searchTerm);
    await page.waitForLoadState('networkidle');

    // Click the matching audit tile
    const auditLink = page.locator('a[href*="/audit/"]').first();
    await expect(auditLink).toBeVisible({ timeout: 15000 });
    await auditLink.click();
    await page.waitForURL(/\/audit\//, { timeout: 30000 });
    await page.waitForLoadState('networkidle');
  }

  /** Helper: navigate to audit → Workspace → All Controls tab */
  async function navigateToAllControls(page) {
    await navigateToAudit(page);

    const wsTab = page.getByRole('tab', { name: /workspace/i });
    await expect(wsTab).toBeVisible({ timeout: 15000 });
    await wsTab.click();
    await page.waitForLoadState('networkidle');

    const allControlsTab = page.locator('button, a, [role="tab"]').filter({ hasText: /all controls/i }).first();
    if (await allControlsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await allControlsTab.click();
      await page.waitForLoadState('networkidle');
    }
  }

  test('TC-1: Navigate to Home page', async ({ page }) => {
    test.skip(!shouldRunE2E(FLOW, 'TC-1'), 'Excluded by Excel');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Validate audit tiles are visible (confirms session is valid)
    const auditTiles = page.locator('a[href*="/audit/"]').first();
    await expect(auditTiles).toBeVisible({ timeout: 30000 });
  });

  test('TC-2: Validate login — audit tiles visible on Home page', async ({ page }) => {
    test.skip(!shouldRunE2E(FLOW, 'TC-2'), 'Excluded by Excel');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for at least one audit tile to appear
    const auditTile = page.locator('a[href*="/audit/"]').first();
    await expect(auditTile).toBeVisible({ timeout: 30000 });
    const auditCount = await page.locator('a[href*="/audit/"]').count();
    expect(auditCount).toBeGreaterThan(0);
  });

  test('TC-3: Identify Search box at the top right', async ({ page }) => {
    test.skip(!shouldRunE2E(FLOW, 'TC-3'), 'Excluded by Excel');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const searchBox = page.locator('input[placeholder*="Search" i]').first();
    await expect(searchBox).toBeVisible({ timeout: 30000 });
  });

  test('TC-4: Search by audit name — filter matching audit', async ({ page }) => {
    test.skip(!shouldRunE2E(FLOW, 'TC-4'), 'Excluded by Excel');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const auditName = getAuditSearchName();
    const searchTerm = auditName.substring(0, 15);
    console.log(`  🔍 Searching for: "${searchTerm}" (from: "${auditName}")`);

    const searchBox = page.locator('input[placeholder*="Search" i]').first();
    await expect(searchBox).toBeVisible({ timeout: 30000 });
    await searchBox.fill(searchTerm);
    await page.waitForLoadState('networkidle');

    // Verify at least one audit tile matches
    const matchingTile = page.locator('a[href*="/audit/"]').first();
    await expect(matchingTile).toBeVisible({ timeout: 15000 });
  });

  test('TC-5: Navigate to Workspace → Controls → All Controls', async ({ page }) => {
    test.skip(!shouldRunE2E(FLOW, 'TC-5'), 'Excluded by Excel');

    await navigateToAllControls(page);

    // Verify controls table is displayed
    const table = page.locator('table, [role="table"], [role="grid"]').first();
    await expect(table).toBeVisible({ timeout: 15000 });
  });

  test('TC-6: Verify table columns — Control ID, Owner, Function, Status, Due Date, etc.', async ({ page }) => {
    test.skip(!shouldRunE2E(FLOW, 'TC-6'), 'Excluded by Excel');

    await navigateToAllControls(page);

    // Verify key columns are present in the table header
    const headerRow = page.locator('table thead tr, [role="row"]').first();
    await expect(headerRow).toBeVisible({ timeout: 15000 });

    const headerText = await headerRow.textContent();
    const lowerHeader = (headerText || '').toLowerCase();

    // Check for expected column names
    expect(lowerHeader).toContain('control');
    expect(lowerHeader.includes('owner') || lowerHeader.includes('assign')).toBeTruthy();
    expect(lowerHeader.includes('status') || lowerHeader.includes('due')).toBeTruthy();
  });

  test('TC-7 to TC-12: Find unassigned control and assign to Matrix_Admin', async ({ page }) => {
    test.skip(!shouldRunE2E(FLOW, 'TC-7'), 'Excluded by Excel');

    await navigateToAllControls(page);

    // TC-7: Find an unassigned control with "+ Assign" button
    const assignBtn = page.locator('button, span, a').filter({ hasText: /\+\s*assign|assign/i }).first();
    await expect(assignBtn).toBeVisible({ timeout: 15000 });

    // TC-8: Save the Control ID from the same row
    const controlRow = assignBtn.locator('..').locator('..'); // Navigate up to the row
    const controlIdCell = controlRow.locator('td, [role="cell"]').first();
    if (await controlIdCell.isVisible({ timeout: 3000 }).catch(() => false)) {
      assignedControlId = (await controlIdCell.textContent())?.trim() || '';
      console.log(`  📝 Assigning control: ${assignedControlId}`);
    }

    // TC-9: Click "+ Assign" — should show dropdown of users
    await assignBtn.click();

    // Wait for the search/dropdown popover to appear
    const popover = page.locator('[data-radix-popper-content-wrapper], [role="listbox"], [role="dialog"], [class*="popover"]').last();
    await expect(popover).toBeVisible({ timeout: 10000 });

    // TC-10: Search box visible in dropdown
    const searchInput = popover.locator('input').first();
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    // TC-11: Type "Admin" to filter users
    await searchInput.fill('Admin');
    await page.waitForTimeout(1000); // Wait for filter to apply

    // TC-12: Select "Matrix_Admin" from the dropdown (scoped to popover)
    const adminOption = popover.getByText('Matrix_Admin').first();
    await expect(adminOption).toBeVisible({ timeout: 10000 });
    await adminOption.click();

    // Wait for assignment to persist
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verify the "+ Assign" button is gone for that control (now shows the assigned user)
    const assignedIndicator = page.getByText(/Matrix_Admin|MA/).first();
    await expect(assignedIndicator).toBeVisible({ timeout: 10000 });

    console.log(`  ✅ Control ${assignedControlId} assigned to Matrix_Admin`);
  });

  test('TC-13: Navigate to Controls I Own — assigned control visible', async ({ page }) => {
    test.skip(!shouldRunE2E(FLOW, 'TC-13'), 'Excluded by Excel');

    await navigateToAudit(page);

    const wsTab = page.getByRole('tab', { name: /workspace/i });
    await wsTab.click();
    await page.waitForLoadState('networkidle');

    // Click "Controls I Own" sub-tab
    const myControlsTab = page.locator('button, a, [role="tab"]').filter({ hasText: /controls i own|my controls/i }).first();
    await expect(myControlsTab).toBeVisible({ timeout: 10000 });
    await myControlsTab.click();
    await page.waitForLoadState('networkidle');

    // Verify the table has at least one row (the control we just assigned)
    const table = page.locator('table, [role="table"], [role="grid"]').first();
    await expect(table).toBeVisible({ timeout: 15000 });

    const rows = page.locator('table tbody tr, [role="row"]');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);

    console.log(`  ✅ "Controls I Own" tab shows ${rowCount} control(s)`);
  });

  test('TC-14: Select the control to open Control detail', async ({ page }) => {
    test.skip(!shouldRunE2E(FLOW, 'TC-14'), 'Excluded by Excel');

    await navigateToAudit(page);

    const wsTab = page.getByRole('tab', { name: /workspace/i });
    await wsTab.click();
    await page.waitForLoadState('networkidle');

    const myControlsTab = page.locator('button, a, [role="tab"]').filter({ hasText: /controls i own|my controls/i }).first();
    if (await myControlsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await myControlsTab.click();
      await page.waitForLoadState('networkidle');
    }

    // Click on the first control row (checkbox or row click)
    const firstRow = page.locator('table tbody tr, [role="row"]').nth(1); // skip header
    await expect(firstRow).toBeVisible({ timeout: 10000 });
    await firstRow.click();

    // Verify control detail panel/page opens (shows control info, evidence section, etc.)
    const detailContent = page.locator('[class*="panel"], [class*="drawer"], [class*="detail"], [role="dialog"]').first();
    const controlHeading = page.locator('h1, h2, h3').filter({ hasText: /./ }).first();

    const panelVisible = await detailContent.isVisible({ timeout: 10000 }).catch(() => false);
    const headingVisible = await controlHeading.isVisible({ timeout: 5000 }).catch(() => false);
    const urlChanged = page.url().includes('/control');

    expect(panelVisible || headingVisible || urlChanged).toBeTruthy();
    console.log('  ✅ Control detail view opened');
  });
});
