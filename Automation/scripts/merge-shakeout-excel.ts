import ExcelJS from 'exceljs';
import * as path from 'path';

async function mergeShakeoutToExcel() {
  const filePath = path.resolve(__dirname, '../tests/New_Testcase.xlsx');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  // Remove existing "Daily Shakeout" sheet if present (for re-runs)
  const existing = wb.getWorksheet('Daily Shakeout');
  if (existing) {
    wb.removeWorksheet(existing.id);
  }

  // Add Daily Shakeout sheet
  const ws = wb.addWorksheet('Daily Shakeout');

  ws.columns = [
    { header: 'S.No', key: 'sno', width: 6 },
    { header: 'Test Group', key: 'group', width: 12 },
    { header: 'Test File', key: 'file', width: 38 },
    { header: 'Test Case', key: 'testCase', width: 65 },
    { header: 'Steps', key: 'steps', width: 100 },
    { header: 'Expected Result', key: 'expected', width: 50 },
    { header: 'Env', key: 'env', width: 12 },
    { header: 'Run for Smoketest', key: 'smoke', width: 16 },
  ];

  const headerFill: Partial<ExcelJS.Fill> = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
  ws.getRow(1).fill = headerFill as ExcelJS.Fill;
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  const tests = [
    { sno: 1, group: 'TG-1', file: '01-tg1-login-health.spec.ts', testCase: 'Login page loads — HTTP 200, no server errors', steps: '1. Navigate to /login\n2. Verify HTTP status < 400\n3. Verify email input field is visible', expected: 'Login page renders with email input', env: 'POC + Prod', smoke: 'Yes' },
    { sno: 2, group: 'TG-1', file: '01-tg1-login-health.spec.ts', testCase: 'Health endpoint — API backend is alive', steps: '1. GET /api/v1/health', expected: 'HTTP 200 response', env: 'POC + Prod', smoke: 'Yes' },
    { sno: 3, group: 'TG-1', file: '01-tg1-login-health.spec.ts', testCase: 'Auth login — valid credentials return access token', steps: '1. POST /auth/login with admin credentials\n2. Verify response has accessToken\n3. Verify user.email matches input', expected: 'HTTP 200 + valid JWT token returned', env: 'POC + Prod', smoke: 'Yes' },
    { sno: 4, group: 'TG-1', file: '01-tg1-login-health.spec.ts', testCase: 'Auth login — invalid credentials return 401', steps: '1. POST /auth/login with invalid email/password', expected: 'HTTP 401 Unauthorized', env: 'POC + Prod', smoke: 'Yes' },
    { sno: 5, group: 'TG-2', file: '02-tg2-tg3-tg4-navigation.spec.ts', testCase: 'Admin login — Create new button and Admin dropdown visible', steps: '1. Login as admin\n2. Dismiss onboarding wizard\n3. Verify "Create new" button visible\n4. Verify Admin button in sidebar', expected: 'Both Create new and Admin dropdown are visible', env: 'POC + Prod', smoke: 'Yes' },
    { sno: 6, group: 'TG-2', file: '02-tg2-tg3-tg4-navigation.spec.ts', testCase: 'Workspace pages load — Audit Groups, Pulse, Policies', steps: '1. Navigate /audit-groups → verify no error\n2. Navigate /pulse → verify "active audit" text\n3. Navigate /policies → verify "create policy" button', expected: 'All 3 workspace pages load without errors', env: 'POC + Prod', smoke: 'Yes' },
    { sno: 7, group: 'TG-3', file: '02-tg2-tg3-tg4-navigation.spec.ts', testCase: 'Contributor login — Admin, Policies, Pulse, Integrations NOT visible', steps: '1. Login as contributor\n2. Verify Admin button NOT visible\n3. Verify /policies link NOT visible\n4. Verify /pulse link NOT visible\n5. Verify /integrations link NOT visible', expected: 'All 4 restricted tabs hidden for contributor', env: 'POC + Prod', smoke: 'Yes' },
    { sno: 8, group: 'TG-4', file: '02-tg2-tg3-tg4-navigation.spec.ts', testCase: 'All Admin sub-tabs load without errors', steps: '1. Login as admin\n2. /admin → verify Add user button\n3. /admin/roles → verify Create role button\n4. /admin/integrations → no error\n5. /admin/features → no error\n6. /admin/activity → no error\n7. /admin/organization → no error', expected: 'All 6 admin sub-pages load without errors', env: 'POC + Prod', smoke: 'Yes' },
    { sno: 9, group: 'TG-6', file: '03-tg6-audit-lifecycle.spec.ts', testCase: 'Step 1-2: Audit tiles are visible on home page', steps: '1. Login as admin\n2. Navigate to /\n3. Verify at least one audit tile link exists', expected: 'At least 1 audit tile visible', env: 'POC + Prod', smoke: 'Yes' },
    { sno: 10, group: 'TG-6', file: '03-tg6-audit-lifecycle.spec.ts', testCase: 'Step 3: Search box is visible', steps: '1. Navigate to /\n2. Verify search input with placeholder "Search" is visible', expected: 'Search box is displayed', env: 'POC + Prod', smoke: 'Yes' },
    { sno: 11, group: 'TG-6', file: '03-tg6-audit-lifecycle.spec.ts', testCase: 'Step 4: Search by framework name filters matching audits', steps: '1. Type "SOC" in search box\n2. Wait 2 seconds\n3. Verify audit tiles filter (count >= 0)', expected: 'Search filters audits by framework name', env: 'POC + Prod', smoke: 'Yes' },
    { sno: 12, group: 'TG-6', file: '03-tg6-audit-lifecycle.spec.ts', testCase: 'Step 5: Search by audit name filters matching audits', steps: '1. Get first audit tile text\n2. Type first 5 chars in search\n3. Verify page still renders main content', expected: 'Search filters by partial audit name', env: 'POC + Prod', smoke: 'Yes' },
    { sno: 13, group: 'TG-6', file: '03-tg6-audit-lifecycle.spec.ts', testCase: 'Step 6: Click audit tile — shows 5 tabs', steps: '1. Click first audit tile\n2. Wait for /audit/ URL\n3. Verify >= 5 tabs visible\n4. Verify: Dashboard, Workspace, Internal Audit, Document, Action Plan', expected: 'Audit detail page shows all 5 tabs', env: 'POC + Prod', smoke: 'Yes' },
    { sno: 14, group: 'MC', file: '04-mc-availability.spec.ts', testCase: 'Mission Control — app is reachable', steps: '1. GET {mcUrl}/login\n2. Verify HTTP status < 500', expected: 'MC responds without server error', env: 'POC + Prod', smoke: 'Yes' },
    { sno: 15, group: 'MC', file: '04-mc-availability.spec.ts', testCase: 'Mission Control — page renders login form', steps: '1. Open {mcUrl}/login in browser\n2. Verify email input field is visible', expected: 'MC login form renders', env: 'POC + Prod', smoke: 'Yes' },
    { sno: 16, group: 'Audit Portal', file: '05-audit-availability.spec.ts', testCase: 'Audit Portal — app is reachable', steps: '1. GET {auditUrl}/login\n2. Verify HTTP status < 500\n(Skipped on Prod — not ready)', expected: 'Audit Portal responds without error', env: 'POC only', smoke: 'Yes' },
    { sno: 17, group: 'Audit Portal', file: '05-audit-availability.spec.ts', testCase: 'Audit Portal — page renders login form', steps: '1. Open {auditUrl}/login in browser\n2. Verify email input visible\n(Skipped on Prod — not ready)', expected: 'Audit Portal login form renders', env: 'POC only', smoke: 'Yes' },
    { sno: 18, group: 'API', file: '06-api-endpoints.spec.ts', testCase: 'Auth — obtain token for API tests', steps: '1. POST /auth/login with admin creds\n2. Store accessToken', expected: 'Token obtained successfully', env: 'POC + Prod', smoke: 'Yes' },
    { sno: 19, group: 'API', file: '06-api-endpoints.spec.ts', testCase: 'GET /users/me — returns current user profile', steps: '1. GET /users/me with Bearer token\n2. Verify has id, email, roles', expected: 'HTTP 200 + user profile', env: 'POC + Prod', smoke: 'Yes' },
    { sno: 20, group: 'API', file: '06-api-endpoints.spec.ts', testCase: 'GET /frameworks — returns list with required fields', steps: '1. GET /frameworks\n2. Verify array length > 0\n3. Verify each has id, name, sourceType', expected: 'HTTP 200 + non-empty framework list', env: 'POC + Prod', smoke: 'Yes' },
    { sno: 21, group: 'API', file: '06-api-endpoints.spec.ts', testCase: 'GET /audits — returns audit list', steps: '1. GET /audits\n2. Verify HTTP 200 + returns array', expected: 'HTTP 200 + audit array', env: 'POC + Prod', smoke: 'Yes' },
    { sno: 22, group: 'API', file: '06-api-endpoints.spec.ts', testCase: 'GET /users — returns user list', steps: '1. GET /users\n2. Verify length > 0\n3. Verify has id, email', expected: 'HTTP 200 + user list', env: 'POC + Prod', smoke: 'Yes' },
    { sno: 23, group: 'API', file: '06-api-endpoints.spec.ts', testCase: 'GET /policies — returns policy list', steps: '1. GET /policies\n2. Verify HTTP 200', expected: 'HTTP 200', env: 'POC + Prod', smoke: 'Yes' },
    { sno: 24, group: 'API', file: '06-api-endpoints.spec.ts', testCase: 'GET /business-units — returns list', steps: '1. GET /business-units\n2. Verify status < 500 (403 = alive but restricted)', expected: 'No server error (200 or 403)', env: 'POC + Prod', smoke: 'Yes' },
    { sno: 25, group: 'API', file: '06-api-endpoints.spec.ts', testCase: 'API response time — no endpoint exceeds 5s', steps: '1. Hit /health, /frameworks, /audits, /users, /policies\n2. Measure response time\n3. Verify none > 5000ms', expected: 'All endpoints respond within 5 seconds', env: 'POC + Prod', smoke: 'Yes' },
  ];

  tests.forEach((t) => ws.addRow(t));

  // Wrap text
  ws.getColumn('steps').alignment = { wrapText: true, vertical: 'top' };
  ws.getColumn('expected').alignment = { wrapText: true, vertical: 'top' };

  // Save back to same file
  await wb.xlsx.writeFile(filePath);
  console.log(`✅ "Daily Shakeout" sheet added to: ${filePath}`);
}

mergeShakeoutToExcel().catch(console.error);
