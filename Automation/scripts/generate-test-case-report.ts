import ExcelJS from 'exceljs';
import path from 'path';

interface TestCaseRow {
  project: string;
  module: string;
  testCase: string;
  testSteps: string;
  validationPoint: string;
}

const testCases: TestCaseRow[] = [
  // ===== WEB - CUSTOMER PORTAL =====
  // Auth Navigation - Authentication Flows
  {
    project: 'Web — Customer Portal',
    module: 'Authentication Flows',
    testCase: 'login page renders correctly',
    testSteps: '1. Navigate to /login\n2. Check email input is visible\n3. Check password input is visible\n4. Check submit button is visible',
    validationPoint: 'All three form elements (email input, password input, submit button) are visible on the login page',
  },
  {
    project: 'Web — Customer Portal',
    module: 'Authentication Flows',
    testCase: 'should redirect to dashboard on valid login (admin)',
    testSteps: '1. Navigate to /login\n2. Wait for page to load (networkidle)\n3. Fill email with admin credentials\n4. Fill password\n5. Click submit button\n6. Wait for URL to change away from /login (15s timeout)\n7. Wait for an authenticated API call to return 200',
    validationPoint: 'After login, the URL no longer contains "/login" — confirms successful authentication and redirect to dashboard',
  },
  {
    project: 'Web — Customer Portal',
    module: 'Authentication Flows',
    testCase: 'should redirect to dashboard on valid login (manager)',
    testSteps: '1. Navigate to /login\n2. Wait for page to load (networkidle)\n3. Fill email with manager credentials\n4. Fill password\n5. Click submit button\n6. Wait for URL to change away from /login (15s timeout)\n7. Wait for an authenticated API call to return 200',
    validationPoint: 'After login, the URL no longer contains "/login" — confirms manager role can authenticate successfully',
  },
  {
    project: 'Web — Customer Portal',
    module: 'Authentication Flows',
    testCase: 'should show error on wrong password',
    testSteps: '1. Navigate to /login\n2. Fill email with admin@acme.com\n3. Fill password with "WrongPassword123!"\n4. Click submit button\n5. Wait 2 seconds',
    validationPoint: 'URL still contains "/login" — user remains on login page (login was rejected)',
  },
  {
    project: 'Web — Customer Portal',
    module: 'Authentication Flows',
    testCase: 'should redirect unauthenticated user to login',
    testSteps: '1. Navigate to / (root) without any auth session\n2. Wait for networkidle',
    validationPoint: 'URL contains "/login" — unauthenticated users are redirected to login page (route protection works)',
  },

  // Auth Navigation - Navigation
  {
    project: 'Web — Customer Portal',
    module: 'Navigation',
    testCase: 'sidebar is visible with nav items',
    testSteps: '1. Login as admin\n2. Dismiss onboarding wizard\n3. Look for nav or aside element',
    validationPoint: 'A nav/aside element is visible on the page within 10 seconds — sidebar renders after login',
  },
  {
    project: 'Web — Customer Portal',
    module: 'Navigation',
    testCase: 'navigate to Pulse page',
    testSteps: '1. Login as admin\n2. Dismiss onboarding wizard\n3. Navigate to /pulse (via sidebar link or direct navigation)',
    validationPoint: 'At least one tab element (role="tab") is visible on the Pulse page within 10 seconds',
  },
  {
    project: 'Web — Customer Portal',
    module: 'Navigation',
    testCase: 'navigate to Policies page',
    testSteps: '1. Login as admin\n2. Dismiss onboarding wizard\n3. Navigate to /policies',
    validationPoint: 'Text matching "policy" (case-insensitive) is visible on the page within 10 seconds',
  },
  {
    project: 'Web — Customer Portal',
    module: 'Navigation',
    testCase: 'navigate to Admin page',
    testSteps: '1. Login as admin\n2. Dismiss onboarding wizard\n3. Navigate to /admin',
    validationPoint: 'Text matching "user" (case-insensitive) is visible on the page within 10 seconds',
  },
  {
    project: 'Web — Customer Portal',
    module: 'Navigation',
    testCase: 'no JS console errors on navigation',
    testSteps: '1. Login as admin\n2. Dismiss onboarding wizard\n3. Start collecting console errors (filtering React hydration noise)\n4. Navigate to /pulse, wait 2s\n5. Navigate to /policies, wait 2s',
    validationPoint: 'Zero JavaScript console errors captured during navigation between pages (excluding known React hydration errors #418, #423)',
  },

  // Auth Navigation - Permission Gating
  {
    project: 'Web — Customer Portal',
    module: 'Permission Gating',
    testCase: 'Contributor cannot see admin navigation',
    testSteps: '1. Login as contributor\n2. Dismiss onboarding wizard\n3. Look for link with name matching /admin|users|roles|settings/i',
    validationPoint: 'No link matching admin/users/roles/settings is visible within 5 seconds — RBAC hides admin navigation from restricted roles',
  },
  {
    project: 'Web — Customer Portal',
    module: 'Permission Gating',
    testCase: 'Administrator can see admin navigation',
    testSteps: '1. Login as admin\n2. Dismiss onboarding wizard\n3. Look for link with href containing "admin", "users", or "roles"',
    validationPoint: 'At least one link with href containing admin/users/roles is visible within 10 seconds — admin navigation renders for Administrator role',
  },

  // Audit Flows
  {
    project: 'Web — Customer Portal',
    module: 'Audit Lifecycle',
    testCase: 'audit list page shows audit cards or empty state',
    testSteps: '1. Login as admin\n2. Dismiss onboarding wizard\n3. Count elements matching main [role="link"] or a[href*="/audit/"]\n4. If count=0: check for empty state text\n5. If count>0: verify count is greater than 0',
    validationPoint: 'Either: (a) audit cards exist on the page (count > 0), OR (b) an empty state message containing "no audit", "get started", or "create" is visible. Page must show meaningful content.',
  },
  {
    project: 'Web — Customer Portal',
    module: 'Audit Lifecycle',
    testCase: 'navigate to audit detail and see tabs',
    testSteps: '1. Login as admin\n2. Dismiss onboarding wizard\n3. Find first audit card (skips test if none exist)\n4. Click the first audit card\n5. Wait for URL to contain /audit/\n6. Wait for tab elements to appear\n7. Count tabs',
    validationPoint: 'After clicking an audit card: URL contains "/audit/" AND at least 3 tabs (role="tab") are visible within 10 seconds (Dashboard, Workspace, IA, Documents, Action Plans)',
  },
  {
    project: 'Web — Customer Portal',
    module: 'Audit Lifecycle',
    testCase: 'switch between audit tabs',
    testSteps: '1. Login as admin\n2. Dismiss onboarding wizard\n3. Click first audit card (skip if none)\n4. Wait for URL to contain /audit/\n5. For each tab (Dashboard, Workspace, Internal Audit, Documents, Action Plans): click if visible, wait 500ms',
    validationPoint: 'All visible tabs can be clicked without errors — switching between tabs does not crash or produce navigation errors',
  },
  {
    project: 'Web — Customer Portal',
    module: 'Audit Lifecycle',
    testCase: 'workspace tab shows controls table',
    testSteps: '1. Login as admin\n2. Dismiss onboarding wizard\n3. Click first audit card (skip if none)\n4. Wait for URL to contain /audit/\n5. Click "Workspace" tab (if visible)\n6. Wait 2 seconds for data load\n7. Look for table/grid element',
    validationPoint: 'A table, [role="table"], or [role="grid"] element is visible within 10 seconds after selecting the Workspace tab',
  },
  {
    project: 'Web — Customer Portal',
    module: 'Audit Lifecycle',
    testCase: 'clicking a control opens evidence panel',
    testSteps: '1. Login as admin\n2. Dismiss onboarding wizard\n3. Click first audit card (skip if none)\n4. Wait for URL to contain /audit/\n5. Click "Workspace" tab\n6. Wait 2 seconds\n7. Click first table row (if visible)\n8. Wait for URL to contain /control/',
    validationPoint: 'After clicking a control row: URL contains "/control/" AND text matching "evidence" or "create new evidence" is visible within 10 seconds',
  },

  // ===== MISSION CONTROL =====
  {
    project: 'Mission Control',
    module: 'MC — Client Management',
    testCase: 'MC dashboard loads after login',
    testSteps: '1. Login as mc-admin\n2. Dismiss onboarding wizard\n3. Check URL is not /login\n4. Look for any heading element (h1, h2, h3)',
    validationPoint: 'URL does not contain "/login" AND at least one heading element is visible within 10 seconds — MC dashboard rendered successfully',
  },
  {
    project: 'Mission Control',
    module: 'MC — Client Management',
    testCase: 'clients page loads',
    testSteps: '1. Login as mc-admin\n2. Dismiss onboarding wizard\n3. Navigate to /clients\n4. Wait for DOM content loaded',
    validationPoint: 'URL contains "/clients" — page navigated successfully without redirect or error',
  },
  {
    project: 'Mission Control',
    module: 'MC — Client Management',
    testCase: 'sidebar has nav items',
    testSteps: '1. Login as mc-admin\n2. Dismiss onboarding wizard\n3. Count all links inside nav/aside elements',
    validationPoint: 'At least 5 navigation links exist in the sidebar — MC has full navigation menu rendered',
  },

  // ===== AUDIT PORTAL =====
  {
    project: 'Audit Portal',
    module: 'Audit Portal — EA Flows',
    testCase: 'login page renders',
    testSteps: '1. Navigate to /login on audit portal\n2. Check for email input\n3. Check for password input',
    validationPoint: 'Both email and password input fields are visible on the audit portal login page',
  },
  {
    project: 'Audit Portal',
    module: 'Audit Portal — EA Flows',
    testCase: 'redirects unauthenticated to login',
    testSteps: '1. Navigate to / (root) on audit portal without auth\n2. Wait for networkidle',
    validationPoint: 'URL contains "/login" — unauthenticated external auditors are redirected to login page',
  },

  // ===== API =====
  {
    project: 'API',
    module: 'API: Authentication',
    testCase: 'login returns valid access token',
    testSteps: '1. POST /auth/login with valid admin email and password\n2. Check response status\n3. Parse response body',
    validationPoint: 'Response status is 201 AND body contains "accessToken" property with a truthy value',
  },
  {
    project: 'API',
    module: 'API: Authentication',
    testCase: 'login rejects invalid credentials',
    testSteps: '1. POST /auth/login with wrong@acme.com and "WrongPass!"\n2. Check response status',
    validationPoint: 'Response status is 401 Unauthorized — invalid credentials are properly rejected',
  },
  {
    project: 'API',
    module: 'API: Users',
    testCase: 'GET /users returns user list with mfaEnabled',
    testSteps: '1. Login as admin to get access token\n2. GET /users with Bearer token\n3. Check response status\n4. Parse user array from response\n5. Iterate each user object',
    validationPoint: 'Response is 200 AND returns a non-empty array AND every user object has "mfaEnabled" property of type boolean',
  },
  {
    project: 'API',
    module: 'API: Users',
    testCase: 'GET /users/me returns current user profile',
    testSteps: '1. Login as admin to get access token\n2. GET /users/me with Bearer token\n3. Check response status\n4. Parse response body',
    validationPoint: 'Response is 200 AND body contains "email" and "orgId" properties — authenticated user profile is returned correctly',
  },
  {
    project: 'API',
    module: 'API: Audits',
    testCase: 'GET /audits returns audit list',
    testSteps: '1. Login as admin to get access token\n2. GET /audits with Bearer token\n3. Check response status\n4. Parse response body',
    validationPoint: 'Response is 200 AND body contains an array (either directly or under "data" key) — audit list endpoint is accessible',
  },
  {
    project: 'API',
    module: 'API: Audits',
    testCase: 'GET /frameworks returns available frameworks',
    testSteps: '1. Login as admin to get access token\n2. GET /frameworks with Bearer token\n3. Check response status',
    validationPoint: 'Response is 200 — frameworks endpoint is accessible and returns successfully',
  },
];

