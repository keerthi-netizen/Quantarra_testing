/**
 * Daily Shakeout — Test Data & Credentials
 *
 * Reads from config/environments.json (single source of truth).
 * No more scattered defaults or mismatched env vars.
 */

import { getTestUser, type TestUser } from '../../src/config/environment';

export interface ShakeoutCredential {
  email: string;
  password: string;
  role: string;
}

/**
 * Returns the admin credential for the active environment.
 */
export function getShakeoutAdmin(): ShakeoutCredential {
  const user = getTestUser('admin');
  return {
    email: user.email,
    password: user.password,
    role: user.role,
  };
}

/**
 * Returns the contributor credential for RBAC navigation checks.
 */
export function getShakeoutContributor(): ShakeoutCredential {
  const user = getTestUser('contributor');
  return {
    email: user.email,
    password: user.password,
    role: user.role,
  };
}
