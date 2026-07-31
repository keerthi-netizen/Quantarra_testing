import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from project root (override: true ensures .env values win over system env vars)
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });

export type Environment = 'dev' | 'staging' | 'prod';

export interface EnvConfig {
  env: Environment;
  baseUrl: string;
  mcUrl: string;
  auditUrl: string;
  apiUrl: string;
}

export interface TestUser {
  email: string;
  password: string;
  role: string;
}

export interface JiraConfig {
  baseUrl: string;
  projectKey: string;
  email: string;
  apiToken: string;
  assigneeId?: string;
}

/**
 * Resolves the active environment from ENV variable or CLI arg.
 * Priority: CLI --env flag > ENV variable > defaults to 'dev'
 */
function resolveEnvironment(): Environment {
  // Check for CLI argument: --env=staging
  const cliArg = process.argv.find((arg) => arg.startsWith('--env='));
  if (cliArg) {
    return cliArg.split('=')[1] as Environment;
  }

  const env = process.env.ENV || 'dev';
  if (!['dev', 'staging', 'prod'].includes(env)) {
    throw new Error(`Invalid ENV value: "${env}". Must be one of: dev, staging, prod`);
  }

  return env as Environment;
}

/**
 * Returns URLs for the active environment.
 */
export function getEnvConfig(): EnvConfig {
  const env = resolveEnvironment();
  const prefix = env.toUpperCase();

  return {
    env,
    baseUrl: process.env[`${prefix}_BASE_URL`] || 'http://localhost:4000',
    mcUrl: process.env[`${prefix}_MC_URL`] || 'http://localhost:4002',
    auditUrl: process.env[`${prefix}_AUDIT_URL`] || 'http://localhost:4003',
    apiUrl: process.env[`${prefix}_API_URL`] || 'http://localhost:3000/api/v1',
  };
}

/**
 * Returns test user credentials by role.
 */
export function getTestUser(role: 'admin' | 'manager' | 'contributor' | 'mc-admin'): TestUser {
  switch (role) {
    case 'admin':
      return {
        email: process.env.ADMIN_EMAIL || 'admin@acme.com',
        password: process.env.ADMIN_PASSWORD || 'Quantarra2026!',
        role: 'Administrator',
      };
    case 'manager':
      return {
        email: process.env.MANAGER_EMAIL || 'manager@acme.com',
        password: process.env.MANAGER_PASSWORD || 'Quantarra2026!',
        role: 'Manager',
      };
    case 'contributor':
      return {
        email: process.env.CONTRIBUTOR_EMAIL || 'contributor@acme.com',
        password: process.env.CONTRIBUTOR_PASSWORD || 'Quantarra2026!',
        role: 'Contributor',
      };
    case 'mc-admin':
      return {
        email: process.env.MC_ADMIN_EMAIL || 'mc-admin@quantarra.io',
        password: process.env.MC_ADMIN_PASSWORD || 'Quantarra2026!',
        role: 'Super User',
      };
  }
}

/**
 * Returns Jira configuration for bug creation.
 */
export function getJiraConfig(): JiraConfig {
  return {
    baseUrl: process.env.JIRA_BASE_URL || 'https://quantarra.atlassian.net',
    projectKey: process.env.JIRA_PROJECT_KEY || 'PRJAT',
    email: process.env.JIRA_EMAIL || '',
    apiToken: process.env.JIRA_API_TOKEN || '',
    assigneeId: process.env.JIRA_ASSIGNEE_ID,
  };
}
