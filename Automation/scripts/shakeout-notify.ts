/**
 * Daily Shakeout — Consolidated Report & Notification
 *
 * Reads test results from both POC and Prod runs, then:
 * 1. If ANY test failed → creates a Jira ticket with full details
 * 2. Sends email with:
 *    - Body: simple summary table (Scenario | Total | Passed | Failed)
 *    - Attachment: Excel with detailed per-test-case status
 * 3. Posts to Slack on failures
 *
 * Run: npx tsx scripts/shakeout-notify.ts
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as nodemailer from 'nodemailer';
import ExcelJS from 'exceljs';
import { getShakeoutConfig } from '../src/config/shakeout-config';

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

interface TestResult {
  title: string;
  status: 'passed' | 'failed' | 'skipped' | 'timedOut';
  duration: number;
  error?: string;
}

/**
 * Strip ANSI escape codes and clean up Playwright error messages for readability.
 */
function cleanError(raw: string): string {
  if (!raw) {
    return '';
  }

  return raw
    .replace(/\u001b\[\d+m/g, '')
    .replace(/␛\[\d+m/g, '')
    .replace(/\[[\d;]*m/g, '')
    .replace(/expect\(\s*locator\s*\)\s*\.not\s*\.\s*toBeVisible\s*\(\)/g, '')
    .replace(/Timed out \d+ms waiting for\s*/g, '')
    .replace(/Call log:[\s\S]*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

interface EnvResults {
  environment: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  tests: TestResult[];
  runTime: string;
}

function parseResults(resultsPath: string, envName: string): EnvResults | null {
  const jsonPath = path.join(resultsPath, 'results.json');
  if (!fs.existsSync(jsonPath)) {
    console.log(`⚠️  No results found for ${envName} at ${jsonPath}`);
    return null;
  }

  const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  const tests: TestResult[] = [];

  // Playwright JSON reporter format
  for (const suite of raw.suites || []) {
    for (const spec of suite.specs || []) {
      for (const result of spec.tests || []) {
        const lastResult = result.results?.[result.results.length - 1];
        tests.push({
          title: `${suite.title} > ${spec.title}`,
          status: lastResult?.status || result.status || 'skipped',
          duration: lastResult?.duration || 0,
          error: cleanError(lastResult?.error?.message?.substring(0, 500) || ''),
        });
      }
    }
    // Handle nested suites
    for (const nestedSuite of suite.suites || []) {
      for (const spec of nestedSuite.specs || []) {
        for (const result of spec.tests || []) {
          const lastResult = result.results?.[result.results.length - 1];
          tests.push({
            title: `${nestedSuite.title} > ${spec.title}`,
            status: lastResult?.status || result.status || 'skipped',
            duration: lastResult?.duration || 0,
            error: cleanError(lastResult?.error?.message?.substring(0, 500) || ''),
          });
        }
      }
    }
  }

  return {
    environment: envName,
    total: tests.length,
    passed: tests.filter((t) => t.status === 'passed').length,
    failed: tests.filter((t) => t.status === 'failed' || t.status === 'timedOut').length,
    skipped: tests.filter((t) => t.status === 'skipped').length,
    tests,
    runTime: new Date().toISOString(),
  };
}

// ===== SCENARIO MAPPING =====

/**
 * Maps test titles from Playwright results to scenario names for the summary table.
 * Order: Excel scenarios first, then MC, Audit Portal, API.
 */
interface ScenarioSummary {
  name: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
}

function categorizeTests(results: EnvResults): ScenarioSummary[] {
  const categories: { name: string; match: (title: string) => boolean }[] = [
    { name: 'Authentication Flow', match: (t) => t.includes('TG-1') || t.includes('Login Health') },
    { name: 'Navigation - Workspace (Admin)', match: (t) => t.includes('TG-2') || t.includes('Admin Navigation') },
    { name: 'Navigation - Workspace (Contributor)', match: (t) => t.includes('TG-3') || t.includes('Contributor Navigation') },
    { name: 'Admin Tab', match: (t) => t.includes('TG-4') || t.includes('Admin Tab') },
    { name: 'Audit Lifecycle - Existing Audit', match: (t) => t.includes('TG-6') || t.includes('Audit Lifecycle') },
    { name: 'MC Availability', match: (t) => t.includes('MC') || t.includes('Mission Control') },
    { name: 'Audit Portal Availability', match: (t) => t.includes('Audit Portal') },
    { name: 'API Endpoints', match: (t) => t.includes('API') || t.includes('Core API') },
  ];

  const summaries: ScenarioSummary[] = [];
  const categorized = new Set<number>();

  for (const cat of categories) {
    const matching = results.tests.filter((t, i) => {
      if (categorized.has(i)) {
        return false;
      }

      if (cat.match(t.title)) {
        categorized.add(i);
        return true;
      }

      return false;
    });

    if (matching.length > 0) {
      summaries.push({
        name: cat.name,
        total: matching.length,
        passed: matching.filter((t) => t.status === 'passed').length,
        failed: matching.filter((t) => t.status === 'failed' || t.status === 'timedOut').length,
        skipped: matching.filter((t) => t.status === 'skipped').length,
      });
    }
  }

  // Catch any uncategorized tests
  const uncategorized = results.tests.filter((_, i) => !categorized.has(i));
  if (uncategorized.length > 0) {
    summaries.push({
      name: 'Other',
      total: uncategorized.length,
      passed: uncategorized.filter((t) => t.status === 'passed').length,
      failed: uncategorized.filter((t) => t.status === 'failed' || t.status === 'timedOut').length,
      skipped: uncategorized.filter((t) => t.status === 'skipped').length,
    });
  }

  return summaries;
}

// ===== EMAIL =====

function generateEmailHtml(pocResults: EnvResults | null, prodResults: EnvResults | null, jiraKey: string | null): string {
  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const renderSummaryTable = (results: EnvResults | null, envName: string): string => {
    if (!results) {
      return `<h3>${envName}: No results (run may have failed to start)</h3>`;
    }

    const statusLabel = results.failed > 0 ? '❌ FAILED' : '✅ PASSED';
    const statusColor = results.failed > 0 ? '#c62828' : '#2e7d32';
    const summaries = categorizeTests(results);

    const rows = summaries
      .map((s) => {
        const rowBg = s.failed > 0 ? 'background:#fff3f3;' : '';
        return `
          <tr style="${rowBg}">
            <td style="padding:8px 12px;border:1px solid #ddd;">${s.name}</td>
            <td style="padding:8px 12px;border:1px solid #ddd;text-align:center;">${s.total}</td>
            <td style="padding:8px 12px;border:1px solid #ddd;text-align:center;color:#2e7d32;font-weight:600;">${s.passed}</td>
            <td style="padding:8px 12px;border:1px solid #ddd;text-align:center;color:${s.failed > 0 ? '#c62828' : '#666'};font-weight:${s.failed > 0 ? '600' : '400'};">${s.failed}</td>
            <td style="padding:8px 12px;border:1px solid #ddd;text-align:center;color:#666;">${s.skipped}</td>
          </tr>`;
      })
      .join('');

    // Totals row
    const totalRow = `
      <tr style="background:#f5f5f5;font-weight:700;">
        <td style="padding:8px 12px;border:1px solid #ddd;">TOTAL</td>
        <td style="padding:8px 12px;border:1px solid #ddd;text-align:center;">${results.total}</td>
        <td style="padding:8px 12px;border:1px solid #ddd;text-align:center;color:#2e7d32;">${results.passed}</td>
        <td style="padding:8px 12px;border:1px solid #ddd;text-align:center;color:#c62828;">${results.failed}</td>
        <td style="padding:8px 12px;border:1px solid #ddd;text-align:center;color:#666;">${results.skipped}</td>
      </tr>`;

    return `
      <h3 style="color:${statusColor};margin-bottom:8px;">${envName} — ${statusLabel}</h3>
      <table style="border-collapse:collapse;width:100%;font-size:13px;margin-bottom:24px;">
        <thead>
          <tr style="background:#f5f5f5;">
            <th style="padding:8px 12px;border:1px solid #ddd;text-align:left;">Test Scenario</th>
            <th style="padding:8px 12px;border:1px solid #ddd;text-align:center;">Total</th>
            <th style="padding:8px 12px;border:1px solid #ddd;text-align:center;">Passed</th>
            <th style="padding:8px 12px;border:1px solid #ddd;text-align:center;">Failed</th>
            <th style="padding:8px 12px;border:1px solid #ddd;text-align:center;">Skipped</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          ${totalRow}
        </tbody>
      </table>`;
  };

  const jiraSection = jiraKey
    ? `<p style="font-size:14px;padding:8px 12px;background:#fff3e0;border-left:4px solid #f9a825;margin:12px 0;">
        <strong>Defect:</strong> <a href="https://quantarra.atlassian.net/browse/${jiraKey}">${jiraKey}</a> — created/updated for failing tests
      </p>`
    : '';

  return `
    <html>
    <body style="font-family:Inter,Arial,sans-serif;padding:20px;max-width:800px;">
      <h2 style="margin-bottom:4px;">Daily Shakeout Report</h2>
      <p style="color:#666;margin-top:0;">${timestamp}</p>
      ${jiraSection}
      <hr style="border:none;border-top:1px solid #e0e0e0;margin:16px 0;"/>
      ${renderSummaryTable(pocResults, 'POC (poc.quantarra.com)')}
      ${renderSummaryTable(prodResults, 'PROD (app.quantarra.com)')}
      <hr style="border:none;border-top:1px solid #e0e0e0;margin:16px 0;"/>
      <p style="color:#666;font-size:12px;">
        📎 Detailed per-test-case status attached as Excel.<br/>
        This is an automated report from Quantarra QA Automation.
      </p>
    </body>
    </html>`;
}

// ===== EXCEL ATTACHMENT =====

async function generateExcelReport(pocResults: EnvResults | null, prodResults: EnvResults | null): Promise<string> {
  const workbook = new ExcelJS.Workbook();

  const addSheet = (results: EnvResults | null, sheetName: string) => {
    const sheet = workbook.addWorksheet(sheetName);

    sheet.columns = [
      { header: 'S.No', key: 'sno', width: 6 },
      { header: 'Test Scenario', key: 'scenario', width: 35 },
      { header: 'Test Case', key: 'testCase', width: 55 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Duration (s)', key: 'duration', width: 12 },
      { header: 'Error', key: 'error', width: 50 },
    ];

    // Style header row
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };

    if (!results) {
      sheet.addRow({ sno: 1, scenario: 'No results', testCase: 'Run may have failed to start', status: 'N/A', duration: 0, error: '' });
      return;
    }

    let sno = 1;
    for (const test of results.tests) {
      // Extract scenario from test title (before " > ")
      const parts = test.title.split(' > ');
      const scenario = parts[0] || '';
      const testCase = parts.length > 1 ? parts.slice(1).join(' > ') : test.title;

      const row = sheet.addRow({
        sno,
        scenario,
        testCase,
        status: test.status === 'passed' ? 'PASS' : test.status === 'failed' ? 'FAIL' : test.status === 'timedOut' ? 'TIMEOUT' : 'SKIP',
        duration: (test.duration / 1000).toFixed(1),
        error: test.error || '',
      });

      // Color code status cell
      const statusCell = row.getCell('status');
      if (test.status === 'passed') {
        statusCell.font = { color: { argb: 'FF2E7D32' }, bold: true };
      } else if (test.status === 'failed' || test.status === 'timedOut') {
        statusCell.font = { color: { argb: 'FFC62828' }, bold: true };
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3F3' } };
      } else {
        statusCell.font = { color: { argb: 'FF666666' } };
      }

      sno++;
    }
  };

  if (pocResults) {
    addSheet(pocResults, 'POC');
  }

  if (prodResults) {
    addSheet(prodResults, 'PROD');
  }

  // Write to file
  const reportDir = path.resolve(__dirname, '../reports');
  fs.mkdirSync(reportDir, { recursive: true });
  const excelPath = path.join(reportDir, 'shakeout-results.xlsx');
  await workbook.xlsx.writeFile(excelPath);
  console.log(`📊 Excel report generated: ${excelPath}`);

  return excelPath;
}

// ===== JIRA =====

function buildJiraSummary(pocResults: EnvResults | null, prodResults: EnvResults | null): string {
  const pocFailed = pocResults?.tests.filter((t) => t.status === 'failed' || t.status === 'timedOut') || [];
  const prodFailed = prodResults?.tests.filter((t) => t.status === 'failed' || t.status === 'timedOut') || [];

  let envLabel = '';
  if (pocFailed.length > 0 && prodFailed.length > 0) {
    envLabel = 'POC + PROD';
  } else if (pocFailed.length > 0) {
    envLabel = 'POC';
  } else {
    envLabel = 'PROD';
  }

  const allFailed = [...pocFailed, ...prodFailed];

  if (allFailed.length === 1) {
    const title = allFailed[0].title;
    const parts = title.split(' > ');
    const testName = parts.length > 1 ? parts[parts.length - 1] : title;
    const fullSummary = `[Shakeout] ${envLabel} — ${testName}`;
    return fullSummary.length > 200 ? fullSummary.substring(0, 197) + '...' : fullSummary;
  }

  // Extract concise but meaningful test names from each failure
  const testNames: string[] = [];
  for (const t of allFailed) {
    const parts = t.title.split(' > ');
    // Use the last part (actual test name) e.g. "TC-6: Click audit tile — shows 5 tabs"
    const testName = parts.length > 1 ? parts[parts.length - 1] : t.title;
    // Trim to keep it concise — take up to the first dash separator or 50 chars
    const concise = testName.replace(/^TC-\d+:\s*/, '').substring(0, 50).trim();
    testNames.push(concise);
  }

  const nameList = testNames.join('; ');
  const fullSummary = `[Shakeout] ${envLabel} — ${allFailed.length} failed: ${nameList}`;

  // Jira summary limit is 255 chars — truncate if needed
  return fullSummary.length > 200 ? fullSummary.substring(0, 197) + '...' : fullSummary;
}

async function createJiraTicket(pocResults: EnvResults | null, prodResults: EnvResults | null): Promise<string | null> {
  const jiraEmail = process.env.JIRA_EMAIL;
  const jiraToken = process.env.JIRA_API_TOKEN;

  if (!jiraEmail || !jiraToken) {
    console.log('⚠️  Jira credentials not configured — skipping ticket creation');
    return null;
  }

  interface FailedTestDetail {
    env: string;
    title: string;
    testName: string;
    group: string;
    error: string;
    issue: string;
    expected: string;
  }

  const failedDetails: FailedTestDetail[] = [];

  function extractFailureDetails(t: TestResult, env: string): FailedTestDetail {
    const parts = t.title.split(' > ');
    const group = parts[0] || '';
    const testName = parts.length > 1 ? parts[parts.length - 1] : t.title;
    const error = t.error || '';

    // Derive human-readable "issue" and "expected" from the error context
    let issue = '';
    let expected = '';

    if (error.includes('toBeVisible') || error.includes('not visible')) {
      // Element visibility failures
      const elementMatch = error.match(/locator\('([^']+)'\)|getByRole\('([^']+)'|getByText\('([^']+)'/);
      const element = elementMatch?.[1] || elementMatch?.[2] || elementMatch?.[3] || 'expected element';
      issue = `The "${element}" element is not visible on the page within the timeout period.`;
      expected = `The element should be visible and accessible after page load.`;
    } else if (error.includes('not.toBeVisible') || error.includes('is visible but should not be')) {
      issue = `An element is visible on the page when it should be hidden (possible RBAC/permission issue).`;
      expected = `The element should NOT be visible for the current user role.`;
    } else if (error.includes('timeout') || error.includes('Timeout') || t.status === 'timedOut') {
      issue = `Page or element did not load within the expected time. Possible performance issue or the page is broken.`;
      expected = `The page should load and render its content within 30 seconds.`;
    } else if (error.includes('401') || error.includes('Unauthorized')) {
      issue = `Authentication failed — API returned 401 Unauthorized.`;
      expected = `Login should succeed with valid credentials and return an access token.`;
    } else if (error.includes('403') || error.includes('Forbidden')) {
      issue = `Access denied — API returned 403 Forbidden. User may lack the required permission.`;
      expected = `The user role should have access to this resource.`;
    } else if (error.includes('500') || error.includes('Internal Server')) {
      issue = `Server error — API returned 500 Internal Server Error.`;
      expected = `The endpoint should respond with a successful status code (2xx).`;
    } else if (error.includes('404') || error.includes('Not Found')) {
      issue = `Resource not found — API returned 404. The endpoint or page may have been removed or renamed.`;
      expected = `The resource should exist and be accessible.`;
    } else if (error.includes('networkidle')) {
      issue = `Page did not finish loading (network activity did not settle). Possible API hanging or infinite loading state.`;
      expected = `All API calls should complete and the page should reach a stable state.`;
    } else if (error) {
      // Generic — use a cleaned-up version of the error
      issue = error.substring(0, 200);
      expected = `The test should pass without errors.`;
    } else {
      issue = `Test failed without a specific error message.`;
      expected = `The test should pass successfully.`;
    }

    return { env, title: t.title, testName, group, error, issue, expected };
  }

  if (pocResults) {
    pocResults.tests
      .filter((t) => t.status === 'failed' || t.status === 'timedOut')
      .forEach((t) => failedDetails.push(extractFailureDetails(t, 'POC')));
  }
  if (prodResults) {
    prodResults.tests
      .filter((t) => t.status === 'failed' || t.status === 'timedOut')
      .forEach((t) => failedDetails.push(extractFailureDetails(t, 'PROD')));
  }

  if (failedDetails.length === 0) {
    return null;
  }

  // Keep the simple string list for comment deduplication flow
  const failedTests = failedDetails.map(
    (d) => `[${d.env}] ${d.title}${d.error ? ` — ${d.error}` : ''}`,
  );

  const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');
  const today = new Date().toISOString().slice(0, 10);

  // Deduplication: check for existing open shakeout tickets
  const existingKey = await findExistingShakeoutTicket(auth);
  if (existingKey) {
    console.log(`🔄 Open shakeout ticket found: ${existingKey} — adding comment instead of new ticket`);
    await addJiraComment(auth, existingKey, failedTests, today);
    return existingKey;
  }

  const summary = buildJiraSummary(pocResults, prodResults);

  // Build human-readable description with structured failure details
  const envSummaryNodes: any[] = [];
  if (pocResults) {
    envSummaryNodes.push({
      type: 'paragraph',
      content: [
        { type: 'text', text: 'POC: ', marks: [{ type: 'strong' }] },
        { type: 'text', text: `${pocResults.passed} passed, ${pocResults.failed} failed, ${pocResults.skipped} skipped (out of ${pocResults.total})` },
      ],
    });
  }
  if (prodResults) {
    envSummaryNodes.push({
      type: 'paragraph',
      content: [
        { type: 'text', text: 'PROD: ', marks: [{ type: 'strong' }] },
        { type: 'text', text: `${prodResults.passed} passed, ${prodResults.failed} failed, ${prodResults.skipped} skipped (out of ${prodResults.total})` },
      ],
    });
  }

  // Build per-failure detail blocks
  const failureBlocks: any[] = [];
  for (let i = 0; i < failedDetails.length; i++) {
    const d = failedDetails[i];
    failureBlocks.push(
      {
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: `${i + 1}. [${d.env}] ${d.testName}` }],
      },
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [
              { type: 'text', text: 'Page/Area: ', marks: [{ type: 'strong' }] },
              { type: 'text', text: d.group },
            ] }],
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [
              { type: 'text', text: 'What went wrong: ', marks: [{ type: 'strong' }] },
              { type: 'text', text: d.issue },
            ] }],
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [
              { type: 'text', text: 'Expected behavior: ', marks: [{ type: 'strong' }] },
              { type: 'text', text: d.expected },
            ] }],
          },
        ],
      },
    );
  }

  const description = {
    type: 'doc',
    version: 1,
    content: [
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Automated Shakeout — Test Failures' }],
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: `Detected on: ${today} at ${new Date().toTimeString().slice(0, 8)} IST` }],
      },
      {
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: 'Environment Summary' }],
      },
      ...envSummaryNodes,
      {
        type: 'rule',
      },
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Failure Details' }],
      },
      ...failureBlocks,
      {
        type: 'rule',
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Note: ', marks: [{ type: 'strong' }] },
          { type: 'text', text: 'This ticket was auto-created by the QA automation pipeline. Check the GitHub Actions run for screenshots and trace artifacts.' },
        ],
      },
    ],
  };

  const isLoginFailure = failedTests.some(
    (t) => t.toLowerCase().includes('login') ||
           t.toLowerCase().includes('auth') ||
           t.toLowerCase().includes('health endpoint') ||
           t.toLowerCase().includes('token'),
  );
  const priority = isLoginFailure ? 'Highest' : 'High';

  const body = JSON.stringify({
    fields: {
      project: { key: process.env.JIRA_PROJECT_KEY || 'PRJAT' },
      summary,
      description,
      issuetype: { name: 'Bug' },
      priority: { name: priority },
      labels: ['shakeout', 'environment-health', 'auto-created'],
    },
  });

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: 'quantarra.atlassian.net',
        path: '/rest/api/3/issue',
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            console.log(`✅ Jira ticket created: ${parsed.key}`);
            resolve(parsed.key);
          } catch {
            console.log(`⚠️  Jira response: ${data}`);
            resolve(null);
          }
        });
      },
    );
    req.on('error', (e) => {
      console.log(`⚠️  Jira request failed: ${e.message}`);
      resolve(null);
    });
    req.write(body);
    req.end();
  });
}

