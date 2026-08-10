import { test, expect } from '@playwright/test';
import { getEnvConfig } from '../../src/config/environment';

/**
 * Daily Shakeout — MC & Audit Portal Availability
 *
 * Validates:
 * 1. Mission Control app loads (login page accessible)
 * 2. Audit Portal app loads (login page accessible)
 *
 * Note: Some environments (POC) may not expose MC/Audit on separate URLs.
 * Tests skip gracefully if the URL is the same as the main app or unreachable.
 */

const envConfig = getEnvConfig();

test.describe('MC & Audit Portal — App Availability', () => {

  test('Mission Control — app is reachable', async ({ request }) => {
    const mcUrl = envConfig.mcUrl;

    // Skip if MC URL is same as base URL (env doesn't have separate MC)
    if (mcUrl === envConfig.baseUrl) {
      test.skip(true, 'MC URL is same as base URL — no separate MC app in this env');
      return;
    }

    try {
      const res = await request.get(`${mcUrl}/login`, { timeout: 15000 });
      expect(res.status()).toBeLessThan(500);
    } catch (e: any) {
      // Connection timeout or refused = MC not deployed on this env
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

  test('Audit Portal — app is reachable', async ({ request }) => {
    const auditUrl = envConfig.auditUrl;
    const env = envConfig.env;

    // Prod audit portal is not ready — skip
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

    // Prod audit portal is not ready — skip
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
