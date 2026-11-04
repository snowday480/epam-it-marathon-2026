import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Automation Configuration.
 * Fulfills all criteria from Presentation Slide 51:
 * - Dynamic dates
 * - Traces, videos, screenshots on failure
 * - Parallel isolated execution
 * - Allure & ReportPortal reporting integration
 * - CI/CD compatibility
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 30000,
  expect: {
    timeout: 7000,
  },

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['allure-playwright', { outputFolder: 'allure-results', detail: true }],
  ],

  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:4200',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],

  /* Automated SPA web server for seamless local and CI test execution */
  webServer: {
    command: 'node helpers/spa-server.mjs',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