async function findExistingShakeoutTicket(auth: string): Promise<string | null> {
  const jql = 'project=PRJAT AND labels=shakeout AND labels=auto-created AND status != Done ORDER BY created DESC';
  const body = JSON.stringify({ jql, maxResults: 1, fields: ['summary', 'status'] });

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: 'quantarra.atlassian.net',
        path: '/rest/api/3/search/jql',
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            const issues = parsed.issues || [];
            resolve(issues.length > 0 ? issues[0].key : null);
          } catch {
            resolve(null);
          }
        });
      },
    );
    req.on('error', () => resolve(null));
    req.write(body);
    req.end();
  });
}

async function addJiraComment(auth: string, ticketKey: string, failedTests: string[], date: string): Promise<void> {
  const comment = {
    body: {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: `Shakeout re-run (${date}) — ${failedTests.length} test(s) still failing:`, marks: [{ type: 'strong' }] },
          ],
        },
        {
          type: 'bulletList',
          content: failedTests.map((t) => ({
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: t }] }],
          })),
        },
      ],
    },
  };

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: 'quantarra.atlassian.net',
        path: `/rest/api/3/issue/${ticketKey}/comment`,
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode === 201) {
            console.log(`💬 Comment added to ${ticketKey}`);
          } else {
            console.log(`⚠️  Failed to add comment to ${ticketKey}: ${data}`);
          }
          resolve();
        });
      },
    );
    req.on('error', () => resolve());
    req.write(JSON.stringify(comment));
    req.end();
  });
}

