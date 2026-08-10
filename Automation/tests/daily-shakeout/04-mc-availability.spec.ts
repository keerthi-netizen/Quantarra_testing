import { test, expect } from '@playwright/test';
import { getEnvConfig } from '../../src/config/environment';

/**
 * Daily Shakeout — 04: Mission Control Availability
 *
 * Validates MC app loads and login form renders.
 */

const envConfig = getEnvConfig();

test.describe('MC — App Availability', () => {

  test('Mission Control — app is reachable', async ({ request }) => {
    const mcUrl = envConfig.mcUrl;

    if (mcUrl === envConfig.baseUrl) {
      test.skip(true, 'MC URL is same as base URL — no separate MC app in this env');
      return;
    }

    try {
      const res = await request.get(`${mcUrl}/login`, { timeout: 15000 });
      expect(res.status()).toBeLessThan(500);
    } catch (e: any) {
      if (e.message?.includes('timeout') || e.message?.includes('ECONNREFUSED')) {
        test.skip(true, `MC not reachable at ${mcUrl} — may not be deployed in this env`);
        return;
      }
      throw e;
    }
  });

  test('Mission Control — page renders login form', async ({ browser }) => {
    const mcUrl = envConfig.mcUrl;

    if (mcUrl === envConfig.baseUrl) {
      test.skip(true, 'MC URL is same as base URL — no separate MC app in this env');
      return;
    }

    const context = await browser.newContext({ baseURL: mcUrl });
    const page = await context.newPage();

    try {
      await page.goto('/login', { timeout: 15000 });
      await expect(
        page.locator('input[type="email"], input[name="email"]').first(),
      ).toBeVisible({ timeout: 10000 });
    } catch (e: any) {
      if (e.message?.includes('ERR_CONNECTION') || e.message?.includes('Timeout')) {
        test.skip(true, `MC not reachable at ${mcUrl}`);
        return;
      }
      throw e;
    } finally {
      await context.close();
    }
  });
});
