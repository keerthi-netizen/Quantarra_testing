import { test, expect } from '@playwright/test';
import { login, dismissWizard } from '../../src/helpers/auth';

test.describe('Mission Control — Client Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'mc-admin');
    await dismissWizard(page);
  });

  test('MC dashboard loads after login', async ({ page }) => {
    await expect(page).not.toHaveURL(/login/);
    const heading = page.locator('h1, h2, h3').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('clients page loads', async ({ page }) => {
    await page.goto('/clients');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/clients/);
  });

  test('sidebar has nav items', async ({ page }) => {
    const navLinks = page.locator('nav a, aside a');
    const count = await navLinks.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });
});
