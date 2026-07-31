import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import { createJiraBug } from '../jira/create-bug';
import { getEnvConfig } from '../config/environment';

interface FailedTest {
  title: string;
  file: string;
  error: string;
  screenshot?: string;
  url?: string;
}

/**
 * Custom Playwright reporter that auto-creates Jira bugs for new failures.
 *
 * Usage in playwright.config.ts:
 *   reporter: [['./src/reporters/jira-reporter.ts', { autoCreate: true }]]
 *
 * Set autoCreate: false to only log failures (no Jira creation).
 */
export default class JiraReporter implements Reporter {
  private failures: FailedTest[] = [];
  private autoCreate: boolean;

  constructor(options?: { autoCreate?: boolean }) {
    this.autoCreate = options?.autoCreate ?? false;
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (result.status === 'failed' || result.status === 'timedOut') {
      const screenshot = result.attachments.find((a) => a.name === 'screenshot')?.path;

      this.failures.push({
        title: `${test.parent.title} > ${test.title}`,
        file: test.location.file,
        error: result.error?.message || 'Unknown error',
        screenshot,
      });
    }
  }

  async onEnd(result: FullResult): Promise<void> {
    if (this.failures.length === 0) {
      console.log('\n✅ All tests passed — no Jira bugs to create.\n');
      return;
    }

    console.log(`\n❌ ${this.failures.length} test(s) failed.\n`);

    if (!this.autoCreate) {
      console.log('Jira auto-creation disabled. Set autoCreate: true to enable.\n');
      console.log('Failed tests:');
      this.failures.forEach((f) => console.log(`  - ${f.title}`));
      return;
    }

    const envConfig = getEnvConfig();

    for (const failure of this.failures) {
      try {
        await createJiraBug({
          title: failure.title,
          stepsToReproduce: `Automated Playwright test failed.\nFile: ${failure.file}`,
          expectedBehavior: 'Test should pass without errors',
          actualBehavior: failure.error.substring(0, 2000),
          severity: 'High',
          screenshotPath: failure.screenshot,
          testFile: failure.file,
          testName: failure.title,
          url: envConfig.baseUrl,
        });
      } catch (err) {
        console.error(`⚠️ Failed to create Jira bug for: ${failure.title}`, err);
      }
    }
  }
}
