import { type Page, expect } from '@playwright/test';
import { getTestUser, type TestUser } from '../config/environment';

/** Known React/framework errors to ignore in console error checks */
const IGNORED_ERRORS = [/Minified React error #418/, /Minified React error #423/];

/**
 * Log in via the /login form using environment-configured credentials.
 */
export async function login(
  page: Page,
  role: 'admin' | 'manager' | 'contributor' | 'mc-admin' = 'admin',
): Promise<TestUser> {
  const user = getTestUser(role);

  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  await emailInput.fill(user.email);

  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill(user.password);

  await page.locator('button[type="submit"]').click();

  // Wait for redirect away from login
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });

  // Wait for an authenticated API call to succeed
  await page.waitForResponse(
    (res) => res.url().includes('/api/v1/') && res.status() === 200,
    { timeout: 10000 },
  ).catch(() => {});

  await page.waitForTimeout(500);

  return user;
}

/**
 * Login with custom credentials (not from env config).
 */
export async function loginWith(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  await page.locator('input[type="email"], input[name="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('button[type="submit"]').click();

  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
  await page.waitForTimeout(500);
}

/**
 * Dismiss the onboarding wizard if it appears.
 * Excludes the AI context panel ("Close context panel" button).
 */
export async function dismissWizard(page: Page): Promise<void> {
  const skipBtn = page.getByRole('button', { name: /skip|close|dismiss|later|not now/i })
    .filter({ hasNot: page.locator('[aria-label="Close context panel"]') });
  const completeBtn = page.getByRole('button', { name: /complete|finish|done|get started/i });

  if (await skipBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
    await skipBtn.first().click().catch(() => {});
  } else if (await completeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await completeBtn.click().catch(() => {});
  }

  // Wait for any overlay to close
  await page
    .locator('[data-state="open"][aria-hidden="true"]')
    .waitFor({ state: 'hidden', timeout: 3000 })
    .catch(() => {});
}

/**
 * Navigate using client-side routing (preserves auth token in SPA).
 */
export async function navigateTo(page: Page, path: string): Promise<void> {
  const link = page.locator(`nav a[href="${path}"], aside a[href="${path}"]`).first();

  if (await link.isVisible({ timeout: 1000 }).catch(() => false)) {
    await link.click();
  } else {
    await page.goto(path);
  }

  await page.waitForLoadState('domcontentloaded');
}

/**
 * Collect JS console errors, filtering known framework noise.
 */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];

  page.on('pageerror', (err) => {
    if (!IGNORED_ERRORS.some((pattern) => pattern.test(err.message))) {
      errors.push(err.message);
    }
  });

  return errors;
}

/**
 * Get an API auth token for direct API testing.
 */
export async function getApiToken(
  request: { post: Function },
  baseUrl: string,
  role: 'admin' | 'manager' | 'contributor' | 'mc-admin' = 'admin',
): Promise<string> {
  const user = getTestUser(role);
  const res = await request.post(`${baseUrl}/auth/login`, {
    data: { email: user.email, password: user.password },
  });
  const body = await res.json();

  return body.accessToken;
}

/**
 * Take a timestamped screenshot for evidence.
 */
export async function takeEvidence(page: Page, name: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = `./reports/screenshots/${name}-${timestamp}.png`;
  await page.screenshot({ path: filePath, fullPage: true });

  return filePath;
}
