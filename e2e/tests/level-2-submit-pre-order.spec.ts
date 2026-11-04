import { test, expect } from '../fixtures/test.fixtures';

test.describe('🔵 Level 2: Submit Pre-Order (Підтвердження pre-order ресторану)', () => {
  test('2.1 [Positive] Owner confirms submission: status transitions to "Sent to Restaurant"', async ({
    groupOrderPage,
    apiClient,
    seededSnapshot,
  }) => {
    await apiClient.seedGroupOrder(seededSnapshot);
    await groupOrderPage.goto(seededSnapshot.reservationId);
    await groupOrderPage.waitForLoaded();

    // Verify initial open status
    expect(await groupOrderPage.getStatusBadgeText()).toContain('Collecting pre-orders');
    await expect(groupOrderPage.submitPreOrderButton).toBeEnabled();

    // Open modal
    const modal = await groupOrderPage.clickSubmitPreOrder();
    await expect(modal.title).toHaveText('Submit Pre-Order');
    await expect(modal.message).toContainText('Are you sure you want to submit the group pre-order');

    // Confirm submission
    await modal.confirmSubmit();

    // Status badge transitions to Sent to Restaurant
    await expect(groupOrderPage.statusBadge).toHaveText('Sent to Restaurant');
  });

  test('2.2 [Positive] Submit button is hidden after submission, preventing double submit', async ({
    groupOrderPage,
    apiClient,
    seededSnapshot,
  }) => {
    // Start with already submitted order
    seededSnapshot.status = 'Submitted';
    await apiClient.seedGroupOrder(seededSnapshot);

    await groupOrderPage.goto(seededSnapshot.reservationId);
    await groupOrderPage.waitForLoaded();

    // Submit button must not be present in DOM
    await expect(groupOrderPage.submitPreOrderButton).toHaveCount(0);
    await expect(groupOrderPage.statusBadge).toHaveText('Sent to Restaurant');
  });

  test('2.3 [Positive] Consolidated dishes payload is correctly sent to backend API', async ({
    page,
    groupOrderPage,
    apiClient,
    seededSnapshot,
  }) => {
    await apiClient.seedGroupOrder(seededSnapshot);

    // Track intercepted submit request payload
    let submitRequestCaptured: any = null;
    await page.route(`**/group-reservations/${seededSnapshot.groupId}/submit`, async (route) => {
      submitRequestCaptured = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ dishId: 'dish-spring-salad', quantity: 3 }]),
      });
    });

    await groupOrderPage.goto(seededSnapshot.reservationId);
    await groupOrderPage.waitForLoaded();

    const modal = await groupOrderPage.clickSubmitPreOrder();
    await modal.confirmSubmit();

    expect(submitRequestCaptured).not.toBeNull();
    expect(submitRequestCaptured.reservationId).toBe(seededSnapshot.reservationId);
  });

  test('2.4 [Negative] Clicking Cancel in modal aborts submission without state change', async ({
    groupOrderPage,
    apiClient,
    seededSnapshot,
  }) => {
    await apiClient.seedGroupOrder(seededSnapshot);
    await groupOrderPage.goto(seededSnapshot.reservationId);
    await groupOrderPage.waitForLoaded();

    const modal = await groupOrderPage.clickSubmitPreOrder();
    await expect(modal.root).toBeVisible();

    // Click Cancel
    await modal.cancel();

    // Modal closed
    await expect(modal.root).not.toBeVisible();

    // Status remains Open
    expect(await groupOrderPage.getStatusBadgeText()).toContain('Collecting pre-orders');
    await expect(groupOrderPage.submitPreOrderButton).toBeVisible();
  });

  test('2.5 [Negative] Closing modal via X icon dismisses dialog safely', async ({
    groupOrderPage,
    apiClient,
    seededSnapshot,
  }) => {
    await apiClient.seedGroupOrder(seededSnapshot);
    await groupOrderPage.goto(seededSnapshot.reservationId);
    await groupOrderPage.waitForLoaded();

    const modal = await groupOrderPage.clickSubmitPreOrder();
    await modal.close();

    await expect(modal.root).not.toBeVisible();
    expect(await groupOrderPage.getStatusBadgeText()).toContain('Collecting pre-orders');
  });

  test('2.6 [Negative] Server failure (500) on submit retains order in editable state', async ({
    groupOrderPage,
    apiClient,
    seededSnapshot,
  }) => {
    await apiClient.seedGroupOrder(seededSnapshot);
    await apiClient.mockSubmitFailure(seededSnapshot.groupId);

    await groupOrderPage.goto(seededSnapshot.reservationId);
    await groupOrderPage.waitForLoaded();

    const modal = await groupOrderPage.clickSubmitPreOrder();
    await modal.confirmSubmit();

    // Since submit failed on server, status badge does not flip to Sent to Restaurant
    await expect(groupOrderPage.statusBadge).not.toHaveText('Sent to Restaurant');
  });
});
