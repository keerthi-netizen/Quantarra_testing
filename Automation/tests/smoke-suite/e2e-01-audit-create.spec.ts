import { test, expect } from './base-fixture';
import { dismissWizard } from '../../src/helpers/auth';
import { getSmokeAdmin } from './test-data';
import * as fs from 'fs';
import * as path from 'path';

/**
 * TG-6: Audit Lifecycle — Create New Audit
 * Source: New_testcase.xlsx → TC-18 (Steps 1-17)
 *
 * Actual DOM elements (from inspection):
 *   - "Create new" button: button[aria-label="Create new"]
 *   - Dropdown item: div[role="menuitem"] text "Create audit"
 *   - Dialog fields:
 *       Audit name:   input#audit-name (placeholder="e.g. SOC 2 Annual Audit")
 *       Framework:    input[placeholder="Search frameworks..."] → click/type → select from dropdown
 *       Start date:   input#audit-start (type="date")
 *       Due date:     input#audit-due (type="date")
 *       Assigned to:  input[placeholder="Search users..."]
 *       Ext auditor:  input[placeholder="Invite an external auditor first…"]
 *       Int auditor:  input[placeholder="Invite a third-party internal auditor first…"]
 *       Teams:        input[placeholder="Search teams..."]
 *       Description:  textarea#audit-desc
 *   - Close: button text "Close"
 *   - Submit: button text "Create audit" (disabled until name + framework filled)
 *
 * Audit name format: RG-SOC2-{YYYYMMDD}-{increment}
 */

function generateAuditName(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const increment = String(Math.floor(Math.random() * 99) + 1).padStart(2, '0');
  const fw = process.env.FRAMEWORK_TYPE && process.env.FRAMEWORK_TYPE !== 'N/A'
    ? process.env.FRAMEWORK_TYPE.substring(0, 10).replace(/\s+/g, '')
    : 'SOC2';
  return `RG-${fw}-${date}-${increment}`;
}

function getTodayDate(): string {
  const now = new Date();
  return now.toISOString().slice(0, 10); // YYYY-MM-DD
}

function getDueDatePlus1Year(): string {
  const now = new Date();
  now.setFullYear(now.getFullYear() + 1);
  return now.toISOString().slice(0, 10); // YYYY-MM-DD
}

