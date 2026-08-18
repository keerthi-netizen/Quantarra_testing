import * as path from 'path';
import * as fs from 'fs';

/**
 * Centralized Configuration Loader
 *
 * Priority: environment variable > config/environments.json > fallback default
 *
 * The JSON file (committed to git) is the single source of truth for:
 *   - URLs per environment
 *   - Test credentials per environment
 *   - Jira config
 *   - SMTP config
 *
 * Environment variables can still override any value (useful for CI one-offs).
 */

export type Environment = 'dev' | 'staging' | 'poc' | 'prod';

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

export interface SmtpConfig {
  host: string;
  port: string;
  user: string;
  password: string;
}

// ===== Load JSON config (once) =====

let _config: any = null;

function loadConfig(): any {
  if (_config) {
    return _config;
  }

  const configPath = path.resolve(__dirname, '../../config/environments.json');

  if (fs.existsSync(configPath)) {
    _config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } else {
    console.warn('[config] environments.json not found — falling back to env vars only.');
    _config = { environments: {}, credentials: {}, jira: {}, smtp: {}, reporting: {} };
  }

  return _config;
}

// ===== Environment Resolution =====

function resolveEnvironment(): Environment {
  // CLI arg: --env=prod
  const cliArg = process.argv.find((arg) => arg.startsWith('--env='));
  if (cliArg) {
    return cliArg.split('=')[1] as Environment;
  }

  const env = process.env.ENV || 'dev';
  if (!['dev', 'staging', 'poc', 'prod'].includes(env)) {
    throw new Error(`Invalid ENV value: "${env}". Must be one of: dev, staging, poc, prod`);
  }

  return env as Environment;
}

// ===== Public API =====

/**
 * Returns URLs for the active environment.
 * Priority: env var > JSON config > localhost default
 */
export function getEnvConfig(): EnvConfig {
  const env = resolveEnvironment();
  const prefix = env.toUpperCase();
  const config = loadConfig();
  const envUrls = config.environments?.[env] || {};

  return {
    env,
    baseUrl: process.env[`${prefix}_BASE_URL`] || envUrls.baseUrl || 'http://localhost:4000',
    mcUrl: process.env[`${prefix}_MC_URL`] || envUrls.mcUrl || 'http://localhost:4002',
    auditUrl: process.env[`${prefix}_AUDIT_URL`] || envUrls.auditUrl || 'http://localhost:4003',
    apiUrl: process.env[`${prefix}_API_URL`] || envUrls.apiUrl || 'http://localhost:3000/api/v1',
  };
}

/**
 * Returns test user credentials by role for the active environment.
 * Priority: env var > JSON config > hardcoded fallback
 */
export function getTestUser(role: 'admin' | 'manager' | 'contributor' | 'mc-admin'): TestUser {
  const env = resolveEnvironment();
  const prefix = env.toUpperCase();
  const config = loadConfig();
  const envCreds = config.credentials?.[env] || {};

  switch (role) {
    case 'admin': {
      const json = envCreds.admin || {};
      return {
        email: process.env[`${prefix}_ADMIN_EMAIL`] || process.env.ADMIN_EMAIL || json.email || 'admin@acme.com',
        password: process.env[`${prefix}_ADMIN_PASSWORD`] || process.env.ADMIN_PASSWORD || json.password || 'Quantarra2026!',
        role: json.role || 'Administrator',
      };
    }
    case 'manager': {
      const json = envCreds.manager || {};
      return {
        email: process.env.MANAGER_EMAIL || json.email || 'manager@acme.com',
        password: process.env.MANAGER_PASSWORD || json.password || 'Quantarra2026!',
        role: json.role || 'Manager',
      };
    }
    case 'contributor': {
      const json = envCreds.contributor || {};
      return {
        email: process.env[`${prefix}_CONTRIBUTOR_EMAIL`] || process.env.CONTRIBUTOR_EMAIL || json.email || 'contributor@acme.com',
        password: process.env[`${prefix}_CONTRIBUTOR_PASSWORD`] || process.env.CONTRIBUTOR_PASSWORD || json.password || 'Quantarra2026!',
        role: json.role || 'Contributor',
      };
    }
    case 'mc-admin': {
      const json = envCreds.mcAdmin || {};
      return {
        email: process.env.MC_ADMIN_EMAIL || json.email || 'mc-admin@quantarra.io',
        password: process.env.MC_ADMIN_PASSWORD || json.password || 'Quantarra2026!',
        role: json.role || 'Super User',
      };
    }
  }
}

/**
 * Returns Jira configuration.
 * Priority: env var > JSON config
 */
export function getJiraConfig(): JiraConfig {
  const config = loadConfig();
  const jira = config.jira || {};

  return {
    baseUrl: process.env.JIRA_BASE_URL || jira.baseUrl || 'https://quantarra.atlassian.net',
    projectKey: process.env.JIRA_PROJECT_KEY || jira.projectKey || 'PRJAT',
    email: process.env.JIRA_EMAIL || jira.email || '',
    apiToken: process.env.JIRA_API_TOKEN || jira.apiToken || '',
    assigneeId: process.env.JIRA_ASSIGNEE_ID || jira.assigneeId || undefined,
  };
}

/**
 * Returns SMTP configuration for email reports.
 * Priority: env var > JSON config
 */
export function getSmtpConfig(): SmtpConfig {
  const config = loadConfig();
  const smtp = config.smtp || {};

  return {
    host: process.env.SMTP_HOST || smtp.host || '',
    port: process.env.SMTP_PORT || smtp.port || '587',
    user: process.env.SMTP_USER || smtp.user || '',
    password: process.env.SMTP_PASSWORD || smtp.password || '',
  };
}

/**
 * Returns report recipients (comma-separated emails).
 */
export function getReportRecipients(): string {
  const config = loadConfig();
  return process.env.REPORT_RECIPIENTS || config.reporting?.recipients || '';
}

/**
 * Returns Slack webhook URL for notifications.
 */
export function getSlackWebhookUrl(): string {
  const config = loadConfig();
  return process.env.SLACK_WEBHOOK_URL || config.reporting?.slackWebhookUrl || '';
}
