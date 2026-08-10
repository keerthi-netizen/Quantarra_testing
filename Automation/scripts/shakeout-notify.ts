/**
 * Daily Shakeout — Consolidated Report & Notification
 *
 * Reads test results from both POC and Prod runs, then:
 * 1. If ANY test failed → creates a Jira ticket with full details
 * 2. Sends a consolidated email with pass/fail status for both environments
 *
 * Run: npx tsx scripts/shakeout-notify.ts
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as nodemailer from 'nodemailer';

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
    // Remove ANSI escape codes
    .replace(/\u001b\[\d+m/g, '')
    .replace(/␛\[\d+m/g, '')
    .replace(/\[[\d;]*m/g, '')
    // Remove "expect(locator).not.toBeVisible()" noise
    .replace(/expect\(\s*locator\s*\)\s*\.not\s*\.\s*toBeVisible\s*\(\)/g, '')
    // Simplify timeout messages
    .replace(/Timed out \d+ms waiting for\s*/g, '')
    // Remove "Call log:" and everything after
    .replace(/Call log:[\s\S]*/g, '')
    // Clean up whitespace
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

async function createJiraTicket(pocResults: EnvResults | null, prodResults: EnvResults | null): Promise<string | null> {
  const jiraEmail = process.env.JIRA_EMAIL;
  const jiraToken = process.env.JIRA_API_TOKEN;

  if (!jiraEmail || !jiraToken) {
    console.log('⚠️  Jira credentials not configured — skipping ticket creation');
    return null;
  }

  const failedTests: string[] = [];
  if (pocResults) {
    pocResults.tests
      .filter((t) => t.status === 'failed' || t.status === 'timedOut')
      .forEach((t) => failedTests.push(`[POC] ${t.title}${t.error ? ` — ${t.error}` : ''}`));
  }
  if (prodResults) {
    prodResults.tests
      .filter((t) => t.status === 'failed' || t.status === 'timedOut')
      .forEach((t) => failedTests.push(`[PROD] ${t.title}${t.error ? ` — ${t.error}` : ''}`));
  }

  if (failedTests.length === 0) {
    return null;
  }

  const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');
  const today = new Date().toISOString().slice(0, 10);

  // --- DEDUPLICATION: Check for existing open shakeout tickets ---
  const existingKey = await findExistingShakeoutTicket(auth);
  if (existingKey) {
    console.log(`🔄 Open shakeout ticket found: ${existingKey} — adding comment instead of new ticket`);
    await addJiraComment(auth, existingKey, failedTests, today);
    return existingKey;
  }

  // --- No existing ticket: create new one ---
  const summary = `[Shakeout] ${failedTests.length} test(s) failed — ${today}`;

  const description = {
    type: 'doc',
    version: 1,
    content: [
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Daily Shakeout Failures' }],
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: `Run time: ${new Date().toISOString()}` }],
      },
      ...(pocResults
        ? [
            {
              type: 'heading',
              attrs: { level: 3 },
              content: [{ type: 'text', text: `POC: ${pocResults.passed}/${pocResults.total} passed` }],
            },
          ]
        : []),
      ...(prodResults
        ? [
            {
              type: 'heading',
              attrs: { level: 3 },
              content: [{ type: 'text', text: `PROD: ${prodResults.passed}/${prodResults.total} passed` }],
            },
          ]
        : []),
      {
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: 'Failed Tests' }],
      },
      {
        type: 'bulletList',
        content: failedTests.map((t) => ({
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: t }] }],
        })),
      },
    ],
  };

  const body = JSON.stringify({
    fields: {
      project: { key: process.env.JIRA_PROJECT_KEY || 'PRJAT' },
      summary,
      description,
      issuetype: { name: 'Bug' },
      priority: { name: 'High' },
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

/**
 * Search for an existing open shakeout ticket (not Done/Closed).
 * Returns the ticket key if found, null otherwise.
 */
async function findExistingShakeoutTicket(auth: string): Promise<string | null> {
  const jql = 'project=PRJAT AND labels=shakeout AND labels=auto-created AND status != Done ORDER BY created DESC';
  const body = JSON.stringify({
    jql,
    maxResults: 1,
    fields: ['summary', 'status'],
  });

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
            if (issues.length > 0) {
              resolve(issues[0].key);
            } else {
              resolve(null);
            }
          } catch {
            console.log(`⚠️  Jira search failed: ${data}`);
            resolve(null);
          }
        });
      },
    );
    req.on('error', (e) => {
      console.log(`⚠️  Jira search request failed: ${e.message}`);
      resolve(null);
    });
    req.write(body);
    req.end();
  });
}

/**
 * Add a comment to an existing shakeout ticket with today's failures.
 */
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
    req.on('error', (e) => {
      console.log(`⚠️  Comment request failed: ${e.message}`);
      resolve();
    });
    req.write(JSON.stringify(comment));
    req.end();
  });
}