async function generateReport() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Quantarra QA Automation';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Test Cases', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  // Define columns
  sheet.columns = [
    { header: 'S.No', key: 'sno', width: 6 },
    { header: 'Project', key: 'project', width: 22 },
    { header: 'Module', key: 'module', width: 28 },
    { header: 'Test Case', key: 'testCase', width: 50 },
    { header: 'Test Steps', key: 'testSteps', width: 65 },
    { header: 'Validation Point', key: 'validationPoint', width: 70 },
  ];

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2E7D32' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  headerRow.height = 25;

  // Add data rows
  testCases.forEach((tc, index) => {
    const row = sheet.addRow({
      sno: index + 1,
      project: tc.project,
      module: tc.module,
      testCase: tc.testCase,
      testSteps: tc.testSteps,
      validationPoint: tc.validationPoint,
    });

    row.alignment = { vertical: 'top', wrapText: true };
    row.height = 60;

    // Alternate row colors
    if (index % 2 === 0) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF5F5F5' },
      };
    }
  });

  // Add borders to all cells
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  });

  // Add summary sheet
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Project', key: 'project', width: 25 },
    { header: 'Modules', key: 'modules', width: 15 },
    { header: 'Test Cases', key: 'testCases', width: 15 },
  ];

  const summaryHeaderRow = summarySheet.getRow(1);
  summaryHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  summaryHeaderRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2E7D32' },
  };

  summarySheet.addRow({ project: 'Web — Customer Portal', modules: 4, testCases: 17 });
  summarySheet.addRow({ project: 'Mission Control', modules: 1, testCases: 3 });
  summarySheet.addRow({ project: 'Audit Portal', modules: 1, testCases: 2 });
  summarySheet.addRow({ project: 'API', modules: 3, testCases: 6 });
  const totalRow = summarySheet.addRow({ project: 'TOTAL', modules: 9, testCases: 28 });
  totalRow.font = { bold: true };

  const outputPath = path.resolve('./reports/test-case-report.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log(`Excel report generated: ${outputPath}`);
}

generateReport().catch(console.error);
