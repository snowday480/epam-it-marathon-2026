import { Locator } from '@playwright/test';

/**
 * Component Object for the "Submit Pre-Order" modal dialog.
 */
export class SubmitModalComponent {
  readonly root: Locator;
  readonly title: Locator;
  readonly message: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;
  readonly closeIconButton: Locator;

  constructor(locator: Locator) {
    this.root = locator;
    this.title = locator.locator('h2.modal-title');
    this.message = locator.locator('.modal-body p');
    this.submitButton = locator.locator('button.button--primary');
    this.cancelButton = locator.locator('button.button--secondary');
    this.closeIconButton = locator.locator('button.modal-close');
  }

  async isVisible(): Promise<boolean> {
    return await this.root.isVisible();
  }

  async confirmSubmit(): Promise<void> {
    await this.submitButton.click();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }

  async close(): Promise<void> {
    await this.closeIconButton.click();
  }
}
