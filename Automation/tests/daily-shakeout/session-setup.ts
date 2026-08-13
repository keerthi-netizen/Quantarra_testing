/**
 * Daily Shakeout — Session Setup
 *
 * Logs in once per user role and saves the browser session (cookies + localStorage)
 * to a file. Tests reuse this session via Playwright's `storageState` — no repeated logins.
 *
 * This brings login count from 35 → 2 (one per role: admin + contributor).
 *
 * Gate file pattern:
 * - If admin login fails → writes .auth/gate-failed.json with reason
 * - Downstream tests check this gate file and skip immediately
 * - This prevents 20+ meaningless "timeout" failures when the app is simply down
 */

import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { getShakeoutAdmin, getShakeoutContributor, type ShakeoutCredential } from './test-data';
import { getEnvConfig } from '../../src/config/environment';

const SESSION_DIR = path.resolve(__dirname, '../../.auth');
const MAX_SESSION_AGE = 10 * 60 * 1000; // 10 minutes
const GATE_FILE = path.join(SESSION_DIR, 'gate-failed.json');

export function getAdminSessionPath(): string {
  return path.join(SESSION_DIR, 'admin-session.json');
}

export function getContributorSessionPath(): string {
  return path.join(SESSION_DIR, 'contributor-session.json');
}

/**
 * Check if a session file exists and is fresh (< 10 min old).
 */
function isSessionFresh(filePath: string): boolean {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  const stat = fs.statSync(filePath);
  return Date.now() - stat.mtimeMs < MAX_SESSION_AGE;
}

/**
 * Write a gate file indicating that login/health failed.
 * Downstream tests read this and skip immediately.
 */
function writeGateFailure(reason: string, tier: 'blocker' | 'critical'): void {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
  const gate = {
    failed: true,
    reason,
    tier,
    timestamp: new Date().toISOString(),
  };
  fs.writeFileSync(GATE_FILE, JSON.stringify(gate, null, 2));
  console.log(`  🚫 Gate file written: ${reason}`);
}

/**
 * Clear any previous gate file (called at the start of auth setup).
 */
function clearGateFile(): void {
  if (fs.existsSync(GATE_FILE)) {
    fs.unlinkSync(GATE_FILE);
  }
}

/**
 * Check if the execution gate is blocked.
 * Returns the reason string if blocked, null if execution should proceed.
 *
 * Usage in test files:
 *   import { checkGate } from './session-setup';
 *   test.beforeEach(() => { test.skip(!!checkGate(), checkGate()!); });
 */
export function checkGate(): string | null {
  if (!fs.existsSync(GATE_FILE)) {
    return null;
  }

  try {
    const gate = JSON.parse(fs.readFileSync(GATE_FILE, 'utf-8'));
    if (gate.failed) {
      return `Execution stopped: ${gate.reason}`;
    }
  } catch {
    // Corrupted file — ignore
  }

  return null;
}

/**
 * Performs login and saves the authenticated session to a JSON file.
 * Uses explicit waits — progresses as soon as element appears, max 60s.
 */
async function loginAndSave(credential: ShakeoutCredential, sessionPath: string): Promise<void> {
  const envConfig = getEnvConfig();
  fs.mkdirSync(SESSION_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    baseURL: envConfig.baseUrl,
    viewport: { width: 1400, height: 900 },
  });
  const page = await context.newPage();

  try {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.locator('input[type="email"], input[name="email"]').first().fill(credential.email);
    await page.locator('input[type="password"]').first().fill(credential.password);
    await page.locator('button[type="submit"]').click();

    // Explicit wait — resolves as soon as URL changes, max 60s
    await page.waitForURL((url) => !url.pathname.includes('/login'), {
      timeout: 60000,
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('networkidle');

    // Dismiss onboarding wizard if present
    const skipBtn = page.getByRole('button', { name: /skip|close|dismiss|later|not now/i });
    if (await skipBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await skipBtn.first().click().catch(() => {});
    }

    // Save session state (cookies + localStorage)
    await context.storageState({ path: sessionPath });
    console.log(`  ✅ Session saved: ${credential.role} (${credential.email})`);
  } finally {
    await context.close();
    await browser.close();
  }
}

/**
 * Ensures admin session exists. Reuses if < 10 min old.
 * If login fails, writes gate file to stop all downstream tests.
 */
export async function ensureAdminSession(): Promise<void> {
  const sessionPath = getAdminSessionPath();

  // Clear previous gate file at the start of a new run
  clearGateFile();

  if (isSessionFresh(sessionPath)) {
    console.log('  ♻️  Reusing Admin session (< 10 min old)');
    return;
  }

  console.log('  🔐 Logging in as Admin...');

  try {
    await loginAndSave(getShakeoutAdmin(), sessionPath);
  } catch (err: any) {
    const reason = `Admin login failed: ${err.message?.substring(0, 150) || 'Unknown error'}`;
    console.log(`  ❌ ${reason}`);
    writeGateFailure(reason, 'blocker');
    // Still write empty session so Playwright doesn't crash on missing file
    fs.mkdirSync(SESSION_DIR, { recursive: true });
    fs.writeFileSync(sessionPath, JSON.stringify({ cookies: [], origins: [] }));
    throw err; // Let the setup test itself fail (marks it in results)
  }
}

/**
 * Ensures contributor session exists. Reuses if < 10 min old.
 * If login fails, creates an empty session file so TG-3 tests are skipped gracefully.
 * Contributor failure does NOT write gate file (only admin is a blocker).
 */
export async function ensureContributorSession(): Promise<void> {
  const sessionPath = getContributorSessionPath();

  if (isSessionFresh(sessionPath)) {
    console.log('  ♻️  Reusing Contributor session (< 10 min old)');
    return;
  }

  console.log('  🔐 Logging in as Contributor...');

  try {
    await loginAndSave(getShakeoutContributor(), sessionPath);
  } catch (err: any) {
    console.log(`  ⚠️  Contributor login failed: ${err.message?.substring(0, 100)}`);
    console.log('     TG-3 tests will be skipped. Check contributor credentials for this environment.');
    // Write an empty session so tests don't crash on missing file — they'll get redirected to login
    fs.mkdirSync(SESSION_DIR, { recursive: true });
    fs.writeFileSync(sessionPath, JSON.stringify({ cookies: [], origins: [] }));
  }
}

/**
 * Ensures both sessions exist. Convenience function.
 */
export async function ensureSessions(): Promise<void> {
  await ensureAdminSession();
  await ensureContributorSession();
}
