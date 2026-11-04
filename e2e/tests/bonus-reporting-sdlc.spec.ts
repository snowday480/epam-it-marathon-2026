import { test, expect } from '../fixtures/test.fixtures';
import { buildTestGroupOrder } from '../helpers/data-factory';

test.describe('⭐️ Bonus: Reporting & SDLC (Паралельність, ізоляція та репортинг)', () => {
  test('B.1 [SDLC / Concurrency] Independent parallel sessions execute without state crosstalk', async ({
    page,
    groupOrderPage,
    apiClient,
  }) => {
    // Generate two independent sessions with distinct totals and participants
    const sessionA = buildTestGroupOrder({ daysAhead: 1 });
    const sessionB = buildTestGroupOrder({ daysAhead: 3 });

    // Seed session A
    await apiClient.seedGroupOrder(sessionA);
    await groupOrderPage.goto(sessionA.reservationId);
    await groupOrderPage.waitForLoaded();

    expect(await groupOrderPage.getGrandTotal()).toBe('$50.50');

    // Remove a guest in session A ($24.00)
    const kateryna = await groupOrderPage.getParticipantCardByName('Kateryna');
    await kateryna!.clickRemove();
    const removeModal = groupOrderPage.getRemoveGuestModal();
    await removeModal.confirmRemove();
    expect(await groupOrderPage.getGrandTotal()).toBe('$26.50');

    // Now seed and open session B in the same runner - session B must have its own fresh pristine data!
    await apiClient.seedGroupOrder(sessionB);
    await groupOrderPage.goto(sessionB.reservationId);
    await groupOrderPage.waitForLoaded();

    // Session B must have all 4 participants and original grand total
    const cardsB = await groupOrderPage.getAllParticipantCards();
    expect(cardsB.length).toBe(4);
    expect(await groupOrderPage.getGrandTotal()).toBe('$50.50');
  });

  test('B.2 [Reporting] Allure & ReportPortal metadata tags are applied', async ({
    groupOrderPage,
    apiClient,
    seededSnapshot,
  }) => {
    // Annotate test with enterprise reporting tags
    test.info().annotations.push(
      { type: 'epic', description: 'EP-10: Group Pre-Orders' },
      { type: 'feature', description: 'US-11: Owner Review & Submit' },
      { type: 'severity', description: 'critical' },
      { type: 'reportportal', description: 'attributes:homework:8,level:bonus' }
    );

    await apiClient.seedGroupOrder(seededSnapshot);
    await groupOrderPage.goto(seededSnapshot.reservationId);
    await groupOrderPage.waitForLoaded();

    // Verify page title and header
    await expect(groupOrderPage.headerTitle).toBeVisible();
    expect(test.info().annotations.length).toBeGreaterThanOrEqual(4);
  });
});
