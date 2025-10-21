import { test, expect } from '@playwright/test';

test('register and login', async ({ page }) => {
  await page.goto('/register');
  await page.fill('input[type="text"]', 'E2E User');
  await page.fill('input[type="email"]', 'e2e+user@example.com');
  await page.fill('input[type="password"]', 'E2Epass123!');
  await page.click('button:has-text("Register")');
  await page.waitForURL('/');
  // now sign out then sign in
});