// ===== SLACK =====

async function postToSlack(pocResults: EnvResults | null, prodResults: EnvResults | null, jiraKey: string | null): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.log('⚠️  Slack webhook not configured — skipping Slack notification');
    return;
  }

  const today = new Date().toISOString().slice(0, 10);

  const failedLines: string[] = [];
  if (pocResults) {
    pocResults.tests
      .filter((t) => t.status === 'failed' || t.status === 'timedOut')
      .forEach((t) => failedLines.push(`• *[POC]* ${t.title}${t.error ? `\n   _${t.error}_` : ''}`));
  }
  if (prodResults) {
    prodResults.tests
      .filter((t) => t.status === 'failed' || t.status === 'timedOut')
      .forEach((t) => failedLines.push(`• *[PROD]* ${t.title}${t.error ? `\n   _${t.error}_` : ''}`));
  }

  const pocSummary = pocResults ? `POC: ${pocResults.passed}/${pocResults.total} passed` : 'POC: No results';
  const prodSummary = prodResults ? `PROD: ${prodResults.passed}/${prodResults.total} passed` : 'PROD: No results';

  const jiraLine = jiraKey
    ? `\n*Defect:* <https://quantarra.atlassian.net/browse/${jiraKey}|${jiraKey}>`
    : '';

  const message = {
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `Daily Shakeout — ${today}`, emoji: false },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${pocSummary}*  |  *${prodSummary}*${jiraLine}`,
        },
      },
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Failed Tests (${failedLines.length}):*\n${failedLines.join('\n')}`,
        },
      },
    ],
  };

  const url = new URL(webhookUrl);
  const body = JSON.stringify(message);

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode === 200) {
            console.log('💬 Slack notification sent');
          } else {
            console.log(`⚠️  Slack webhook returned ${res.statusCode}: ${data}`);
          }
          resolve();
        });
      },
    );
    req.on('error', (e) => {
      console.log(`⚠️  Slack request failed: ${e.message}`);
      resolve();
    });
    req.write(body);
    req.end();
  });
}