test.describe('TG-6: Audit Lifecycle — Create New Audit', () => {
  test('TC-18: Create new Audit — Steps 1 to 17', async ({ page }) => {
    const admin = getSmokeAdmin();
    const auditName = generateAuditName();

    // === LOGIN ===
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="email"], input[name="email"]').first().fill(admin.email);
    await page.locator('input[type="password"]').first().fill(admin.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    await dismissWizard(page);

    // === Step 1: Click "Create new" button ===
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const createNewBtn = page.locator('button[aria-label="Create new"]');
    await expect(createNewBtn).toBeVisible({ timeout: 10000 });
    await createNewBtn.click();
    await page.waitForTimeout(1000);

    // === Step 2: Select "Create audit" from dropdown ===
    const createAuditItem = page.locator('[role="menuitem"]').filter({ hasText: /^Create audit$/ });
    await expect(createAuditItem).toBeVisible({ timeout: 5000 });
    await createAuditItem.click();
    await page.waitForTimeout(1500);

    // === Step 3: Slide bar opens — verify Close button and close it ===
    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const closeBtn = dialog.locator('button').filter({ hasText: /^Close$/ });
    await expect(closeBtn).toBeVisible({ timeout: 3000 });
    await closeBtn.click();
    await page.waitForTimeout(500);

    // === Step 4: Re-open ===
    await createNewBtn.click();
    await page.waitForTimeout(500);
    await createAuditItem.click();
    await page.waitForTimeout(1500);
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // === Step 5: "Create audit" button should be DISABLED ===
    const submitBtn = dialog.locator('button').filter({ hasText: /^Create audit$/ });
    await expect(submitBtn).toBeDisabled();

    // === Step 6: Fill Audit Name ===
    const nameInput = page.locator('input#audit-name');
    await nameInput.fill(auditName);
    await page.waitForTimeout(500);

    // === Step 7: Button still disabled (no framework yet) ===
    await expect(submitBtn).toBeDisabled();

    // === Step 8: Select Framework — from FRAMEWORK_TYPE env or default SOC 2 Type 2 ===
    const frameworkName = process.env.FRAMEWORK_TYPE && process.env.FRAMEWORK_TYPE !== 'N/A'
      ? process.env.FRAMEWORK_TYPE
      : 'SOC 2 Type 2';
    const searchTerm = frameworkName.substring(0, Math.min(frameworkName.length, 8));

    const frameworkInput = page.locator('input[placeholder="Search frameworks..."]');
    await frameworkInput.click();
    await page.waitForTimeout(500);
    await frameworkInput.fill(searchTerm);
    await page.waitForTimeout(1000);

    // Click the framework option — use getByText with exact or partial match
    const fwOption = dialog.getByText(frameworkName, { exact: true }).first();
    if (await fwOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await fwOption.click();
    } else {
      // Some frameworks have badge prefix — try clicking text that contains the name
      const fwFallback = dialog.getByText(frameworkName).first();
      await fwFallback.click({ timeout: 5000 });
    }
    await page.waitForTimeout(1000);

    // Some frameworks (CyFun, CIS) require an "Assurance level" selection
    const levelSelect = dialog.locator('select');
    if (await levelSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      const options = await levelSelect.locator('option').allTextContents();
      const firstLevel = options.find(o => o && !o.includes('Select'));
      if (firstLevel) {
        await levelSelect.selectOption({ label: firstLevel });
        await page.waitForTimeout(500);
      }
    }

    // === Step 9: "Create audit" button should be ENABLED ===
    await expect(submitBtn).toBeEnabled({ timeout: 5000 });

    // === Step 10: Start date — today ===
    const startDateInput = page.locator('input#audit-start');
    await startDateInput.fill(getTodayDate());
    await page.waitForTimeout(300);

    // === Step 11: Due date — 1 year from start date ===
    const dueDateInput = page.locator('input#audit-due');
    await dueDateInput.fill(getDueDatePlus1Year());
    await page.waitForTimeout(300);

    // === Step 12: Assigned to — select current logged-in user (Matrix_Admin) ===
    const assignedInput = page.locator('input[placeholder="Search users..."]');
    await assignedInput.click();
    await page.waitForTimeout(1000);

    // Dropdown shows users — select "Matrix_Admin" from within the dialog (not header)
    const adminUserOption = dialog.getByText('Matrix_Admin').last();
    await expect(adminUserOption).toBeVisible({ timeout: 5000 });
    await adminUserOption.click();
    await page.waitForTimeout(500);

    // === Step 13: Internal Auditor — leave blank (placeholder says "Invite a third-party...") ===
    // === Step 14: External Auditor — leave blank (placeholder says "Invite an external...") ===
    // === Step 15: Teams — leave blank ===

    // === Step 16: Description — use audit name ===
    const descInput = page.locator('textarea#audit-desc');
    await descInput.fill(auditName);
    await page.waitForTimeout(300);

    // === Step 17: Click "Create Audit" button ===
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();
    await page.waitForTimeout(5000);

    // Verify: Audit created — dialog should close and either:
    // 1. Page navigates to /audit/{id}
    // 2. Home page shows the new audit tile
    // 3. Dialog disappears (success)
    const dialogClosed = await dialog.isHidden().catch(() => true);
    const navigatedToAudit = page.url().includes('/audit/');
    const tileVisible = await page.locator('a[href*="/audit/"]')
      .filter({ hasText: new RegExp(auditName.substring(0, 8)) })
      .isVisible({ timeout: 5000 }).catch(() => false);

    const success = dialogClosed || navigatedToAudit || tileVisible;
    expect(success).toBeTruthy();

    // Write audit name to shared state file for downstream E2E flows (Flow 2, etc.)
    const stateDir = path.resolve(__dirname, '../../.auth');
    fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(
      path.join(stateDir, 'e2e-state.json'),
      JSON.stringify({ auditName, createdAt: new Date().toISOString() }, null, 2),
    );
    console.log(`  ✅ Audit created: ${auditName} (saved to .auth/e2e-state.json)`);
  });
});
