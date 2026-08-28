import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

test('builds, saves, exports, and opens a recovery plan offline', async ({ page, context }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto('/');
  await expect(page.locator('h1')).toHaveCount(1);
  await page.getByRole('button', { name: /Try the sample deck/ }).click();
  await expect(page.locator('.plan-card')).toHaveCount(3);

  await page.locator('input[name="dailyMinutes"]').fill('15');
  await page.getByRole('button', { name: /Recalculate routes/ }).click();
  await page.locator('input[value="protect"]').check();
  await expect(page.locator('.routes-section')).toHaveAttribute('aria-busy', 'false');
  await expect(page.getByRole('button', { name: /Export tagged action list/ })).toBeEnabled();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /Export tagged action list/ }).click();
  await expect((await download).suggestedFilename()).toMatch(/^backlog-action-list-.*\.csv$/);

  await page.reload();
  await expect(page.locator('.plan-card.selected .plan-name')).toHaveText('Protect memory');
  await expect(page.locator('input[name="dailyMinutes"]')).toHaveValue('15');
  expect(consoleErrors).toEqual([]);

  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('h1')).toContainText('not a moral emergency');
  await expect(page.locator('.offline-pill')).toContainText('Offline');
});

test('persists a newly selected route before allowing its immediate export', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Try the sample deck/ }).click();

  // This is the formerly flaky sequence: a route choice and export with no
  // arbitrary settle delay. The enabled export button is the durable-state
  // boundary, not a timing guess.
  await page.locator('input[value="protect"]').check();
  await expect(page.locator('.plan-card.selected .plan-name')).toHaveText('Protect memory');
  await expect(page.locator('.routes-section')).toHaveAttribute('aria-busy', 'false');
  const exportButton = page.getByRole('button', { name: /Export tagged action list/ });
  await expect(exportButton).toBeEnabled();
  const download = page.waitForEvent('download');
  await exportButton.click();
  await expect((await download).suggestedFilename()).toMatch(/^backlog-action-list-.*\.csv$/);

  await page.reload();
  await expect(page.locator('.plan-card.selected .plan-name')).toHaveText('Protect memory');
});

test('offers an in-app update when a newer service worker is available', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

  const newerWorker = readFileSync(new URL('../dist/sw.js', import.meta.url), 'utf8')
    .replace(/const VERSION = '([^']+)'/, "const VERSION = '$1-update'");
  await page.route('**/sw.js?update-test', (route) => route.fulfill({ contentType: 'application/javascript', body: newerWorker }));
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('/sw.js?update-test', { scope: '/' });
  });
  await expect(page.locator('.toast.update')).toContainText('An updated field guide is ready.');
});