// ===== SEND EMAIL =====

async function sendEmail(html: string, hasFailures: boolean, excelPath: string): Promise<void> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
  const recipients = process.env.REPORT_RECIPIENTS;

  if (!smtpHost || !smtpUser || !recipients) {
    console.log('⚠️  Email not configured — skipping email notification');
    console.log('   Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD, REPORT_RECIPIENTS');
    // Write HTML to file as fallback
    const reportPath = path.resolve(__dirname, '../reports/shakeout-report.html');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, html);
    console.log(`📄 Report written to: ${reportPath}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false,
    auth: { user: smtpUser, pass: smtpPassword },
  });

  const today = new Date().toISOString().slice(0, 10);
  const subject = hasFailures
    ? `[SHAKEOUT FAILED] Daily Health Check — ${today}`
    : `[SHAKEOUT PASSED] Daily Health Check — ${today}`;

  await transporter.sendMail({
    from: `"Quantarra QA" <${smtpUser}>`,
    to: recipients,
    subject,
    html,
    attachments: [
      {
        filename: `shakeout-results-${today}.xlsx`,
        path: excelPath,
      },
    ],
  });

  console.log(`📧 Email sent to: ${recipients}`);
}

// ===== MAIN =====

async function main() {
  console.log('📊 Processing shakeout results...\n');

  // Load configuration from Excel "Configuration" sheet
  const config = getShakeoutConfig();
  console.log('');

  // Load results based on configured report environment
  let pocResults: EnvResults | null = null;
  let prodResults: EnvResults | null = null;

  if (config.reportEnvironment === 'poc' || config.reportEnvironment === 'both') {
    pocResults = parseResults(path.resolve(__dirname, '../reports/poc'), 'POC');
  }

  if (config.reportEnvironment === 'prod' || config.reportEnvironment === 'both') {
    prodResults = parseResults(path.resolve(__dirname, '../reports/prod'), 'PROD');
  }

  // Summary
  if (pocResults) {
    console.log(`POC:  ${pocResults.passed}/${pocResults.total} passed, ${pocResults.failed} failed, ${pocResults.skipped} skipped`);
  }
  if (prodResults) {
    console.log(`PROD: ${prodResults.passed}/${prodResults.total} passed, ${prodResults.failed} failed, ${prodResults.skipped} skipped`);
  }

  const hasFailures =
    (pocResults?.failed ?? 0) > 0 || (prodResults?.failed ?? 0) > 0 || (!pocResults && !prodResults);

  // Create Jira ticket if there are failures (and Jira is enabled)
  let jiraKey: string | null = null;
  if (hasFailures) {
    if (config.jiraEnabled) {
      jiraKey = await createJiraTicket(pocResults, prodResults);
    } else {
      console.log('⏸️  Jira ticket creation disabled via Excel Configuration — skipping.');
    }
  }

  // Post to Slack (only on failures, if enabled)
  if (hasFailures) {
    if (config.slackEnabled) {
      await postToSlack(pocResults, prodResults, jiraKey);
    } else {
      console.log('⏸️  Slack notifications disabled via Excel Configuration — skipping.');
    }
  }

  // Generate Excel attachment with detailed results
  const excelPath = await generateExcelReport(pocResults, prodResults);

  // Generate and send email (if enabled)
  if (config.emailEnabled) {
    const html = generateEmailHtml(pocResults, prodResults, jiraKey);
    await sendEmail(html, hasFailures, excelPath);
  } else {
    console.log('⏸️  Email notifications disabled via Excel Configuration — skipping.');
    // Still write the HTML report locally as fallback
    const html = generateEmailHtml(pocResults, prodResults, jiraKey);
    const reportPath = path.resolve(__dirname, '../reports/shakeout-report.html');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, html);
    console.log(`📄 Report written locally: ${reportPath}`);
  }

  // Exit with appropriate code
  if (hasFailures) {
    console.log('\n❌ Shakeout has failures — see report above.');
    process.exit(1);
  } else {
    console.log('\n✅ All shakeout tests passed.');
  }
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
