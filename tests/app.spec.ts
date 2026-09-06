import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

async function openDemo(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/demo');
  await expect(page).toHaveTitle('Demo — Review Backlog Restart');
  await expect(page.locator('.demo-banner')).toContainText('sample data');
  await expect(page.locator('.plan-card')).toHaveCount(3);
}

test('builds, saves, exports, and opens the isolated demo plan offline', async ({ page, context }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await openDemo(page);
  await page.locator('input[name="dailyMinutes"]').fill('15');
  await page.getByRole('button', { name: /Recalculate plans/ }).click();
  await page.locator('input[value="protect"]').check();
  await expect(page.locator('.routes-section')).toHaveAttribute('aria-busy', 'false');
  const exportButton = page.getByRole('button', { name: /Export tagged action list/ });
  await expect(exportButton).toBeEnabled();
  const download = page.waitForEvent('download');
  await exportButton.click();
  await expect((await download).suggestedFilename()).toMatch(/^backlog-action-list-.*\.csv$/);

  await page.reload();
  await expect(page.locator('.plan-card.selected .plan-name')).toHaveText('Protect memory');
  await expect(page.locator('input[name="dailyMinutes"]')).toHaveValue('15');
  expect(consoleErrors).toEqual([]);

  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('h1')).toHaveText('Plan an overdue review backlog');
  await expect(page.locator('.offline-pill')).toContainText('Offline');
});

test('installs offline support when Azure deployment-only files are unavailable', async ({ browser }) => {
  const context = await browser.newContext();
  await context.route('**/staticwebapp.config.json', (route) => route.fulfill({ status: 404, body: 'Not found' }));
  const page = await context.newPage();
  await page.goto('/demo');
  await expect.poll(() => page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration('/');
    return Boolean(registration?.active && navigator.serviceWorker.controller);
  })).toBe(true);
  await context.close();
});

test('production worker precache excludes static-host configuration', async ({ request }) => {
  const response = await request.get('/sw.js');
  expect(response.ok()).toBe(true);
  const worker = await response.text();
  expect(worker).not.toContain('staticwebapp.config.json');
  expect(worker).not.toContain("'/_headers'");
});

test('uses singular workload copy for a one-card daily route', async ({ page }) => {
  await openDemo(page);
  await page.locator('input[name="dailyMinutes"]').fill('5');
  await page.locator('input[name="secondsPerCard"]').fill('180');
  await page.getByRole('button', { name: /Recalculate plans/ }).click();
  await expect(page.locator('.plan-load').first()).toContainText('1 card / day');
});

test('persists a newly selected route before allowing its immediate export', async ({ page }) => {
  await openDemo(page);
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
  await openDemo(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  const newerWorker = readFileSync(new URL('../dist/sw.js', import.meta.url), 'utf8').replace(/const VERSION = '([^']+)'/, "const VERSION = '$1-update'");
  await page.route('**/sw.js?update-test', (route) => route.fulfill({ contentType: 'application/javascript', body: newerWorker }));
  await page.evaluate(async () => { await navigator.serviceWorker.register('/sw.js?update-test', { scope: '/' }); });
  await expect(page.locator('.toast.update')).toContainText('An app update is ready.');
});

test('shows a plain recovery message for invalid JSON backups', async ({ page }) => {
  await openDemo(page);
  await page.locator('#restore-file').setInputFiles({ name: 'bad-backup.json', mimeType: 'application/json', buffer: Buffer.from('{bad') });
  await expect(page.locator('.toast.error')).toContainText('not a valid Backlog Restart backup');
  await expect(page.locator('.toast.error')).toContainText('Choose a JSON backup exported from this app');
  await expect(page.locator('.toast.error')).not.toContainText('Expected property');
});
