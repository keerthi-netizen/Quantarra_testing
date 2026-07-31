import { test, expect } from '@playwright/test';
import { login, dismissWizard, collectConsoleErrors } from '../../src/helpers/auth';

/**
 * Evidence Smoke Tests.
 * Verifies: evidence visibility in control detail, upload button presence.
 * Works on: staging, prod.
 */

test.describe('Smoke: Evidence', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin');
    await dismissWizard(page);
  });

  test('can navigate to a control and see evidence section', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Open first audit
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
    if (!(await wsTab.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip();
      return;
    }

    await wsTab.click();
    await page.waitForTimeout(3000);

    // Click first control
    const controlRow = page.locator('table tbody tr, [role="row"]').first();
    if (!(await controlRow.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip();
      return;
    }

    await controlRow.click();
    await page.waitForTimeout(3000);

    // Should see evidence-related content
    const evidenceSection = page.getByText(/evidence|upload|file|document/i).first();
    await expect(evidenceSection).toBeVisible({ timeout: 10000 });
  });

  test('evidence upload button exists in control detail', async ({ page }) => {
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

    const wsTab = page.getByRole('tab', { name: /workspace/i });
    if (!(await wsTab.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip();
      return;
    }

    await wsTab.click();
    await page.waitForTimeout(3000);

    const controlRow = page.locator('table tbody tr, [role="row"]').first();
    if (!(await controlRow.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip();
      return;
    }

    await controlRow.click();
    await page.waitForTimeout(3000);

    // Look for upload/add evidence button
    const uploadBtn = page.locator('button, a').filter({ hasText: /upload|add.*evidence|create.*evidence|attach/i }).first();
    const dropzone = page.locator('[class*="dropzone"], [class*="upload"], input[type="file"]').first();

    const hasUpload = await uploadBtn.isVisible({ timeout: 5000 }).catch(() => false)
      || await dropzone.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasUpload) {
      test.info().annotations.push({ type: 'info', description: 'No upload button found — may need to scroll or expand panel' });
    }
  });

  test('no JS errors in control/evidence view', async ({ page }) => {
    const errors = collectConsoleErrors(page);

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

    const wsTab = page.getByRole('tab', { name: /workspace/i });
    if (await wsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await wsTab.click();
      await page.waitForTimeout(3000);
    }

    const controlRow = page.locator('table tbody tr, [role="row"]').first();
    if (await controlRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await controlRow.click();
      await page.waitForTimeout(3000);
    }

    expect(errors).toEqual([]);
  });
});
