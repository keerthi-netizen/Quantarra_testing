import { test as setup } from '@playwright/test';
import { ensureAdminSession, ensureContributorSession } from './session-setup';

/**
 * Auth Setup — runs ONCE before all daily-shakeout tests.
 * Creates admin + contributor sessions saved to .auth/ directory.
 * Split into separate tests so one can pass even if the other fails.
 */

setup('authenticate admin', async () => {
  await ensureAdminSession();
});

setup('authenticate contributor', async () => {
  await ensureContributorSession();
});
