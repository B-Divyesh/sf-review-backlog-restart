import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const csvFixture = 'Deck,Front,Back,Due,Interval,Lapses,Reviews,Tags\nLanguage,hello,hello,2025-01-01,7,2,12,review\nScience,atom,basic unit,2025-01-03,14,0,7,study\n';
const tsvFixture = 'Deck\tFront\tBack\tDue\tInterval\tLapses\tReviews\tTags\nLanguage\tbonjour\thello\t2025-01-02\t6\t1\t10\treview\n';

async function openDemo(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/demo');
  await expect(page).toHaveTitle('Demo — Review Backlog Restart');
  await expect(page.locator('.demo-banner')).toContainText('sample data');
  await expect(page.locator('.stats')).toContainText('120');
}

function today(): string { return new Date().toISOString().slice(0, 10); }

test('@claim:csv-tsv-import imports supported CSV and TSV card exports', async ({ page }) => {
  await openDemo(page);
  await page.locator('#replace-file').setInputFiles({ name: 'cards.csv', mimeType: 'text/csv', buffer: Buffer.from(csvFixture) });
  await expect(page.locator('.saved-banner')).toContainText('cards.csv');
  await expect(page.locator('.stats')).toContainText('2');
  await page.locator('#replace-file').setInputFiles({ name: 'cards.tsv', mimeType: 'text/tab-separated-values', buffer: Buffer.from(tsvFixture) });
  await expect(page.locator('.saved-banner')).toContainText('cards.tsv');
  await expect(page.locator('.stats')).toContainText('1');
});

test('@claim:three-recovery-plans shows three recovery plans for the sample backlog', async ({ page }) => {
  await openDemo(page);
  await expect(page.locator('.plan-card')).toHaveCount(3);
  await expect(page.getByRole('radio', { name: /Protect memory/ })).toBeVisible();
  await expect(page.getByRole('radio', { name: /Steady return/ })).toBeVisible();
  await expect(page.getByRole('radio', { name: /Clear by date/ })).toBeVisible();
});

test('@claim:time-box respects the daily time box and marks an impossible target', async ({ page }) => {
  await openDemo(page);
  await page.locator('input[name="dailyMinutes"]').fill('5');
  await page.locator('input[name="secondsPerCard"]').fill('30');
  await page.locator('input[name="deadline"]').fill(today());
  await page.getByRole('button', { name: /Recalculate plans/ }).click();
  const loads = await page.locator('.plan-load').allTextContents();
  for (const load of loads) {
    const match = load.match(/(\d+) cards? \/ day\s*≈ (\d+) min/);
    expect(match).not.toBeNull();
    expect(Number(match?.[1])).toBeLessThanOrEqual(10);
    expect(Number(match?.[2])).toBeLessThanOrEqual(5);
  }
  await expect(page.locator('.plan-card[data-kind="clear"] .status.caution')).toContainText('10 of 120 by date');
});

test('@claim:risk-flags labels high-risk cards and gives visible reasons', async ({ page }) => {
  await openDemo(page);
  await expect(page.locator('tbody')).toContainText('high');
  await expect(page.locator('tbody')).toContainText(/days overdue|past lapses|young interval/);
  await page.getByRole('button', { name: /Read how risk is scored/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Lateness contributes');
});

test('@claim:csv-export downloads one tagged action-list row for every sample card', async ({ page }) => {
  await openDemo(page);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /Export tagged action list/ }).click();
  const text = (await readFile(await (await download).path(), 'utf8')).replace(/^\uFEFF/, '');
  const lines = text.trim().split('\n');
  expect(lines[0]).toContain('Suggested tags');
  expect(lines).toHaveLength(121);
  expect(lines[1]).toContain('rbr::day-01');
  expect(lines[1]).toContain('rbr::risk-');
});

test('@claim:read-only-import keeps original scheduling fields in the exported action list', async ({ page }) => {
  await openDemo(page);
  await page.locator('#replace-file').setInputFiles({ name: 'original-fields.csv', mimeType: 'text/csv', buffer: Buffer.from(csvFixture) });
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /Export tagged action list/ }).click();
  const text = (await readFile(await (await download).path(), 'utf8')).replace(/^\uFEFF/, '');
  expect(text).toContain('Original due,Interval');
  expect(text).toContain('2025-01-01,7');
  expect(text).toContain('2025-01-03,14');
});

