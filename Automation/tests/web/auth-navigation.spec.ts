import { test, expect } from '@playwright/test';
import { login, dismissWizard, navigateTo, collectConsoleErrors } from '../../src/helpers/auth';

test.describe('Authentication Flows', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should redirect to dashboard on valid login (admin)', async ({ page }) => {
    await login(page, 'admin');
    await expect(page).not.toHaveURL(/login/);
  });

  test('should redirect to dashboard on valid login (manager)', async ({ page }) => {
    await login(page, 'manager');
    await expect(page).not.toHaveURL(/login/);
  });

  test('should show error on wrong password', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"], input[name="email"]').first().fill('admin@acme.com');
    await page.locator('input[type="password"]').first().fill('WrongPassword123!');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/login/);
  });

  test('should redirect unauthenticated user to login', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/login/);
  });
});

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin');
    await dismissWizard(page);
  });

  test('sidebar is visible with nav items', async ({ page }) => {
    await expect(page.locator('nav, aside').first()).toBeVisible({ timeout: 10000 });
  });

  test('navigate to Pulse page', async ({ page }) => {
    await navigateTo(page, '/pulse');
    await expect(page.getByRole('tab').first()).toBeVisible({ timeout: 10000 });
  });

  test('navigate to Policies page', async ({ page }) => {
    await navigateTo(page, '/policies');
    await expect(page.getByText(/policy/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('navigate to Admin page', async ({ page }) => {
    await navigateTo(page, '/admin');
    await expect(page.getByText(/user/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('no JS console errors on navigation', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await navigateTo(page, '/pulse');
    await page.waitForTimeout(2000);
    await navigateTo(page, '/policies');
    await page.waitForTimeout(2000);
    expect(errors).toEqual([]);
  });
});

test.describe('Permission Gating', () => {
  test('Contributor cannot see admin navigation', async ({ page }) => {
    await login(page, 'contributor');
    await dismissWizard(page);
    const adminLink = page.getByRole('link', { name: /admin|users|roles|settings/i });
    await expect(adminLink).not.toBeVisible({ timeout: 5000 });
  });

  test('Administrator can see admin navigation', async ({ page }) => {
    await login(page, 'admin');
    await dismissWizard(page);
    const adminIndicator = page.locator('a[href*="admin"], a[href*="users"], a[href*="roles"]').first();
    await expect(adminIndicator).toBeVisible({ timeout: 10000 });
  });
});
