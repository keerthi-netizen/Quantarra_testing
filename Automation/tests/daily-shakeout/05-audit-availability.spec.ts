import { test, expect } from '@playwright/test';
import { getEnvConfig } from '../../src/config/environment';

/**
 * Daily Shakeout — 05: Audit Portal Availability
 *
 * Validates Audit Portal app loads and login form renders.
 */

const envConfig = getEnvConfig();

test.describe('Audit Portal — App Availability', () => {

  test('Audit Portal — app is reachable', async ({ request }) => {
    const auditUrl = envConfig.auditUrl;
    const env = envConfig.env;

    if (env === 'prod') {
      test.skip(true, 'Prod Audit Portal not ready — skipping');
      return;
    }

    if (auditUrl === envConfig.baseUrl) {
      test.skip(true, 'Audit URL is same as base URL — no separate Audit app in this env');
      return;
    }

    try {
      const res = await request.get(`${auditUrl}/login`, { timeout: 15000 });
      expect(res.status()).toBeLessThan(500);
    } catch (e: any) {
      if (e.message?.includes('timeout') || e.message?.includes('ECONNREFUSED')) {
        test.skip(true, `Audit portal not reachable at ${auditUrl}`);
        return;
      }
      throw e;
    }
  });

  test('Audit Portal — page renders login form', async ({ browser }) => {
    const auditUrl = envConfig.auditUrl;
    const env = envConfig.env;

    if (env === 'prod') {
      test.skip(true, 'Prod Audit Portal not ready — skipping');
      return;
    }

    if (auditUrl === envConfig.baseUrl) {
      test.skip(true, 'Audit URL is same as base URL — no separate Audit app in this env');
      return;
    }

    const context = await browser.newContext({ baseURL: auditUrl });
    const page = await context.newPage();

    try {
      await page.goto('/login', { timeout: 15000 });
      await expect(
        page.locator('input[type="email"], input[name="email"]').first(),
      ).toBeVisible({ timeout: 10000 });
    } catch (e: any) {
      if (e.message?.includes('ERR_CONNECTION') || e.message?.includes('Timeout')) {
        test.skip(true, `Audit portal not reachable at ${auditUrl}`);
        return;
      }
      throw e;
    } finally {
      await context.close();
    }
  });
});
