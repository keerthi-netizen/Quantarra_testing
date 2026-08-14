/**
 * Shakeout Configuration — Excel-Driven
 *
 * Reads the "Configuration" sheet from "tests/New_Testcase.xlsx" to determine
 * runtime behavior for the daily shakeout (notifications, reporting, etc.).
 *
 * The Configuration sheet should have two columns:
 *   Column A: "Setting" — the configuration key
 *   Column B: "Value"   — the configuration value (Yes/No, or a string)
 *
 * Supported settings:
 *   | Setting              | Values       | Default | Description                           |
 *   |----------------------|--------------|---------|---------------------------------------|
 *   | Slack Notifications  | Yes / No     | Yes     | Post to Slack channel on failures     |
 *   | Email Notifications  | Yes / No     | Yes     | Send email report (pass or fail)      |
 *   | Jira Ticket Creation | Yes / No     | Yes     | Create/update Jira ticket on failures |
 *   | Report Environment   | prod/poc/both| both    | Which environment(s) to report on     |
 *
 * Usage:
 *   import { getShakeoutConfig } from '../src/config/shakeout-config';
 *   const config = getShakeoutConfig();
 *   if (config.slackEnabled) { ... }
 */

import * as path from 'path';

export interface ShakeoutConfig {
  /** Whether to post Slack notifications on failures */
  slackEnabled: boolean;
  /** Whether to send email reports */
  emailEnabled: boolean;
  /** Whether to create/update Jira tickets on failures */
  jiraEnabled: boolean;
  /** Which environments to include in the report: 'prod' | 'poc' | 'both' */
  reportEnvironment: 'prod' | 'poc' | 'both';
}

const DEFAULTS: ShakeoutConfig = {
  slackEnabled: true,
  emailEnabled: true,
  jiraEnabled: true,
  reportEnvironment: 'both',
};

let _configCache: ShakeoutConfig | null = null;

/**
 * Reads the "Configuration" sheet from the test case Excel file.
 * Results are cached for the duration of the process.
 *
 * If the sheet doesn't exist or can't be read, returns defaults (all enabled).
 */
export function getShakeoutConfig(): ShakeoutConfig {
  if (_configCache) {
    return _configCache;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const XLSX = require('xlsx');
    const excelPath = path.resolve(__dirname, '../../tests/New_Testcase.xlsx');
    const wb = XLSX.readFile(excelPath);
    const ws = wb.Sheets['Configuration'];

    if (!ws) {
      console.log('[shakeout-config] No "Configuration" sheet found in Excel — using defaults (all enabled).');
      _configCache = { ...DEFAULTS };
      return _configCache;
    }

    const data = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[];
    const config: ShakeoutConfig = { ...DEFAULTS };

    for (const row of data) {
      const setting = String(row['Setting'] || '').trim().toLowerCase();
      const value = String(row['Value'] || '').trim().toLowerCase();

      switch (setting) {
        case 'slack notifications':
          config.slackEnabled = value === 'yes';
          break;
        case 'email notifications':
          config.emailEnabled = value === 'yes';
          break;
        case 'jira ticket creation':
          config.jiraEnabled = value === 'yes';
          break;
        case 'report environment':
          if (value === 'prod' || value === 'poc' || value === 'both') {
            config.reportEnvironment = value;
          }
          break;
      }
    }

    console.log('[shakeout-config] Configuration loaded from Excel:');
    console.log(`  Slack Notifications:  ${config.slackEnabled ? '✅ Enabled' : '⏸️  Disabled'}`);
    console.log(`  Email Notifications:  ${config.emailEnabled ? '✅ Enabled' : '⏸️  Disabled'}`);
    console.log(`  Jira Ticket Creation: ${config.jiraEnabled ? '✅ Enabled' : '⏸️  Disabled'}`);
    console.log(`  Report Environment:   ${config.reportEnvironment}`);

    _configCache = config;
    return _configCache;
  } catch (err) {
    console.warn('[shakeout-config] Could not read Configuration sheet — using defaults.', err);
    _configCache = { ...DEFAULTS };
    return _configCache;
  }
}

/**
 * Resets the config cache — useful for tests or when the Excel is updated mid-process.
 */
export function resetShakeoutConfigCache(): void {
  _configCache = null;
}
