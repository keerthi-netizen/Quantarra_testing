/**
 * Excel-Driven Test Filter
 *
 * Reads "tests/New_Testcase.xlsx" → "Step case and steps" sheet
 * and checks either:
 *   - "Run Shakeout in Prod and POC" column (for daily shakeout)
 *   - "Run for Full regression" column (for regression runs)
 *
 * The mode is determined by the RUN_MODE environment variable:
 *   RUN_MODE=shakeout (default) → reads "Run Shakeout in Prod and POC"
 *   RUN_MODE=regression         → reads "Run for Full regression"
 *
 * Usage in test files:
 *   import { shouldRun } from './excel-filter';
 *
 *   test('My test name', async ({ page }) => {
 *     test.skip(!shouldRun('TG-2', 'Scenario 2', 'TC-6'), 'Excluded by Excel');
 *     // ... test steps
 *   });
 *
 * The Excel is read once and cached for the entire test run.
 * Update the Excel, push to GitHub → next CI run picks up the change automatically.
 */

import * as path from 'path';

type RunMode = 'shakeout' | 'regression';

interface TestCaseEntry {
  scenario: string;
  tc: string;
  tg: string;
  runShakeout: boolean;
  runRegression: boolean;
  desc: string;
}

let _cache: TestCaseEntry[] | null = null;

/**
 * Determine current run mode from environment variable.
 */
function getRunMode(): RunMode {
  const mode = (process.env.RUN_MODE || 'shakeout').trim().toLowerCase();

  if (mode === 'regression') {
    return 'regression';
  }

  return 'shakeout';
}

/**
 * Loads and caches the Excel test case data.
 * Returns an array of test case entries with their run status for both modes.
 */
function loadExcelData(): TestCaseEntry[] {
  if (_cache) {
    return _cache;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const XLSX = require('xlsx');
    const excelPath = path.resolve(__dirname, '..', 'New_Testcase.xlsx');
    const wb = XLSX.readFile(excelPath);
    const ws = wb.Sheets['Step case and steps'];

    if (!ws) {
      console.warn('[excel-filter] Sheet "Step case and steps" not found — all tests will run.');
      _cache = [];
      return _cache;
    }

    const data = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[];
    let currentScenario = '';
    const entries: TestCaseEntry[] = [];

    for (const row of data) {
      const tc = String(row['Test case'] || '');
      const scenario = String(row['Test scenario/Test case/Test step'] || '');
      const tg = String(row['Test group'] || '');
      const shakeoutVal = String(row['Run Shakeout in Prod and POC'] || '').trim().toLowerCase();
      const regressionVal = String(row['Run for Full regression'] || '').trim().toLowerCase();

      if (tc.startsWith('Scenario')) {
        currentScenario = tc;
      } else if (tc.startsWith('TC-') && tg) {
        entries.push({
          scenario: currentScenario,
          tc,
          tg,
          runShakeout: shakeoutVal === 'yes',
          runRegression: regressionVal === 'yes',
          desc: scenario.substring(0, 120),
        });
      }
    }

    _cache = entries;
    return _cache;
  } catch (err) {
    console.warn('[excel-filter] Could not read Excel file — all tests will run by default.', err);
    _cache = [];
    return _cache;
  }
}

/**
 * Check if a specific test case should run based on Excel marking.
 * Reads the appropriate column based on RUN_MODE env var.
 *
 * @param tg - Test Group (e.g., "TG-1", "TG-2", "TG-6")
 * @param scenario - Scenario name (e.g., "Scenario 1", "Scenario 6")
 * @param tc - Test Case ID (e.g., "TC-1", "TC-6")
 * @returns true if test should run, false if it should be skipped.
 *          Returns true by default if the entry is not found in Excel.
 */
export function shouldRun(tg: string, scenario: string, tc: string): boolean {
  const entries = loadExcelData();
  const mode = getRunMode();

  if (entries.length === 0) {
    // Excel not loaded — run everything (safe default)
    return true;
  }

  const match = entries.find(
    (e) => e.tg === tg && e.scenario === scenario && e.tc === tc,
  );

  if (!match) {
    // Test case not listed in Excel — run by default
    return true;
  }

  return mode === 'regression' ? match.runRegression : match.runShakeout;
}

/**
 * Check if an entire test group should run (at least one TC is marked "Yes").
 *
 * @param tg - Test Group (e.g., "TG-1", "TG-6")
 * @returns true if ANY test case in this group is marked to run
 */
export function shouldRunGroup(tg: string): boolean {
  const entries = loadExcelData();
  const mode = getRunMode();

  if (entries.length === 0) {
    return true;
  }

  const groupEntries = entries.filter((e) => e.tg === tg);

  if (groupEntries.length === 0) {
    return true;
  }

  return mode === 'regression'
    ? groupEntries.some((e) => e.runRegression)
    : groupEntries.some((e) => e.runShakeout);
}

/**
 * Get all test cases for a specific test group with their run status.
 * Useful for debugging which tests are included/excluded.
 */
export function getGroupStatus(tg: string): TestCaseEntry[] {
  const entries = loadExcelData();
  return entries.filter((e) => e.tg === tg);
}

/**
 * Print a summary of what's included/excluded for the current run.
 * Call this once at the start of the suite for visibility.
 */
export function printFilterSummary(): void {
  const entries = loadExcelData();
  const mode = getRunMode();

  if (entries.length === 0) {
    console.log('[excel-filter] No Excel data loaded — running all tests.');
    return;
  }

  const columnName = mode === 'regression' ? 'Run for Full regression' : 'Run Shakeout in Prod and POC';
  const included = entries.filter((e) => mode === 'regression' ? e.runRegression : e.runShakeout);
  const excluded = entries.filter((e) => mode === 'regression' ? !e.runRegression : !e.runShakeout);

  console.log(`[excel-filter] Mode: ${mode.toUpperCase()} | Column: "${columnName}"`);
  console.log(`  Loaded ${entries.length} test cases from Excel.`);
  console.log(`  ✅ Run: ${included.length} | ⏭️ Skip: ${excluded.length}`);

  if (excluded.length > 0) {
    console.log('  Skipped tests:');
    for (const e of excluded) {
      console.log(`    ⏭️ ${e.tg} ${e.scenario} ${e.tc}: ${e.desc.substring(0, 60)}`);
    }
  }
}
