import { test, expect } from '../fixtures/test.fixtures';
import { buildEmptyGroupOrder, SAMPLE_DISHES } from '../helpers/data-factory';

test.describe('🟢 Level 1: Owner Review (Перегляд учасників, страв та сум)', () => {
  test('1.1 [Positive] Owner sees all participants, their dishes, quantities, and prices', async ({
    groupOrderPage,
    apiClient,
    seededSnapshot,
  }) => {
    // 1. Arrange: Seed test data with dynamic now + N date
    await apiClient.seedGroupOrder(seededSnapshot);

    // 2. Act: Navigate to Owner group pre-order screen
    await groupOrderPage.goto(seededSnapshot.reservationId);
    await groupOrderPage.waitForLoaded();

    // 3. Assert: Header & Status
    await expect(groupOrderPage.headerTitle).toHaveText('Group Pre-Order');
    const badgeText = await groupOrderPage.getStatusBadgeText();
    expect(badgeText).toContain('Collecting pre-orders');

    // 4. Assert: Participants list
    const cards = await groupOrderPage.getAllParticipantCards();
    expect(cards.length).toBe(seededSnapshot.participants.length);

    // Verify Owner card details
    const ownerCard = await groupOrderPage.getOwnerCard();
    expect(ownerCard).not.toBeNull();
    expect(await ownerCard!.isSubmitted()).toBe(true);

    const ownerItems = await ownerCard!.getItemRows();
    expect(ownerItems.length).toBe(2);
    expect(ownerItems[0].name).toBe(SAMPLE_DISHES.SPRING_SALAD.name);
    expect(ownerItems[0].quantity).toContain('1');
    expect(ownerItems[1].name).toBe(SAMPLE_DISHES.AVOCADO_BOWL.name);
    expect(await ownerCard!.getSubtotal()).toBe('$26.50');

    // Verify Guest cards
    const katerynaCard = await groupOrderPage.getParticipantCardByName('Kateryna');
    expect(katerynaCard).not.toBeNull();
    expect(await katerynaCard!.getSubtotal()).toBe('$24.00');

    const marianaCard = await groupOrderPage.getParticipantCardByName('Mariana');
    expect(marianaCard).not.toBeNull();
    expect(await marianaCard!.emptyNotice).toBeVisible();
    expect(await marianaCard!.isStillChoosing()).toBe(true);
  });

  test('1.2 [Positive] Consolidated pre-order correctly aggregates items across participants', async ({
    groupOrderPage,
    apiClient,
    seededSnapshot,
  }) => {
    await apiClient.seedGroupOrder(seededSnapshot);
    await groupOrderPage.goto(seededSnapshot.reservationId);
    await groupOrderPage.waitForLoaded();

    // Consolidated section must be displayed
    await expect(groupOrderPage.consolidatedSection).toBeVisible();

    const items = await groupOrderPage.getConsolidatedItems();
    expect(items.length).toBeGreaterThan(0);

    // Spring Salad: 1 from Owner + 2 from Kateryna = 3 total
    const springSaladItem = items.find((i) => i.nameAndQty.includes(SAMPLE_DISHES.SPRING_SALAD.name));
    expect(springSaladItem).toBeDefined();
    expect(springSaladItem!.nameAndQty).toContain('× 3');
    expect(springSaladItem!.price).toBe('$36.00');

    // Grand total verification: Only submitted carts are consolidated ($26.50 + $24.00 = $50.50)
    // (Unsubmitted carts are excluded, as stated in the unsubmitted banner)
    const grandTotal = await groupOrderPage.getGrandTotal();
    expect(grandTotal).toBe('$50.50');
  });

  test('1.3 [Positive] Dynamic date (now + N) and metadata interval are rendered accurately', async ({
    groupOrderPage,
    apiClient,
    seededSnapshot,
  }) => {
    await apiClient.seedGroupOrder(seededSnapshot);
    await groupOrderPage.goto(seededSnapshot.reservationId);
    await groupOrderPage.waitForLoaded();

    // Check address
    await expect(groupOrderPage.locationMeta).toContainText('Rustaveli Avenue 48');

    // Check guest count metadata (e.g. 4 of 5 guests)
    await expect(groupOrderPage.guestCountMeta).toContainText('4 of 5 guests');

    // Check unsubmitted banner (2 guests haven't submitted yet)
    await expect(groupOrderPage.unsubmittedBanner).toBeVisible();
    await expect(groupOrderPage.unsubmittedBanner).toContainText("haven't submitted their cart yet");
  });

  test('1.4 [Negative] Empty pre-order state disables submit and renders empty notice', async ({
    groupOrderPage,
    apiClient,
  }) => {
    const emptySnapshot = buildEmptyGroupOrder();
    await apiClient.seedGroupOrder(emptySnapshot);

    await groupOrderPage.goto(emptySnapshot.reservationId);
    await groupOrderPage.waitForLoaded();

    // Empty notice is visible
    await expect(groupOrderPage.emptyDishesNotice).toBeVisible();
    await expect(groupOrderPage.emptyDishesNotice).toContainText("Participants haven't added any dishes yet");

    // Consolidated section is hidden
    await expect(groupOrderPage.consolidatedSection).not.toBeVisible();

    // Submit button is disabled
    await expect(groupOrderPage.submitPreOrderButton).toBeDisabled();
    expect(await groupOrderPage.getGrandTotal()).toBe('$0.00');
  });

  test('1.5 [Negative] Navigating to non-existent reservation shows 404 error state', async ({
    groupOrderPage,
    apiClient,
  }) => {
    const invalidId = 'non-existent-reservation-999';
    await apiClient.mockReservationNotFound(invalidId);

    await groupOrderPage.goto(invalidId);
    await groupOrderPage.waitForLoaded();

    await expect(groupOrderPage.errorMessage).toBeVisible();
    await expect(groupOrderPage.errorMessage).toHaveText('Group reservation not found');
  });

  test('1.6 [Negative] Server failure (500) displays error state with Try Again option', async ({
    groupOrderPage,
    apiClient,
    seededSnapshot,
  }) => {
    // Mock 500 error on sessions API
    await apiClient.seedGroupOrder(seededSnapshot);
    await apiClient.mockServerError(seededSnapshot.groupId);

    await groupOrderPage.goto(seededSnapshot.reservationId);
    await groupOrderPage.waitForLoaded();

    await expect(groupOrderPage.errorMessage).toBeVisible();
    await expect(groupOrderPage.errorMessage).toHaveText('Failed to load group pre-order.');
    await expect(groupOrderPage.tryAgainButton).toBeVisible();
  });
});
