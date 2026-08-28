import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const axeSource = readFileSync(new URL('../node_modules/axe-core/axe.min.js', import.meta.url), 'utf8');

async function expectNoAxeViolations(page: import('@playwright/test').Page): Promise<void> {
  await page.addScriptTag({ content: axeSource });
  const violations = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (node: Document, options: object) => Promise<{ violations: unknown[] }> } }).axe;
    return (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations;
  });
  expect(violations).toEqual([]);
}

test('desktop pages retain semantic, accessible planner states', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Review Backlog Restart/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveCount(1);
  await expectNoAxeViolations(page);

  await page.getByRole('button', { name: /Try the sample deck/ }).click();
  await expect(page.locator('.plan-card')).toHaveCount(3);
  await expectNoAxeViolations(page);

  for (const path of ['/privacy/', '/terms/']) {
    await page.goto(path);
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveCount(1);
    await expectNoAxeViolations(page);
  }
});

test('390px keyboard journey has no horizontal overflow and saves a route', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const page = await context.newPage();
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth && document.body.scrollWidth <= window.innerWidth)).toBe(true);

  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main$/);

  await page.getByRole('button', { name: /Try the sample deck/ }).click();
  const protect = page.locator('input[value="protect"]');
  await protect.focus();
  await page.keyboard.press('Space');
  await expect(page.locator('.plan-card.selected .plan-name')).toHaveText('Protect memory');
  await expect(page.getByRole('button', { name: /Export tagged action list/ })).toBeEnabled();
  await expectNoAxeViolations(page);
  await context.close();
});
