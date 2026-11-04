import { test as baseTest, expect } from '@playwright/test';
import { GroupOrderPage } from '../pages/group-order.page';
import { GroupOrderApiClient } from '../api/group-order-api.client';
import { buildTestGroupOrder, GroupOrderSnapshot } from '../helpers/data-factory';

type TestFixtures = {
  groupOrderPage: GroupOrderPage;
  apiClient: GroupOrderApiClient;
  seededSnapshot: GroupOrderSnapshot;
};

/**
 * Extended Playwright Test runner with Onion Architecture fixtures.
 * Automatically seeds test data before each test and performs cleanup after (Slide 41 & 51).
 */
export const test = baseTest.extend<TestFixtures>({
  apiClient: async ({ page }, use) => {
    const client = new GroupOrderApiClient(page);
    await use(client);
    // Cleanup step after test completes
    await client.cleanup();
  },

  seededSnapshot: async ({}, use) => {
    // Generate fresh isolated test snapshot with dynamic date (now + 2 days)
    const snapshot = buildTestGroupOrder({ daysAhead: 2 });
    await use(snapshot);
  },

  groupOrderPage: async ({ page }, use) => {
    const groupOrderPage = new GroupOrderPage(page);
    await use(groupOrderPage);
  },
});

export { expect };
