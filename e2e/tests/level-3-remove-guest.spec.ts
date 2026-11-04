import { test, expect } from '../fixtures/test.fixtures';

test.describe('🟣 Level 3: Remove Guest (Видалення учасника та перерахунок)', () => {
  test('3.1 [Positive] Owner removes a guest: guest is removed and Grand Total recalculated', async ({
    groupOrderPage,
    apiClient,
    seededSnapshot,
  }) => {
    await apiClient.seedGroupOrder(seededSnapshot);
    await groupOrderPage.goto(seededSnapshot.reservationId);
    await groupOrderPage.waitForLoaded();

    // Verify initial state: 4 participants, Grand Total of submitted carts = $50.50
    expect((await groupOrderPage.getAllParticipantCards()).length).toBe(4);
    expect(await groupOrderPage.getGrandTotal()).toBe('$50.50');

    // Find Kateryna ($24.00 subtotal)
    const katerynaCard = await groupOrderPage.getParticipantCardByName('Kateryna');
    expect(katerynaCard).not.toBeNull();
    expect(await katerynaCard!.canRemove()).toBe(true);

    // Click remove
    await katerynaCard!.clickRemove();

    // Verify Remove Guest confirmation modal
    const removeModal = groupOrderPage.getRemoveGuestModal();
    await expect(removeModal.root).toBeVisible();
    await expect(removeModal.title).toHaveText('Remove Guest');
    expect(await removeModal.getGuestNameInMessage()).toBe('Kateryna');

    // Confirm removal
    await removeModal.confirmRemove();

    // Modal closes
    await expect(removeModal.root).not.toBeVisible();

    // Verify Kateryna is no longer in the list (3 participants remain)
    const remainingCards = await groupOrderPage.getAllParticipantCards();
    expect(remainingCards.length).toBe(3);
    const removedCheck = await groupOrderPage.getParticipantCardByName('Kateryna');
    expect(removedCheck).toBeNull();

    // Grand total recalculated: $50.50 - $24.00 = $26.50
    await expect(groupOrderPage.grandTotalAmount).toHaveText('$26.50');
  });

  test('3.2 [Positive] Consolidated dishes list updates after guest removal', async ({
    groupOrderPage,
    apiClient,
    seededSnapshot,
  }) => {
    await apiClient.seedGroupOrder(seededSnapshot);
    await groupOrderPage.goto(seededSnapshot.reservationId);
    await groupOrderPage.waitForLoaded();

    // Spring salad was × 3 ($36.00)
    let consolidated = await groupOrderPage.getConsolidatedItems();
    let springSalad = consolidated.find((i) => i.nameAndQty.includes('Spring Salad'));
    expect(springSalad!.nameAndQty).toContain('× 3');

    // Remove Kateryna (who ordered 2 Spring Salads)
    const katerynaCard = await groupOrderPage.getParticipantCardByName('Kateryna');
    await katerynaCard!.clickRemove();
    const removeModal = groupOrderPage.getRemoveGuestModal();
    await removeModal.confirmRemove();

    // Consolidated list should now have Spring Salad × 1 ($12.00) from Owner
    consolidated = await groupOrderPage.getConsolidatedItems();
    springSalad = consolidated.find((i) => i.nameAndQty.includes('Spring Salad'));
    expect(springSalad!.nameAndQty).toContain('× 1');
    expect(springSalad!.price).toBe('$12.00');
  });

  test('3.3 [Positive] Guest counter in header updates after removal', async ({
    groupOrderPage,
    apiClient,
    seededSnapshot,
  }) => {
    await apiClient.seedGroupOrder(seededSnapshot);
    await groupOrderPage.goto(seededSnapshot.reservationId);
    await groupOrderPage.waitForLoaded();

    await expect(groupOrderPage.guestCountMeta).toContainText('4 of 5 guests');

    // Remove Mariana
    const marianaCard = await groupOrderPage.getParticipantCardByName('Mariana');
    await marianaCard!.clickRemove();
    const removeModal = groupOrderPage.getRemoveGuestModal();
    await removeModal.confirmRemove();

    // Count updates to 3 of 5 guests
    await expect(groupOrderPage.guestCountMeta).toContainText('3 of 5 guests');
  });

  test('3.4 [Negative / Boundary] Owner cannot remove themselves (no button on Owner card)', async ({
    groupOrderPage,
    apiClient,
    seededSnapshot,
  }) => {
    await apiClient.seedGroupOrder(seededSnapshot);
    await groupOrderPage.goto(seededSnapshot.reservationId);
    await groupOrderPage.waitForLoaded();

    const ownerCard = await groupOrderPage.getOwnerCard();
    expect(ownerCard).not.toBeNull();

    // Owner card must not have a remove button
    expect(await ownerCard!.canRemove()).toBe(false);
    await expect(ownerCard!.removeButton).toHaveCount(0);
  });

  test('3.5 [Negative] Cancelling removal keeps guest in list and preserves Grand Total', async ({
    groupOrderPage,
    apiClient,
    seededSnapshot,
  }) => {
    await apiClient.seedGroupOrder(seededSnapshot);
    await groupOrderPage.goto(seededSnapshot.reservationId);
    await groupOrderPage.waitForLoaded();

    const initialTotal = await groupOrderPage.getGrandTotal();

    const katerynaCard = await groupOrderPage.getParticipantCardByName('Kateryna');
    await katerynaCard!.clickRemove();

    const removeModal = groupOrderPage.getRemoveGuestModal();
    await expect(removeModal.root).toBeVisible();

    // Click cancel
    await removeModal.cancel();

    // Modal closes
    await expect(removeModal.root).not.toBeVisible();

    // Kateryna is still in list
    const stillHere = await groupOrderPage.getParticipantCardByName('Kateryna');
    expect(stillHere).not.toBeNull();

    // Grand total unchanged
    expect(await groupOrderPage.getGrandTotal()).toBe(initialTotal);
  });

  test('3.6 [Negative / Boundary] Remove buttons are hidden once order is Submitted', async ({
    groupOrderPage,
    apiClient,
    seededSnapshot,
  }) => {
    seededSnapshot.status = 'Submitted';
    await apiClient.seedGroupOrder(seededSnapshot);

    await groupOrderPage.goto(seededSnapshot.reservationId);
    await groupOrderPage.waitForLoaded();

    // When submitted, no participant card should show a remove button
    const cards = await groupOrderPage.getAllParticipantCards();
    for (const card of cards) {
      expect(await card.canRemove()).toBe(false);
    }
  });
});
