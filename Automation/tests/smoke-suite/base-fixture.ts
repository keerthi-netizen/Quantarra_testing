import { test as base, expect } from '@playwright/test';

/**
 * Extended test fixture for smoke-suite that automatically captures
 * and validates console errors on every page visited during each test.
 *
 * Usage: Replace `import { test, expect } from '@playwright/test'`
 * with `import { test, expect } from './base-fixture'` in smoke-suite specs.
 *
 * Each test automatically:
 * 1. Attaches a console error listener before the test runs
 * 2. After the test body completes, asserts that no JS errors were captured
 * 3. Reports the page URL and error message for any failures
 */

/** Known React/framework errors to ignore */
const IGNORED_PATTERNS = [
  /Minified React error #418/,
  /Minified React error #423/,
  /ResizeObserver loop/,
  /Failed to load resource.*favicon/,
  /Download the React DevTools/,
  /Failed to load resource.*\.svg/,  // Missing integration icons (PRJAT-887)
];

function shouldIgnore(msg: string): boolean {
  return IGNORED_PATTERNS.some((p) => p.test(msg));
}

export interface ConsoleError {
  url: string;
  message: string;
  type: 'pageerror' | 'console.error';
}

/**
 * Extended test fixture with built-in console error checking.
 * Provides `consoleErrors` array for custom assertions if needed.
 */
export const test = base.extend<{ consoleErrors: ConsoleError[] }>({
  consoleErrors: async ({ page }, use) => {
    const errors: ConsoleError[] = [];

    // Capture unhandled JS exceptions
    page.on('pageerror', (err) => {
      if (!shouldIgnore(err.message)) {
        errors.push({
          url: page.url(),
          message: err.message.substring(0, 500),
          type: 'pageerror',
        });
      }
    });

    // Capture console.error calls
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !shouldIgnore(msg.text())) {
        errors.push({
          url: page.url(),
          message: msg.text().substring(0, 500),
          type: 'console.error',
        });
      }
    });

    // Run the test
    await use(errors);

    // After test: assert no console errors
    if (errors.length > 0) {
      const report = errors
        .map((e, i) => `  ${i + 1}. [${e.type}] ${e.url}\n     ${e.message}`)
        .join('\n');

      // Soft-fail: attach as annotation so test still reports the error clearly
      expect.soft(
        errors,
        `Console errors detected during test:\n${report}`,
      ).toHaveLength(0);
    }
  },
});

export { expect };
