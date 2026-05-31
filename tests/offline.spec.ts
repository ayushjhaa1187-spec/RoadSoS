import { test, expect } from '@playwright/test';

test.describe('Offline Functionality', () => {
  test('SOS button fallback when offline', async ({ page, context }) => {
    await page.goto('/');

    // 1. Enable Demo Mode (Chennai)
    await page.getByLabel('Toggle Demo Mode (Chennai)').check();
    
    // 2. Go to Offline page and cache data (ensure we are online first)
    await page.getByRole('link', { name: 'Offline' }).click();
    await page.getByRole('button', { name: 'Pre-download this district' }).click();
    await expect(page.getByText(/Cached \d+ POIs/)).toBeVisible();

    // 3. Simulate Offline
    await context.setOffline(true);
    await page.reload();

    // 4. Verify Offline Banner
    await expect(page.getByText('Offline mode — using cached data')).toBeVisible();

    // 5. Go to Home and trigger SOS
    await page.getByRole('link', { name: 'SOS' }).click();
    
    // Intercept deep links (tel: and sms:)
    // In Playwright, deep links usually don't "open" anything that breaks the test,
    // but we can check if the button is interactive and doesn't crash.
    await page.getByRole('button', { name: /SOS Emergency Button/ }).click();
    
    // Check if toast indicates offline fallback
    await expect(page.getByText('Backend unreachable. Used offline cache for SOS payload.')).toBeVisible();
  });
});
