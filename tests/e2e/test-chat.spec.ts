import { test, expect } from '@playwright/test';

test.describe('Test Chat UI', () => {
  test('should load the test chat page', async ({ page }) => {
    await page.goto('/test');

    // Check title or main elements
    await expect(page.locator('h1')).toContainText('Test Chat');

    // Take screenshot
    await page.screenshot({ path: 'sprints/v1/screenshots/test-chat-loaded.png' });
  });

  test('should show student selector', async ({ page }) => {
    await page.goto('/test');

    // Check for student selector
    const selector = page.locator('select');
    await expect(selector).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'sprints/v1/screenshots/student-selector.png' });
  });

  test('should have message input', async ({ page }) => {
    await page.goto('/test');

    // Check for input field
    const input = page.locator('input[placeholder="Type a message..."]');
    await expect(input).toBeVisible();

    // Check for send button
    const sendButton = page.locator('button:has-text("Send")');
    await expect(sendButton).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'sprints/v1/screenshots/message-input.png' });
  });

  test('should toggle debug panel', async ({ page }) => {
    await page.goto('/test');

    // Debug should be visible by default
    await expect(page.locator('text=Debug Panel')).toBeVisible();

    // Click hide debug
    await page.click('button:has-text("Hide Debug")');

    // Debug panel should be hidden
    await expect(page.locator('text=Debug Panel')).not.toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'sprints/v1/screenshots/debug-hidden.png' });

    // Click show debug
    await page.click('button:has-text("Show Debug")');

    // Debug panel should be visible again
    await expect(page.locator('text=Debug Panel')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'sprints/v1/screenshots/debug-shown.png' });
  });
});
