/**
 * Daily Shakeout — Test Data & Credentials
 *
 * Environment-specific credentials for POC and Prod shakeout runs.
 * These are resolved at runtime based on the ENV variable.
 */

import { getEnvConfig, type Environment } from '../../src/config/environment';

export interface ShakeoutCredential {
  email: string;
  password: string;
  role: string;
}

/**
 * Returns the admin credential for the active environment.
 * POC and Prod have different login users.
 */
export function getShakeoutAdmin(): ShakeoutCredential {
  const env = getEnvConfig().env;

  switch (env) {
    case 'poc':
      return {
        email: process.env.POC_ADMIN_EMAIL || 'kirthi.218@gmail.com',
        password: process.env.POC_ADMIN_PASSWORD || 'Quantarra2026!',
        role: 'Administrator',
      };
    case 'prod':
      return {
        email: process.env.PROD_ADMIN_EMAIL || 'keerthi@quantarra.io',
        password: process.env.PROD_ADMIN_PASSWORD || 'Quantarra2026!',
        role: 'Super User',
      };
    case 'staging':
      return {
        email: process.env.ADMIN_EMAIL || 'keerthi@quantarra.io',
        password: process.env.ADMIN_PASSWORD || 'Quantarra2026!',
        role: 'Super User',
      };
    default:
      return {
        email: process.env.ADMIN_EMAIL || 'admin@acme.com',
        password: process.env.ADMIN_PASSWORD || 'Quantarra2026!',
        role: 'Administrator',
      };
  }
}

/**
 * Returns the contributor credential for RBAC navigation checks.
 */
export function getShakeoutContributor(): ShakeoutCredential {
  const env = getEnvConfig().env;

  switch (env) {
    case 'poc':
      return {
        email: process.env.POC_CONTRIBUTOR_EMAIL || 'keerthikumar.kothandapani@gmail.com',
        password: process.env.POC_CONTRIBUTOR_PASSWORD || 'Quantarra2026!',
        role: 'Contributor',
      };
    case 'prod':
      return {
        email: process.env.PROD_CONTRIBUTOR_EMAIL || 'sales1@keystoneeng.in',
        password: process.env.PROD_CONTRIBUTOR_PASSWORD || 'Quantarra2026!',
        role: 'Contributor',
      };
    case 'staging':
      return {
        email: process.env.CONTRIBUTOR_EMAIL || 'prasanna.d@keystoneeng.in',
        password: process.env.CONTRIBUTOR_PASSWORD || 'Quantarra2026!',
        role: 'Contributor',
      };
    default:
      return {
        email: process.env.CONTRIBUTOR_EMAIL || 'contributor@acme.com',
        password: process.env.CONTRIBUTOR_PASSWORD || 'Quantarra2026!',
        role: 'Contributor',
      };
  }
}
