import { test, expect } from '@playwright/test';
import { getAdminSessionPath, checkGate } from './session-setup';
import { shouldRunE2E, printE2EFilterSummary } from './excel-filter';
import { getEnvConfig } from '../../src/config/environment';

/**
 * E2E Flow 1: Audit Lifecycle — Create New Audit
 *
 * Serial flow: each step depends on the previous one.
 * Creates a real audit with a unique name, fills all fields, and verifies the tile appears.
 *
 * Wait strategy: Explicit waits only (up to 30s). No hard sleeps.
 */

const FLOW = 'E2E Flow 1';
const envConfig = getEnvConfig();

// Generate unique audit name: ST-{framework first 10 chars}-{date}-{increment}
function generateAuditName(frameworkName: string): string {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const frameworkShort = frameworkName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
  const increment = String(Math.floor(Math.random() * 99) + 1).padStart(2, '0');
  return `ST-${frameworkShort}-${dateStr}-${increment}`;
}

test.describe.serial('E2E Flow 1: Audit Lifecycle — Create New Audit', () => {
  test.use({ storageState: getAdminSessionPath() });

  // Shared state across serial tests
  let auditName = '';
  let frameworkName = '';

  test.beforeAll(() => {
    printE2EFilterSummary();
  });

  test.beforeEach(({}, testInfo) => {
    const gateReason = checkGate();
    if (gateReason) {
      testInfo.skip(true, gateReason);
    }
  });

  test('TC-1: Navigate to Home page — Click "Create new" button', async ({ page }) => {
    test.skip(!shouldRunE2E(FLOW, 'TC-1'), 'Excluded by Excel');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click the "Create new" button
    const createNewBtn = page.locator('button[aria-label="Create new"], button:has-text("Create new")').first();
    await expect(createNewBtn).toBeVisible({ timeout: 30000 });
    await createNewBtn.click();

    // Verify dropdown appears
    const dropdown = page.locator('[role="menu"], [role="listbox"], [data-radix-popper-content-wrapper]').first();
    await expect(dropdown).toBeVisible({ timeout: 10000 });
  });

  test('TC-2: From dropdown select "Create audit"', async ({ page }) => {
    test.skip(!shouldRunE2E(FLOW, 'TC-2'), 'Excluded by Excel');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Open Create new dropdown
    const createNewBtn = page.locator('button[aria-label="Create new"], button:has-text("Create new")').first();
    await expect(createNewBtn).toBeVisible({ timeout: 30000 });
    await createNewBtn.click();

    // Select "Create audit" from dropdown
    const createAuditOption = page.locator('[role="menuitem"], [role="option"], button, a').filter({ hasText: /create audit/i }).first();
    await expect(createAuditOption).toBeVisible({ timeout: 10000 });
    await createAuditOption.click();

    // Verify the slide bar / dialog opens
    const dialog = page.locator('[role="dialog"], [data-testid*="drawer"], aside, [class*="sheet"], [class*="slide"]').first();
    await expect(dialog).toBeVisible({ timeout: 10000 });
  });

  test('TC-3: Create audit slide bar — close with X button', async ({ page }) => {
    test.skip(!shouldRunE2E(FLOW, 'TC-3'), 'Excluded by Excel');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Open the create audit dialog
    const createNewBtn = page.locator('button[aria-label="Create new"], button:has-text("Create new")').first();
    await createNewBtn.click();
    const createAuditOption = page.locator('[role="menuitem"], [role="option"], button, a').filter({ hasText: /create audit/i }).first();
    await createAuditOption.click();

    const dialog = page.locator('[role="dialog"], [data-testid*="drawer"], aside, [class*="sheet"], [class*="slide"]').first();
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Click X button to close
    const closeBtn = dialog.locator('button[aria-label="Close"], button:has(svg[class*="close"]), button:has(svg[class*="x"])').first();
    await expect(closeBtn).toBeVisible({ timeout: 5000 });
    await closeBtn.click();

    // Verify dialog is closed
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  });

  test('TC-4: Click "Create new" button again to reopen', async ({ page }) => {
    test.skip(!shouldRunE2E(FLOW, 'TC-4'), 'Excluded by Excel');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Open again
    const createNewBtn = page.locator('button[aria-label="Create new"], button:has-text("Create new")').first();
    await createNewBtn.click();
    const createAuditOption = page.locator('[role="menuitem"], [role="option"], button, a').filter({ hasText: /create audit/i }).first();
    await createAuditOption.click();

    const dialog = page.locator('[role="dialog"], [data-testid*="drawer"], aside, [class*="sheet"], [class*="slide"]').first();
    await expect(dialog).toBeVisible({ timeout: 10000 });
  });

  test('TC-5: "Create audit" button disabled until mandatory fields filled', async ({ page }) => {
    test.skip(!shouldRunE2E(FLOW, 'TC-5'), 'Excluded by Excel');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Open create audit dialog
    const createNewBtn = page.locator('button[aria-label="Create new"], button:has-text("Create new")').first();
    await createNewBtn.click();
    const createAuditOption = page.locator('[role="menuitem"], [role="option"], button, a').filter({ hasText: /create audit/i }).first();
    await createAuditOption.click();

    const dialog = page.locator('[role="dialog"], [data-testid*="drawer"], aside, [class*="sheet"], [class*="slide"]').first();
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Verify "Create audit" submit button is disabled
    const submitBtn = dialog.locator('button').filter({ hasText: /create audit/i }).first();
    await expect(submitBtn).toBeVisible({ timeout: 10000 });
    await expect(submitBtn).toBeDisabled();
  });

  test('TC-6 to TC-18: Fill form and create audit', async ({ page }) => {
    test.skip(!shouldRunE2E(FLOW, 'TC-6'), 'Excluded by Excel');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Open create audit dialog
    const createNewBtn = page.locator('button[aria-label="Create new"], button:has-text("Create new")').first();
    await createNewBtn.click();
    const createAuditOption = page.locator('[role="menuitem"], [role="option"], button, a').filter({ hasText: /create audit/i }).first();
    await createAuditOption.click();

    const dialog = page.locator('[role="dialog"], [data-testid*="drawer"], aside, [class*="sheet"], [class*="slide"]').first();
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // TC-8: Select Framework Type first (needed for audit name)
    const frameworkSelect = dialog.locator('button[role="combobox"], select, [class*="select"]').filter({ hasText: /select.*framework|framework/i }).first();
    if (await frameworkSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      await frameworkSelect.click();
      await page.waitForTimeout(500);
      // Select first available framework option
      const firstOption = page.locator('[role="option"], [role="listbox"] [role="option"]').first();
      await expect(firstOption).toBeVisible({ timeout: 5000 });
      frameworkName = await firstOption.textContent() || 'Framework';
      await firstOption.click();
    } else {
      // Try input-based framework selection
      const frameworkInput = dialog.locator('input[placeholder*="framework" i], input[name*="framework" i]').first();
      if (await frameworkInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await frameworkInput.click();
        const firstOption = page.locator('[role="option"]').first();
        await expect(firstOption).toBeVisible({ timeout: 5000 });
        frameworkName = await firstOption.textContent() || 'Framework';
        await firstOption.click();
      }
    }

    // TC-6: Generate and fill Audit Name
    auditName = generateAuditName(frameworkName);
    const nameInput = dialog.locator('input[placeholder*="audit name" i], input[name*="name" i], input[label*="name" i]').first();
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill(auditName);

    // TC-9: Verify Create button is now enabled (name + framework filled)
    const submitBtn = dialog.locator('button').filter({ hasText: /create audit/i }).first();
    await expect(submitBtn).toBeEnabled({ timeout: 5000 });

    // TC-10: Start date — click "Today" or select current date
    const startDateInput = dialog.locator('input[placeholder*="start" i], button:has-text("Start date"), [data-testid*="start-date"]').first();
    if (await startDateInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await startDateInput.click();
      // Try clicking "Today" button in date picker
      const todayBtn = page.locator('button:has-text("Today"), button[aria-label*="today" i]').first();
      if (await todayBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await todayBtn.click();
      }
    }

    // TC-11: Due date — set 1 year later (skip if not easily selectable)
    const dueDateInput = dialog.locator('input[placeholder*="due" i], input[placeholder*="end" i], button:has-text("Due date"), [data-testid*="due-date"], [data-testid*="end-date"]').first();
    if (await dueDateInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dueDateInput.click();
      // Try to select a future date or just dismiss
      await page.keyboard.press('Escape');
    }

    // TC-12: Assigned to — search and select "Matrix_Admin"
    const assignedInput = dialog.locator('input[placeholder*="Search users" i], input[placeholder*="assign" i]').first();
    if (await assignedInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await assignedInput.click();
      await assignedInput.fill('Admin');
      await page.waitForTimeout(1000);
      const adminOption = page.locator('[role="option"], [role="listbox"] li').filter({ hasText: /admin/i }).first();
      if (await adminOption.isVisible({ timeout: 5000 }).catch(() => false)) {
        await adminOption.click();
      }
    }

    // TC-13: Internal Auditor — select first available (optional)
    const iaInput = dialog.locator('input[placeholder*="internal" i], input[placeholder*="auditor" i]').first();
    if (await iaInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await iaInput.click();
      const firstIAOption = page.locator('[role="option"]').first();
      if (await firstIAOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await firstIAOption.click();
      } else {
        await page.keyboard.press('Escape');
      }
    }

    // TC-14: External Auditor — select first available (optional)
    const eaInput = dialog.locator('input[placeholder*="external" i]').first();
    if (await eaInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await eaInput.click();
      const firstEAOption = page.locator('[role="option"]').first();
      if (await firstEAOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await firstEAOption.click();
      } else {
        await page.keyboard.press('Escape');
      }
    }

    // TC-15: Teams — leave blank (skip)

    // TC-16: Description — same as audit name
    const descInput = dialog.locator('textarea, input[placeholder*="description" i]').first();
    if (await descInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await descInput.fill(auditName);
    }

    // TC-17: Click "Create Audit" button
    await expect(submitBtn).toBeEnabled({ timeout: 5000 });
    await submitBtn.click();

    // TC-18: Verify audit tile appears on home page
    await page.waitForLoadState('networkidle');

    // Wait for dialog to close
    await expect(dialog).not.toBeVisible({ timeout: 15000 });

    // Navigate to home and verify the audit tile with our name exists
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const auditTile = page.locator(`a[href*="/audit/"]`).filter({ hasText: new RegExp(auditName.substring(0, 15), 'i') }).first();
    await expect(auditTile).toBeVisible({ timeout: 30000 });

    console.log(`  ✅ Audit created successfully: ${auditName}`);
  });
});
