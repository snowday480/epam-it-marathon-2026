import { Locator } from '@playwright/test';

/**
 * Component Object for an individual Participant Card on the Owner screen.
 * Encapsulates card elements: name, role badge, items, subtotal, and remove button.
 */
export class ParticipantCardComponent {
  readonly root: Locator;
  readonly title: Locator;
  readonly statusChip: Locator;
  readonly removeButton: Locator;
  readonly itemsList: Locator;
  readonly emptyNotice: Locator;
  readonly subtotalText: Locator;

  constructor(root: Locator) {
    this.root = root;
    this.title = root.locator('h2.title');
    this.statusChip = root.locator('span.chip');
    this.removeButton = root.locator('button.remove-guest-btn');
    this.itemsList = root.locator('ul.items');
    this.emptyNotice = root.locator('p.empty');
    this.subtotalText = root.locator('p.subtotal span:last-child');
  }

  async getName(): Promise<string> {
    return (await this.title.textContent())?.trim() ?? '';
  }

  async isSubmitted(): Promise<boolean> {
    const text = await this.statusChip.textContent();
    return text?.includes('Submitted') ?? false;
  }

  async isStillChoosing(): Promise<boolean> {
    const text = await this.statusChip.textContent();
    return text?.includes('Still choosing') ?? false;
  }

  async canRemove(): Promise<boolean> {
    return await this.removeButton.isVisible();
  }

  async clickRemove(): Promise<void> {
    await this.removeButton.click();
  }

  async getSubtotal(): Promise<string> {
    return (await this.subtotalText.textContent())?.trim() ?? '$0.00';
  }

  async getItemRows(): Promise<Array<{ name: string; quantity: string; price: string }>> {
    const rows = this.itemsList.locator('li.item');
    const count = await rows.count();
    const result: Array<{ name: string; quantity: string; price: string }> = [];

    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const name = (await row.locator('.name').textContent())?.trim() ?? '';
      const quantity = (await row.locator('.qty').textContent())?.trim() ?? '';
      const price = (await row.locator('.price').textContent())?.trim() ?? '';
      result.push({ name, quantity, price });
    }

    return result;
  }
}
