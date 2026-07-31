import { getJiraConfig, getEnvConfig } from '../config/environment';

interface JiraBugPayload {
  title: string;
  stepsToReproduce: string;
  expectedBehavior: string;
  actualBehavior: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  screenshotPath?: string;
  testFile?: string;
  testName?: string;
  consoleErrors?: string[];
  url?: string;
}

interface JiraIssue {
  key: string;
  id: string;
  self: string;
}

/**
 * Creates a Jira bug ticket from test failure data.
 * Uses Jira REST API v3 with ADF (Atlassian Document Format).
 */
export async function createJiraBug(payload: JiraBugPayload): Promise<JiraIssue> {
  const config = getJiraConfig();
  const envConfig = getEnvConfig();

  if (!config.email || !config.apiToken) {
    throw new Error(
      'Jira credentials not configured. Set JIRA_EMAIL and JIRA_API_TOKEN in .env',
    );
  }

  const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');

  const description = buildAdfDescription(payload, envConfig.env);

  const body = {
    fields: {
      project: { key: config.projectKey },
      summary: `[QA-AUTO] ${payload.title}`,
      issuetype: { name: 'Bug' },
      priority: { name: mapSeverityToPriority(payload.severity) },
      labels: ['qa-automation', `env-${envConfig.env}`, 'playwright'],
      description,
      ...(config.assigneeId ? { assignee: { accountId: config.assigneeId } } : {}),
    },
  };

  const response = await fetch(`${config.baseUrl}/rest/api/3/issue`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Jira API error (${response.status}): ${error}`);
  }

  const issue: JiraIssue = await response.json();
  console.log(`✅ Jira bug created: ${issue.key} — ${config.baseUrl}/browse/${issue.key}`);

  // Attach screenshot if provided
  if (payload.screenshotPath) {
    await attachScreenshot(issue.key, payload.screenshotPath, config, auth);
  }

  return issue;
}

/**
 * Attaches a screenshot file to an existing Jira issue.
 */
async function attachScreenshot(
  issueKey: string,
  filePath: string,
  config: ReturnType<typeof getJiraConfig>,
  auth: string,
): Promise<void> {
  const fs = await import('fs');
  const path = await import('path');

  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ Screenshot not found: ${filePath}`);
    return;
  }

  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);

  const formData = new FormData();
  formData.append('file', new Blob([fileBuffer]), fileName);

  const response = await fetch(`${config.baseUrl}/rest/api/3/issue/${issueKey}/attachments`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'X-Atlassian-Token': 'no-check',
    },
    body: formData,
  });

  if (response.ok) {
    console.log(`📎 Screenshot attached to ${issueKey}`);
  } else {
    console.warn(`⚠️ Failed to attach screenshot: ${response.status}`);
  }
}

/**
 * Builds Atlassian Document Format (ADF) body for the bug description.
 */
function buildAdfDescription(payload: JiraBugPayload, env: string) {
  const content: any[] = [
    // Environment info
    {
      type: 'heading',
      attrs: { level: 3 },
      content: [{ type: 'text', text: 'Environment' }],
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: `Environment: `, marks: [{ type: 'strong' }] },
        { type: 'text', text: env.toUpperCase() },
      ],
    },
  ];

  if (payload.url) {
    content.push({
      type: 'paragraph',
      content: [
        { type: 'text', text: `URL: `, marks: [{ type: 'strong' }] },
        { type: 'text', text: payload.url },
      ],
    });
  }

  if (payload.testFile) {
    content.push({
      type: 'paragraph',
      content: [
        { type: 'text', text: `Test: `, marks: [{ type: 'strong' }] },
        { type: 'text', text: `${payload.testFile} > ${payload.testName || ''}` },
      ],
    });
  }

  // Steps to reproduce
  content.push(
    {
      type: 'heading',
      attrs: { level: 3 },
      content: [{ type: 'text', text: 'Steps to Reproduce' }],
    },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: payload.stepsToReproduce }],
    },
  );

  // Expected behavior
  content.push(
    {
      type: 'heading',
      attrs: { level: 3 },
      content: [{ type: 'text', text: 'Expected Behavior' }],
    },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: payload.expectedBehavior }],
    },
  );

  // Actual behavior
  content.push(
    {
      type: 'heading',
      attrs: { level: 3 },
      content: [{ type: 'text', text: 'Actual Behavior' }],
    },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: payload.actualBehavior }],
    },
  );

  // Console errors
  if (payload.consoleErrors?.length) {
    content.push(
      {
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: 'Console Errors' }],
      },
      {
        type: 'codeBlock',
        attrs: { language: 'text' },
        content: [{ type: 'text', text: payload.consoleErrors.join('\n') }],
      },
    );
  }

  return {
    type: 'doc',
    version: 1,
    content,
  };
}

function mapSeverityToPriority(severity: JiraBugPayload['severity']): string {
  switch (severity) {
    case 'Critical':
      return 'Highest';
    case 'High':
      return 'High';
    case 'Medium':
      return 'Medium';
    case 'Low':
      return 'Low';
  }
}