function generateEmailHtml(pocResults: EnvResults | null, prodResults: EnvResults | null, jiraKey: string | null): string {
  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const renderEnv = (results: EnvResults | null, name: string): string => {
    if (!results) {
      return `<h3>${name}: No results (run may have failed to start)</h3>`;
    }

    const statusLabel = results.failed > 0 ? 'FAILED' : 'PASSED';
    const statusColor = results.failed > 0 ? '#c62828' : '#2e7d32';
    const rows = results.tests
      .map(
        (t) => {
          const statusText = t.status === 'passed' ? 'Passed' : t.status === 'failed' ? 'Failed' : t.status === 'timedOut' ? 'Timed Out' : 'Skipped';
          const rowColor = t.status === 'failed' || t.status === 'timedOut' ? 'background:#fff3f3;' : '';
          return `
      <tr style="${rowColor}">
        <td style="padding:4px 8px;border:1px solid #ddd;">${statusText}</td>
        <td style="padding:4px 8px;border:1px solid #ddd;">${t.title}</td>
        <td style="padding:4px 8px;border:1px solid #ddd;">${(t.duration / 1000).toFixed(1)}s</td>
        <td style="padding:4px 8px;border:1px solid #ddd;color:#c62828;">${t.error || ''}</td>
      </tr>`;
        },
      )
      .join('');

    return `
      <h3 style="color:${statusColor};">${name} — ${statusLabel} (${results.passed}/${results.total} passed, ${results.failed} failed)</h3>
      <table style="border-collapse:collapse;width:100%;font-size:13px;">
        <thead>
          <tr style="background:#f5f5f5;">
            <th style="padding:4px 8px;border:1px solid #ddd;">Status</th>
            <th style="padding:4px 8px;border:1px solid #ddd;">Test</th>
            <th style="padding:4px 8px;border:1px solid #ddd;">Duration</th>
            <th style="padding:4px 8px;border:1px solid #ddd;">Error</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  };

  const jiraSection = jiraKey
    ? `<p style="font-size:14px;padding:8px 12px;background:#fff3e0;border-left:4px solid #f9a825;margin:12px 0;">
        <strong>Defect:</strong> <a href="https://quantarra.atlassian.net/browse/${jiraKey}">${jiraKey}</a> — created/updated for failing tests
      </p>`
    : '<p style="font-size:14px;padding:8px 12px;background:#e8f5e9;border-left:4px solid #2e7d32;margin:12px 0;"><strong>No defects</strong> — all tests passed</p>';

  return `
    <html>
    <body style="font-family:Inter,Arial,sans-serif;padding:20px;">
      <h2>Daily Shakeout Report — ${timestamp}</h2>
      ${jiraSection}
      <hr/>
      ${renderEnv(pocResults, 'POC (poc.quantarra.com)')}
      <br/>
      ${renderEnv(prodResults, 'PROD (app.quantarra.com)')}
      <hr/>
      <p style="color:#666;font-size:12px;">
        This is an automated report from Quantarra QA Automation.
        Triggered at 9 AM IST and 7 PM IST daily.
      </p>
    </body>
    </html>`;
}

async function sendEmail(html: string, hasFailures: boolean): Promise<void> {
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
  });

  console.log(`📧 Email sent to: ${recipients}`);
}

// ===== MAIN =====
async function main() {
  console.log('📊 Processing shakeout results...\n');

  const pocResults = parseResults(path.resolve(__dirname, '../reports/poc'), 'POC');
  const prodResults = parseResults(path.resolve(__dirname, '../reports/prod'), 'PROD');

  // Summary
  if (pocResults) {
    console.log(`POC:  ${pocResults.passed}/${pocResults.total} passed, ${pocResults.failed} failed`);
  }
  if (prodResults) {
    console.log(`PROD: ${prodResults.passed}/${prodResults.total} passed, ${prodResults.failed} failed`);
  }

  const hasFailures =
    (pocResults?.failed ?? 0) > 0 || (prodResults?.failed ?? 0) > 0 || !pocResults || !prodResults;

  // Create Jira ticket if there are failures
  let jiraKey: string | null = null;
  if (hasFailures) {
    jiraKey = await createJiraTicket(pocResults, prodResults);
  }

  // Post to Slack (only on failures)
  if (hasFailures) {
    await postToSlack(pocResults, prodResults, jiraKey);
  }

  // Generate and send email (always — includes pass status too)
  const html = generateEmailHtml(pocResults, prodResults, jiraKey);
  await sendEmail(html, hasFailures);

  // Exit with appropriate code
  if (hasFailures) {
    console.log('\n❌ Shakeout has failures — see report above.');
    process.exit(1);
  } else {
    console.log('\n✅ All shakeout tests passed on both environments.');
  }
}

/**
 * Post failed test summary to Slack via Incoming Webhook.
 */
async function postToSlack(pocResults: EnvResults | null, prodResults: EnvResults | null, jiraKey: string | null): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.log('⚠️  Slack webhook not configured — skipping Slack notification');
    return;
  }

  const today = new Date().toISOString().slice(0, 10);

  // Build failed tests list
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

  // Build summary line
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
      {
        type: 'divider',
      },
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

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