test('@claim:local-only keeps demo planning requests on the product origin', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await openDemo(page);
  await page.locator('input[value="protect"]').check();
  await expect(page.locator('.plan-card.selected .plan-name')).toHaveText('Protect memory');
  expect(requests.filter((url) => url.startsWith('http'))).toEqual(expect.arrayContaining([expect.stringMatching(/^http:\/\/127\.0\.0\.1:4173\//)]));
  expect(requests.filter((url) => url.startsWith('http')).every((url) => new URL(url).origin === 'http://127.0.0.1:4173')).toBe(true);
});

test('@claim:no-tracking uses no cookies or third-party requests during the demo', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await openDemo(page);
  await page.getByRole('button', { name: /Export tagged action list/ }).click();
  expect(await context.cookies()).toEqual([]);
  expect(requests.filter((url) => url.startsWith('http')).every((url) => new URL(url).origin === 'http://127.0.0.1:4173')).toBe(true);
  await context.close();
});

test('@claim:plan-persistence keeps settings and a chosen plan after reload', async ({ page }) => {
  await openDemo(page);
  await page.locator('input[name="dailyMinutes"]').fill('15');
  await page.getByRole('button', { name: /Recalculate plans/ }).click();
  await page.locator('input[value="protect"]').check();
  await expect(page.locator('.routes-section')).toHaveAttribute('aria-busy', 'false');
  await page.reload();
  await expect(page.locator('input[name="dailyMinutes"]')).toHaveValue('15');
  await expect(page.locator('.plan-card.selected .plan-name')).toHaveText('Protect memory');
});

test('@claim:json-backup restores an exported JSON plan', async ({ page }) => {
  await openDemo(page);
  await page.locator('input[value="protect"]').check();
  await expect(page.locator('.routes-section')).toHaveAttribute('aria-busy', 'false');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /Export JSON backup/ }).click();
  const backup = await (await download).path();
  await page.getByRole('button', { name: 'Reset demo' }).first().click();
  await expect(page.locator('.plan-card.selected .plan-name')).toHaveText('Steady return');
  await page.locator('#restore-file').setInputFiles(backup);
  await expect(page.locator('.plan-card.selected .plan-name')).toHaveText('Protect memory');
});

test('@claim:delete-plan removes a real local plan after confirmation', async ({ page }) => {
  await openDemo(page);
  await page.getByRole('button', { name: 'Start for real' }).first().click();
  await expect(page).toHaveURL(/\/$/);
  await page.locator('#card-file').setInputFiles({ name: 'real-plan.csv', mimeType: 'text/csv', buffer: Buffer.from(csvFixture) });
  await expect(page.locator('.saved-banner')).toContainText('real-plan.csv');
  await page.getByRole('button', { name: 'Start over' }).click();
  await page.getByRole('button', { name: 'Delete local plan' }).click();
  await expect(page.getByRole('heading', { name: 'Import an Anki CSV or TSV' })).toBeVisible();
});

test('@claim:offline-reload works offline after the first demo visit', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await openDemo(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('.plan-card')).toHaveCount(3);
  await expect(page.locator('.offline-pill')).toContainText('Offline');
  await context.close();
});

test('@claim:free-core creates a sample plan without an account or payment', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await openDemo(page);
  await expect(page.locator('.plan-card')).toHaveCount(3);
  await expect(page.locator('input[type="password"], [data-checkout], form[action*="checkout"]')).toHaveCount(0);
  expect(await context.cookies()).toEqual([]);
  await context.close();
});

test('@claim:update-notice shows a usable update notice for a newer service worker', async ({ page }) => {
  await openDemo(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  const newerWorker = readFileSync(new URL('../dist/sw.js', import.meta.url), 'utf8').replace(/const VERSION = '([^']+)'/, "const VERSION = '$1-update'");
  await page.route('**/sw.js?claim-update', (route) => route.fulfill({ contentType: 'application/javascript', body: newerWorker }));
  await page.evaluate(async () => { await navigator.serviceWorker.register('/sw.js?claim-update', { scope: '/' }); });
  await expect(page.locator('.toast.update')).toContainText('An app update is ready.');
  await expect(page.locator('.toast.update button')).toHaveText('Update now');
});

test('@claim:demo-isolation keeps a real saved plan when the sample opens and closes', async ({ page }) => {
  await page.goto('/');
  await page.locator('#card-file').setInputFiles({ name: 'real-plan.csv', mimeType: 'text/csv', buffer: Buffer.from(csvFixture) });
  await expect(page.locator('.saved-banner')).toContainText('real-plan.csv');
  await page.getByRole('link', { name: 'Try sample' }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.locator('.saved-banner')).toContainText('120 cards');
  await page.getByRole('button', { name: 'Start for real' }).first().click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('.saved-banner')).toContainText('real-plan.csv');
  await expect(page.locator('.stats')).toContainText('2');
});

test('@claim:demo-reset returns the sample to its default plan and settings', async ({ page }) => {
  await openDemo(page);
  await page.locator('input[name="dailyMinutes"]').fill('15');
  await page.getByRole('button', { name: /Recalculate plans/ }).click();
  await page.locator('input[value="protect"]').check();
  await expect(page.locator('.plan-card.selected .plan-name')).toHaveText('Protect memory');
  await page.getByRole('button', { name: 'Reset demo' }).first().click();
  await expect(page.locator('input[name="dailyMinutes"]')).toHaveValue('25');
  await expect(page.locator('.plan-card.selected .plan-name')).toHaveText('Steady return');
  await expect(page.locator('.stats')).toContainText('120');
});
