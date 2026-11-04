import { Page, Route } from '@playwright/test';
import { GroupOrderSnapshot, Participant } from '../helpers/data-factory';

/**
 * API Client & Network Interceptor for Group Pre-Order tests.
 * Implements "API steps inside UI tests" (Slide 41) for data seeding and cleanup.
 */
export class GroupOrderApiClient {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Seeds an isolated test reservation and sessions via network routing.
   * Ensures test independence, zero database pollution, and instant cleanup.
   */
  async seedGroupOrder(snapshot: GroupOrderSnapshot): Promise<void> {
    const { reservationId, groupId, inviteToken, ownerSessionId, invite } = snapshot;

    // 1. GET /reservations/{reservationId}/invite-token
    await this.page.route(`**/reservations/${reservationId}/invite-token`, async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: inviteToken }),
      });
    });

    // 2. GET /guest/invites/{inviteToken}
    await this.page.route(`**/guest/invites/${inviteToken}`, async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(invite),
      });
    });

    // 3. GET /reservations/{reservationId}/guest-session-id
    await this.page.route(`**/reservations/${reservationId}/guest-session-id`, async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ guestSessionId: ownerSessionId }),
      });
    });

    // 4. GET /guest/groups/{groupId}/status
    await this.page.route(`**/guest/groups/${groupId}/status`, async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          currentParticipants: snapshot.participants.length,
          maxCapacity: invite.MaxGuestCount,
          status: snapshot.status,
        }),
      });
    });

    // 5. GET /guest/groups/{groupId}/sessions
    await this.page.route(`**/guest/groups/${groupId}/sessions`, async (route: Route) => {
      if (route.request().method() === 'GET') {
        const total = snapshot.participants.reduce((acc, p) => acc + p.total, 0);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            participants: snapshot.participants,
            total,
          }),
        });
      } else {
        await route.continue();
      }
    });

    // 6. POST /group-reservations/{groupId}/submit
    await this.page.route(`**/group-reservations/${groupId}/submit`, async (route: Route) => {
      snapshot.status = 'Submitted';
      const submittedDishes = snapshot.participants
        .flatMap((p) => p.items)
        .map((i) => ({ dishId: i.dish.id, quantity: i.quantity }));

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(submittedDishes),
      });
    });

    // 7. DELETE /guest/groups/{groupId}/sessions/{guestSessionId}
    await this.page.route(`**/guest/groups/${groupId}/sessions/*`, async (route: Route) => {
      if (route.request().method() === 'DELETE') {
        const url = route.request().url();
        const guestId = url.substring(url.lastIndexOf('/') + 1);

        snapshot.participants = snapshot.participants.filter((p: Participant) => p.id !== guestId);
        const total = snapshot.participants.reduce((acc, p) => acc + p.total, 0);

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            participants: snapshot.participants,
            total,
          }),
        });
      } else {
        await route.continue();
      }
    });
  }

  /**
   * Simulates a 404 Not Found error on invite retrieval.
   */
  async mockReservationNotFound(reservationId: string): Promise<void> {
    await this.page.route(`**/reservations/${reservationId}/invite-token`, async (route: Route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Reservation not found' }),
      });
    });
  }

  /**
   * Simulates a 500 Internal Server Error on sessions loading.
   */
  async mockServerError(groupId: string): Promise<void> {
    await this.page.route(`**/guest/groups/${groupId}/sessions`, async (route: Route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });
  }

  /**
   * Simulates a server failure on submit action.
   */
  async mockSubmitFailure(groupId: string): Promise<void> {
    await this.page.route(`**/group-reservations/${groupId}/submit`, async (route: Route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Cannot submit to POS system' }),
      });
    });
  }

  /**
   * Cleans up all network intercepts after test completion (Slide 41).
   */
  async cleanup(): Promise<void> {
    await this.page.unrouteAll({ behavior: 'ignoreErrors' });
  }
}
