import { test, expect } from '@playwright/test';
import { login, loginWith, dismissWizard, collectConsoleErrors } from '../../src/helpers/auth';
import { getTestUser, getEnvConfig } from '../../src/config/environment';

/**
 * Auth & Navigation Smoke Tests.
 * Verifies login, session handling, and core navigation.
 * Works on: staging, prod.
 */

const envConfig = getEnvConfig();

test.describe('Smoke: Login Flows', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('admin login succeeds and redirects to dashboard', async ({ page }) => {
    await login(page, 'admin');
    await expect(page).not.toHaveURL(/login/);
    // Should land on dashboard or home
    await page.waitForLoadState('networkidle');
    const pageContent = page.locator('main, [role="main"]').first();
    await expect(pageContent).toBeVisible({ timeout: 15000 });
  });

  test('invalid credentials show error and stay on login', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="email"], input[name="email"]').first().fill('bad@example.com');
    await page.locator('input[type="password"]').first().fill('WrongPassword!');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(3000);
    // Should stay on login page
    await expect(page).toHaveURL(/login/);
  });

  test('unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/login/);
  });

  test('no JS console errors on login page', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto('/login');
    await page.waitForTimeout(3000);
    expect(errors).toEqual([]);
  });
});

test.describe('Smoke: Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin');
    await dismissWizard(page);
  });

  test('sidebar/navigation is visible after login', async ({ page }) => {
    const nav = page.locator('nav, aside').first();
    await expect(nav).toBeVisible({ timeout: 10000 });
  });

  test('can navigate to Pulse page', async ({ page }) => {
    await page.goto('/pulse');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/pulse/);
  });

  test('can navigate to Policies page', async ({ page }) => {
    await page.goto('/policies');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/policies/);
  });

  test('can navigate to Admin page', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/admin/);
  });

  test('can navigate to Documents page', async ({ page }) => {
    await page.goto('/documents');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/documents/);
  });

  test('no JS errors during navigation', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto('/pulse');
    await page.waitForTimeout(2000);
    await page.goto('/policies');
    await page.waitForTimeout(2000);
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    expect(errors).toEqual([]);
  });
});
