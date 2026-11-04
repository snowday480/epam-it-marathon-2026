import { Locator } from '@playwright/test';

/**
 * Component Object for the "Remove Guest" confirmation modal dialog.
 */
export class RemoveGuestModalComponent {
  readonly root: Locator;
  readonly title: Locator;
  readonly message: Locator;
  readonly removeButton: Locator;
  readonly cancelButton: Locator;
  readonly closeIconButton: Locator;

  constructor(locator: Locator) {
    this.root = locator;
    this.title = locator.locator('h2.modal-title');
    this.message = locator.locator('.modal-body p');
    this.removeButton = locator.locator('button.button--danger');
    this.cancelButton = locator.locator('button.button--secondary');
    this.closeIconButton = locator.locator('button.modal-close');
  }

  async isVisible(): Promise<boolean> {
    return await this.root.isVisible();
  }

  async getGuestNameInMessage(): Promise<string> {
    const strong = this.message.locator('strong');
    return (await strong.textContent())?.trim() ?? '';
  }

  async confirmRemove(): Promise<void> {
    await this.removeButton.click();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }

  async close(): Promise<void> {
    await this.closeIconButton.click();
  }
}
