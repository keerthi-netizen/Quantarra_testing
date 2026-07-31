/**
 * Test Data Configuration — sourced from New_testcase.xlsx Sheet 2.
 *
 * Sheet 2 = test credentials (all environments)
 * Sheet 3 = prod-specific overrides (placeholder — will be populated later)
 */

import { getEnvConfig } from '../../src/config/environment';

export interface TestCredential {
  role: string;
  email: string;
  password: string;
}

export interface JiraDefectConfig {
  epic?: string;
  labels?: string[];
  assigneeId?: string;
  priority?: string;
  issueType?: string;
}

/** Test users from Sheet 2 of New_testcase.xlsx */
const TEST_USERS: TestCredential[] = [
  {
    role: 'Super User',
    email: 'keerthi@quantarra.io',
    password: 'Quantarra2026!',
  },
  {
    role: 'Administrator',
    email: 'keerthikumar.kothandapani@gmail.com',
    password: 'Quantarra2026!',
  },
  {
    role: 'Contributor',
    email: 'prasanna.d@keystoneeng.in',
    password: 'Quantarra2026!',
  },
  {
    role: 'Viewer',
    email: 'matric.viewer@keystoneeng.in',
    password: 'Quantarra2026!',
  },
];

/**
 * Jira defect configuration — populated on first failure.
 * Once set, all subsequent defects use these values.
 * Update this object after the first run when you provide Epic/Labels/Assignee.
 */
export const JIRA_DEFECT_CONFIG: JiraDefectConfig = {
  // Will be populated after first failure — you'll be asked for these values
  // epic: 'PRJAT-XXX',
  // labels: ['qa-automation', 'smoke-test'],
  // assigneeId: 'account-id',
  // priority: 'High',
  // issueType: 'Bug',
};

/**
 * Returns credentials for a specific role.
 */
export function getSmokeCreds(role: 'Super User' | 'Administrator' | 'Contributor' | 'Viewer'): TestCredential {
  const user = TEST_USERS.find((u) => u.role === role);
  if (!user) {
    throw new Error(`No test credential found for role "${role}"`);
  }
  return user;
}

/** Admin user (Administrator role) */
export function getSmokeAdmin(): TestCredential {
  return getSmokeCreds('Administrator');
}

/** Contributor user */
export function getSmokeContributor(): TestCredential {
  return getSmokeCreds('Contributor');
}

/** Super User */
export function getSmokeSuperUser(): TestCredential {
  return getSmokeCreds('Super User');
}

/** Viewer user */
export function getSmokeViewer(): TestCredential {
  return getSmokeCreds('Viewer');
}
