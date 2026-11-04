import { Page, Locator } from '@playwright/test';
import { ParticipantCardComponent } from './components/participant-card.component';
import { SubmitModalComponent } from './components/submit-modal.component';
import { RemoveGuestModalComponent } from './components/remove-guest-modal.component';

/**
 * Page Object for the Owner's Group Pre-Order Screen.
 * Demonstrates Onion Architecture & Semantic Locators (Slide 40 & 49).
 */
export class GroupOrderPage {
  readonly page: Page;

  // State indicators
  readonly loadingIndicator: Locator;
  readonly errorMessage: Locator;
  readonly tryAgainButton: Locator;

  // Header
  readonly headerTitle: Locator;
  readonly statusBadge: Locator;
  readonly metaItems: Locator;
  readonly locationMeta: Locator;
  readonly dateMeta: Locator;
  readonly timeMeta: Locator;
  readonly guestCountMeta: Locator;
  readonly syncStatus: Locator;
  readonly refreshButton: Locator;

  // Body notifications
  readonly unsubmittedBanner: Locator;
  readonly emptyDishesNotice: Locator;

  // Participants
  readonly participantsList: Locator;
  readonly participantCardsLocator: Locator;

  // Consolidated section
  readonly consolidatedSection: Locator;
  readonly consolidatedItemsLocator: Locator;

  // Footer & Actions
  readonly grandTotalLabel: Locator;
  readonly grandTotalAmount: Locator;
  readonly submitPreOrderButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.loadingIndicator = page.locator('.loading-state');
    this.errorMessage = page.locator('.error-message');
    this.tryAgainButton = page.locator('button.try-again-btn');

    this.headerTitle = page.locator('h1.header__title');
    this.statusBadge = page.locator('.status-badge');
    this.metaItems = page.locator('.header__meta .meta-item');
    this.locationMeta = this.metaItems.nth(0);
    this.dateMeta = this.metaItems.nth(1);
    this.timeMeta = this.metaItems.nth(2);
    this.guestCountMeta = this.metaItems.nth(3);

    this.syncStatus = page.locator('.sync-status');
    this.refreshButton = page.locator('button.refresh-btn');

    this.unsubmittedBanner = page.locator('.unsubmitted-banner');
    this.emptyDishesNotice = page.locator('.empty-dishes-notice');

    this.participantsList = page.locator('ul.participants-list');
    this.participantCardsLocator = page.locator('app-participant-card');

    this.consolidatedSection = page.locator('.consolidated-section');
    this.consolidatedItemsLocator = page.locator('li.consolidated-item');

    this.grandTotalLabel = page.locator('.grand-total__label');
    this.grandTotalAmount = page.locator('.grand-total__amount');
    this.submitPreOrderButton = page.locator('button.submit-btn');
  }

  /**
   * Navigates to the group pre-order page for a specific reservation.
   * Injects authenticated customer session into localStorage to satisfy AuthGuard (Slide 44).
   */
  async goto(reservationId: string, options: { demo?: boolean } = { demo: true }): Promise<void> {
    await this.page.addInitScript(() => {
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        iss: 'green-and-tasty-demo',
        sub: 'demo-owner',
        email: 'owner@demo.test',
        given_name: 'Yevhenii',
        family_name: 'Demo',
        'cognito:groups': ['Customer'],
        iat: now,
        exp: now + 30 * 24 * 60 * 60,
      };
      const b64 = (val: any) => btoa(JSON.stringify(val)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
      const token = `${b64({ alg: 'none', typ: 'JWT' })}.${b64(payload)}.demo`;
      localStorage.setItem('auth', JSON.stringify({ idToken: token, accessToken: token }));
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: 'demo-owner',
          firstName: 'Yevhenii',
          lastName: 'Demo',
          email: 'owner@demo.test',
          role: 'Customer',
        })
      );
    });

    const query = options.demo ? '?demo' : '';
    await this.page.goto(`/reservations/${reservationId}/group-order${query}`);
  }

  async waitForLoaded(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    await this.loadingIndicator.waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});
    await Promise.race([
      this.headerTitle.waitFor({ state: 'visible', timeout: 10000 }),
      this.errorMessage.waitFor({ state: 'visible', timeout: 10000 }),
    ]).catch(() => {});

    if (await this.headerTitle.isVisible()) {
      await Promise.race([
        this.participantCardsLocator.first().waitFor({ state: 'visible', timeout: 7000 }),
        this.emptyDishesNotice.waitFor({ state: 'visible', timeout: 7000 }),
      ]).catch(() => {});
    }
  }

  async getStatusBadgeText(): Promise<string> {
    return (await this.statusBadge.textContent())?.trim() ?? '';
  }

  async getGrandTotal(): Promise<string> {
    return (await this.grandTotalAmount.textContent())?.trim() ?? '';
  }

  async getGuestCountText(): Promise<string> {
    return (await this.guestCountMeta.textContent())?.trim() ?? '';
  }

  async getAllParticipantCards(): Promise<ParticipantCardComponent[]> {
    await this.participantCardsLocator.first().waitFor({ state: 'visible', timeout: 7000 }).catch(() => {});
    const count = await this.participantCardsLocator.count();
    const result: ParticipantCardComponent[] = [];
    for (let i = 0; i < count; i++) {
      result.push(new ParticipantCardComponent(this.participantCardsLocator.nth(i)));
    }
    return result;
  }

  async getOwnerCard(): Promise<ParticipantCardComponent | null> {
    const cards = await this.getAllParticipantCards();
    for (const card of cards) {
      const cardName = await card.getName();
      if (cardName.includes('My Pre-Order') || cardName.includes('Owner')) {
        return card;
      }
    }
    return null;
  }

  async getParticipantCardByName(name: string): Promise<ParticipantCardComponent | null> {
    if (name.toLowerCase() === 'owner' || name.toLowerCase().includes('my pre-order')) {
      return this.getOwnerCard();
    }
    const cards = await this.getAllParticipantCards();
    for (const card of cards) {
      const cardName = await card.getName();
      if (cardName.toLowerCase().includes(name.toLowerCase())) {
        return card;
      }
    }
    return null;
  }

  async getConsolidatedItems(): Promise<Array<{ nameAndQty: string; price: string }>> {
    const count = await this.consolidatedItemsLocator.count();
    const result: Array<{ nameAndQty: string; price: string }> = [];

    for (let i = 0; i < count; i++) {
      const item = this.consolidatedItemsLocator.nth(i);
      const nameAndQty = (await item.locator('.consolidated-item__name').textContent())?.trim() ?? '';
      const price = (await item.locator('.consolidated-item__price').textContent())?.trim() ?? '';
      result.push({ nameAndQty, price });
    }

    return result;
  }

  async clickSubmitPreOrder(): Promise<SubmitModalComponent> {
    await this.submitPreOrderButton.click();
    const modal = this.getSubmitModal();
    await modal.root.waitFor({ state: 'visible', timeout: 5000 });
    return modal;
  }

  getSubmitModal(): SubmitModalComponent {
    return new SubmitModalComponent(
      this.page.locator('.modal-backdrop').filter({ hasText: 'Submit Pre-Order' })
    );
  }

  getRemoveGuestModal(): RemoveGuestModalComponent {
    return new RemoveGuestModalComponent(
      this.page.locator('.modal-backdrop').filter({ hasText: 'Remove Guest' })
    );
  }
}
