import { test, expect } from '@playwright/test';
import { dismissWizard } from '../../src/helpers/auth';
import { getSmokeAdmin } from './test-data';

/**
 * Console Error Monitor
 * Navigates through every page + tabs and captures JS console errors.
 * Reports all errors grouped by page at the end.
 */

interface ConsoleError {
  page: string;
  action: string;
  message: string;
}

const IGNORED_PATTERNS = [
  /Minified React error #418/,
  /Minified React error #423/,
  /ResizeObserver loop/,
  /Failed to load resource.*favicon/,
  /Download the React DevTools/,
];

function shouldIgnore(msg: string): boolean {
  return IGNORED_PATTERNS.some((p) => p.test(msg));
}

/** All pages to check */
const PAGES = [
  { name: 'Home', path: '/' },
  { name: 'Audit Groups', path: '/audit-groups' },
  { name: 'Pulse', path: '/pulse' },
  { name: 'Policies', path: '/policies' },
  { name: 'Analytics', path: '/analytics' },
  { name: 'Reports', path: '/reports' },
  { name: 'Integrations', path: '/integrations' },
  { name: 'Policy to Control Analyzer', path: '/policy-analyzer' },
  { name: 'Guides', path: '/guides' },
  { name: 'Admin > Users', path: '/admin' },
  { name: 'Admin > Roles', path: '/admin/roles' },
  { name: 'Admin > Frameworks', path: '/admin/frameworks' },
  { name: 'Admin > Business Units', path: '/admin/business-units' },
  { name: 'Admin > Integrations', path: '/admin/integrations' },
  { name: 'Admin > Features', path: '/admin/features' },
  { name: 'Admin > API Keys', path: '/admin/api-keys' },
  { name: 'Admin > Activity Log', path: '/admin/activity' },
  { name: 'Admin > Organization', path: '/admin/organization' },
  { name: 'Admin > SSO', path: '/admin/sso' },
];

test.describe('Console Error Monitor', () => {
  test('Capture console errors across all pages and tabs', async ({ page }) => {
    const errors: ConsoleError[] = [];
    let currentPage = '';
    let currentAction = '';

    // Attach listeners
    page.on('pageerror', (err) => {
      if (!shouldIgnore(err.message)) {
        errors.push({ page: currentPage, action: currentAction, message: err.message.substring(0, 300) });
      }
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error' && !shouldIgnore(msg.text())) {
        errors.push({ page: currentPage, action: currentAction, message: msg.text().substring(0, 300) });
      }
    });

    // Login
    const admin = getSmokeAdmin();
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="email"], input[name="email"]').first().fill(admin.email);
    await page.locator('input[type="password"]').first().fill(admin.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    await dismissWizard(page);

    // === CRAWL ALL PAGES ===
    for (const p of PAGES) {
      currentPage = p.name;
      currentAction = 'page load';

      await page.goto(p.path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Click through any tabs on this page
      const tabs = page.getByRole('tab');
      const tabCount = await tabs.count();
      for (let i = 0; i < tabCount; i++) {
        try {
          const tab = tabs.nth(i);
          if (!(await tab.isVisible().catch(() => false))) continue;
          const tabText = (await tab.textContent().catch(() => '') || '').trim();
          currentAction = `tab: "${tabText.substring(0, 30)}"`;
          await tab.click({ timeout: 2000 }).catch(() => {});
          await page.waitForTimeout(1000);
        } catch {
          // Skip
        }
      }
    }

    // === CHECK AUDIT DETAIL (if audits exist) ===
    currentPage = 'Audit Detail';
    currentAction = 'navigate';
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const auditLink = page.locator('a[href*="/audit/"]').first();
    if (await auditLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await auditLink.click({ force: true });
      await page.waitForURL(/\/audit\//, { timeout: 10000 }).catch(() => {});
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const auditTabs = page.getByRole('tab');
      const auditTabCount = await auditTabs.count();
      for (let i = 0; i < auditTabCount; i++) {
        try {
          const tab = auditTabs.nth(i);
          if (!(await tab.isVisible().catch(() => false))) continue;
          const tabText = (await tab.textContent().catch(() => '') || '').trim();
          currentAction = `audit tab: "${tabText.substring(0, 30)}"`;
          await tab.click({ timeout: 2000 }).catch(() => {});
          await page.waitForTimeout(1500);
        } catch {
          // Skip
        }
      }
    }

    // === REPORT ===
    console.log('\n' + '='.repeat(60));
    console.log('CONSOLE ERROR REPORT');
    console.log('='.repeat(60));

    if (errors.length === 0) {
      console.log('\n✅ No console errors found across all pages!');
    } else {
      console.log(`\n❌ ${errors.length} console error(s) found:\n`);

      const byPage = new Map<string, ConsoleError[]>();
      for (const err of errors) {
        if (!byPage.has(err.page)) byPage.set(err.page, []);
        byPage.get(err.page)!.push(err);
      }

      for (const [pageName, pageErrors] of byPage) {
        console.log(`📄 ${pageName} (${pageErrors.length} error${pageErrors.length > 1 ? 's' : ''}):`);
        const unique = new Set<string>();
        for (const err of pageErrors) {
          const key = `${err.action}|${err.message.substring(0, 80)}`;
          if (unique.has(key)) continue;
          unique.add(key);
          console.log(`   Action: ${err.action}`);
          console.log(`   Error:  ${err.message}`);
          console.log('');
        }
      }
    }

    console.log('='.repeat(60) + '\n');

    // Fail if errors found
    expect(errors, `Found ${errors.length} console error(s) — see report above`).toHaveLength(0);
  });
});
