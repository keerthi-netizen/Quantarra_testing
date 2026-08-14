/**
 * Daily Shakeout — Global Setup
 *
 * Runs ONCE before the entire shakeout suite. Logs in as admin + contributor
 * and saves sessions for reuse by all tests.
 *
 * Login count: 2 total (was 35).
 */

import { ensureSessions } from './session-setup';

async function globalSetup() {
  console.log('\n🚀 Daily Shakeout — Setting up sessions...\n');
  await ensureSessions();
  console.log('');
}

export default globalSetup;
