# Quantarra QA Automation

Standalone Playwright test automation for the Quantarra compliance platform. Runs from your local machine against any environment (dev/staging/prod).

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Install Playwright browsers
npm run setup

# 3. Copy env config and fill in your credentials
cp .env.example .env
# Edit .env with your credentials

# 4. Run tests against dev
npm run test:dev

# 5. Generate Excel report
npm run report:excel
```

## Project Structure

```
quantarra-qa-automation/
├── src/
│   ├── config/
│   │   └── environment.ts          # Environment resolver (dev/staging/prod)
│   ├── helpers/
│   │   └── auth.ts                 # Login, navigation, utilities
│   ├── fixtures/
│   │   └── jira-test.ts            # Extended test with reportBug()
│   ├── jira/
│   │   └── create-bug.ts           # Jira REST API integration
│   └── reporters/
│       ├── jira-reporter.ts        # Auto-create Jira bugs on failure
│       └── generate-excel-report.ts # Excel report generator
├── tests/
│   ├── web/                        # Customer portal tests
│   ├── mission-control/            # MC admin tests
│   ├── audit-portal/               # External auditor tests
│   └── api/                        # Direct API tests
├── reports/                        # Generated reports (gitignored)
├── playwright.config.ts            # Multi-project Playwright config
├── .env.example                    # Environment template
└── package.json
```

## Environment Switching

Three ways to switch environments:

```bash
# 1. Via npm script
npm run test:dev
npm run test:staging
npm run test:prod

# 2. Via ENV variable
ENV=staging npx playwright test

# 3. Via .env file (set ENV=dev|staging|prod)
```

Each environment resolves its own URLs:
- `DEV_BASE_URL`, `DEV_MC_URL`, `DEV_AUDIT_URL`, `DEV_API_URL`
- `STAGING_BASE_URL`, `STAGING_MC_URL`, etc.
- `PROD_BASE_URL`, `PROD_MC_URL`, etc.

## Running Tests

```bash
# All tests (all projects)
npm test

# Specific project
npx playwright test --project=web-chromium
npx playwright test --project=mc-chromium
npx playwright test --project=api

# Specific file
npx playwright test tests/web/auth-navigation.spec.ts

# Headed mode (see the browser)
npm run test:headed

# Debug mode (step through)
npm run test:debug

# Playwright UI (interactive)
npm run test:ui

# With grep filter
npx playwright test -g "login"
```

## Test Credentials

Configured in `.env`. Default test users:

| Role | Email | Use For |
|------|-------|---------|
| admin | admin@acme.com | Full access, admin flows |
| manager | manager@acme.com | Mid-privilege flows |
| contributor | contributor@acme.com | Restricted access, RBAC |
| mc-admin | mc-admin@quantarra.io | Mission Control |

In tests, use the role-based login:
```typescript
import { login } from '../../src/helpers/auth';

await login(page, 'admin');      // uses ADMIN_EMAIL/ADMIN_PASSWORD
await login(page, 'contributor'); // uses CONTRIBUTOR_EMAIL/CONTRIBUTOR_PASSWORD
```

## Jira Integration

### Automatic Bug Creation (on test failure)

Enable in `playwright.config.ts`:
```typescript
reporter: [
  ['./src/reporters/jira-reporter.ts', { autoCreate: true }],
]
```

Every failed test auto-creates a Jira bug with:
- Title: `[QA-AUTO] Suite > Test name`
- Steps to reproduce (from test file path)
- Error message
- Screenshot attached
- Labels: `qa-automation`, `env-{environment}`, `playwright`

### Manual Bug Reporting (during test enhancement)

Use the extended fixture when you discover a bug during testing:

```typescript
import { test, expect } from '../../src/fixtures/jira-test';

test('verify feature X', async ({ page, reportBug }) => {
  await login(page, 'admin');
  // ... interact with feature ...

  if (buttonDoesNotWork) {
    const jiraKey = await reportBug({
      title: 'Feature X button unresponsive on staging',
      severity: 'High',
      stepsToReproduce: '1. Login as admin\n2. Navigate to /feature-x\n3. Click Submit',
      expectedBehavior: 'Form submits and shows success toast',
      actualBehavior: 'Nothing happens. Console shows 403 Forbidden.',
    });
    console.log(`Bug created: ${jiraKey}`);
  }
});
```

### Jira Config (.env)
```
JIRA_BASE_URL=https://quantarra.atlassian.net
JIRA_PROJECT_KEY=PRJAT
JIRA_EMAIL=your-email@quantarra.io
JIRA_API_TOKEN=your-api-token
JIRA_ASSIGNEE_ID=optional-account-id
```

## Excel Reports

After running tests, generate a formatted Excel report:

```bash
npm run report:excel
```

Output: `reports/test-report-{timestamp}.xlsx`

The report includes 4 sheets:
1. **Summary** — pass rate, total count, duration, environment
2. **Test Results** — every test with status, duration, color-coded
3. **Failures** — failed tests with error messages
4. **Suite Summary** — aggregated pass/fail per suite

## Writing New Tests

### Pattern

```typescript
import { test, expect } from '@playwright/test';
import { login, dismissWizard, navigateTo } from '../../src/helpers/auth';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin');
    await dismissWizard(page);
  });

  test('should do X when Y', async ({ page }) => {
    await navigateTo(page, '/target-page');
    // ... assertions ...
  });
});
```

### Conventions

- File names: `{feature}.spec.ts`
- Describe blocks: feature or page name
- Test names: `should {behavior} when {condition}`
- Use role-based login (not hardcoded creds)
- Use `navigateTo()` helper for page navigation
- Take screenshots for evidence: `await takeEvidence(page, 'step-name')`

## Adding Environments

To add a new environment (e.g., `uat`):

1. Add URLs to `.env.example` and `.env`:
   ```
   UAT_BASE_URL=https://uat.quantarra.com
   UAT_MC_URL=...
   ```

2. Update `src/config/environment.ts`:
   - Add `'uat'` to the `Environment` type
   - Add to the validation array

3. Add npm script to `package.json`:
   ```json
   "test:uat": "cross-env ENV=uat npx playwright test"
   ```
