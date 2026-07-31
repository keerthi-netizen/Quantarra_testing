import { test as base, expect } from '@playwright/test';
import { createJiraBug } from '../jira/create-bug';
import { getEnvConfig } from '../config/environment';

/**
 * Extended test fixture that adds `reportBug()` method.
 * Use this in tests where you want to manually trigger Jira bug creation
 * when a known issue is found during exploratory testing or script enhancement.
 *
 * Usage:
 *   import { test } from '../../src/fixtures/jira-test';
 *
 *   test('my test', async ({ page, reportBug }) => {
 *     // ... test steps ...
 *     if (somethingBroken) {
 *       await reportBug({
 *         title: 'Button X does not work on page Y',
 *         severity: 'High',
 *         stepsToReproduce: '1. Login\n2. Navigate to Y\n3. Click X',
 *         expectedBehavior: 'Should open dialog',
 *         actualBehavior: 'Nothing happens, console shows 403',
 *       });
 *     }
 *   });
 */
interface BugReport {
  title: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  stepsToReproduce: string;
  expectedBehavior: string;
  actualBehavior: string;
  consoleErrors?: string[];
}

export const test = base.extend<{
  reportBug: (bug: BugReport) => Promise<string>;
}>({
  reportBug: async ({ page }, use, testInfo) => {
    const reportBug = async (bug: BugReport): Promise<string> => {
      // Take screenshot automatically
      const screenshotPath = `./reports/screenshots/bug-${Date.now()}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });

      const issue = await createJiraBug({
        ...bug,
        screenshotPath,
        testFile: testInfo.file,
        testName: testInfo.title,
        url: page.url(),
      });

      // Annotate the test with the Jira key
      testInfo.annotations.push({
        type: 'jira-bug',
        description: issue.key,
      });

      return issue.key;
    };

    await use(reportBug);
  },
});

export { expect };
