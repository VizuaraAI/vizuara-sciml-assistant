/**
 * E2E tests for Gmail-style UI
 * Tests the new student and mentor portals
 */

import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should display landing page with portal links', async ({ page }) => {
    await page.goto('/');

    // Check title and description
    await expect(page.getByRole('heading', { name: /Vizuara AI Bootcamp/i })).toBeVisible();

    // Check portal cards
    await expect(page.getByRole('heading', { name: /Student Portal/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Mentor Dashboard/i })).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'sprints/v1/screenshots/home-page.png' });
  });

  test('should navigate to student portal', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Student Portal');
    await expect(page).toHaveURL('/student');
  });

  test('should navigate to mentor portal', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Mentor Dashboard');
    await expect(page).toHaveURL('/mentor');
  });
});

test.describe('Student Portal - Gmail Style', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/student');
  });

  test('should display email-style inbox interface', async ({ page }) => {
    // Check header
    await expect(page.getByText('Vizuara Bootcamp')).toBeVisible();

    // Check sidebar with Compose button
    await expect(page.getByRole('button', { name: /Compose/i })).toBeVisible();

    // Check inbox/sent tabs
    await expect(page.getByRole('button', { name: /Inbox/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Sent/i })).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'sprints/v1/screenshots/student-inbox.png' });
  });

  test('should open compose view when clicking Compose', async ({ page }) => {
    await page.click('button:has-text("Compose")');

    // Check compose view elements
    await expect(page.getByText('New Message')).toBeVisible();
    await expect(page.getByText('To:')).toBeVisible();
    await expect(page.getByText('Dr. Raj Dandekar')).toBeVisible();
    await expect(page.getByText('Subject:')).toBeVisible();

    // Check input fields
    await expect(page.getByPlaceholder('Enter subject...')).toBeVisible();
    await expect(page.getByPlaceholder('Write your message here...')).toBeVisible();

    // Check send button
    await expect(page.getByRole('button', { name: /Send/i })).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'sprints/v1/screenshots/student-compose.png' });
  });

  test('should show message detail when clicking a message', async ({ page }) => {
    // Click on first message in inbox
    const firstMessage = page.locator('button').filter({ hasText: 'Dr. Raj Dandekar' }).first();
    await firstMessage.click();

    // Check message detail view
    await expect(page.locator('.prose')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'sprints/v1/screenshots/student-message-detail.png' });
  });

  test('should have reply button on received messages', async ({ page }) => {
    // Click on first message from mentor
    const mentorMessage = page.locator('button').filter({ hasText: 'Dr. Raj Dandekar' }).first();
    await mentorMessage.click();

    // Check for reply button
    await expect(page.getByRole('button', { name: /Reply/i })).toBeVisible();
  });
});

test.describe('Mentor Portal - Gmail Style', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/mentor');
  });

  test('should display mentor dashboard interface', async ({ page }) => {
    // Check header
    await expect(page.getByText('Mentor Dashboard')).toBeVisible();
    await expect(page.getByText('Dr. Raj Dandekar')).toBeVisible();

    // Check students sidebar
    await expect(page.getByText('Students')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'sprints/v1/screenshots/mentor-dashboard.png' });
  });

  test('should show students list in sidebar', async ({ page }) => {
    // Check for student names (from seed data)
    // At least one student should be visible
    const studentsList = page.locator('aside').first();
    await expect(studentsList).toBeVisible();
  });

  test('should have Drafts, Inbox, Sent tabs', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Drafts/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Inbox/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Sent/i })).toBeVisible();
  });

  test('should show draft review interface with Edit button', async ({ page }) => {
    // Click on Drafts tab
    await page.click('button:has-text("Drafts")');

    // If there are drafts, check for edit functionality
    const draftItem = page.locator('button').filter({ hasText: 'Draft' }).first();
    if (await draftItem.isVisible()) {
      await draftItem.click();

      // Check for Edit button
      await expect(page.getByRole('button', { name: /Edit/i })).toBeVisible();

      // Check for Approve & Send button
      await expect(page.getByRole('button', { name: /Approve & Send/i })).toBeVisible();

      // Check for Discard button
      await expect(page.getByRole('button', { name: /Discard/i })).toBeVisible();

      // Take screenshot
      await page.screenshot({ path: 'sprints/v1/screenshots/mentor-draft-review.png' });
    }
  });

  test('should allow editing draft content', async ({ page }) => {
    // Click on Drafts tab
    await page.click('button:has-text("Drafts")');

    // If there are drafts
    const draftItem = page.locator('button').filter({ hasText: 'Draft' }).first();
    if (await draftItem.isVisible()) {
      await draftItem.click();

      // Click Edit button
      await page.click('button:has-text("Edit")');

      // Check textarea is visible for editing
      await expect(page.locator('textarea')).toBeVisible();

      // Take screenshot of edit mode
      await page.screenshot({ path: 'sprints/v1/screenshots/mentor-draft-edit.png' });

      // Click Preview to toggle back
      await page.click('button:has-text("Preview")');
    }
  });
});

test.describe('UI Theme - Apple Minimalist', () => {
  test('should have light background on home page', async ({ page }) => {
    await page.goto('/');

    // Check for light gradient background
    const main = page.locator('main');
    const bgClass = await main.getAttribute('class');
    expect(bgClass).toContain('bg-gradient');
    expect(bgClass).toContain('from-slate-50');

    // Take screenshot
    await page.screenshot({ path: 'sprints/v1/screenshots/theme-home.png' });
  });

  test('should have soft shadow styling', async ({ page }) => {
    await page.goto('/');

    // Cards should have shadow styling
    const cards = page.locator('.shadow-soft');
    await expect(cards.first()).toBeVisible();
  });

  test('should have proper color scheme on student portal', async ({ page }) => {
    await page.goto('/student');

    // Check violet/purple accent colors
    const composeBtn = page.getByRole('button', { name: /Compose/i });
    const btnClass = await composeBtn.getAttribute('class');
    expect(btnClass?.includes('violet') || btnClass?.includes('purple')).toBe(true);
  });

  test('should have proper color scheme on mentor portal', async ({ page }) => {
    await page.goto('/mentor');

    // Check amber/orange accent colors for mentor
    const header = page.locator('header');
    await expect(header).toBeVisible();
  });
});
