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

test('routes have semantic structure, plain titles, and accessible states', async ({ page }) => {
  for (const [path, title] of [['/', /plan an overdue review backlog/], ['/demo', /^Demo — Review Backlog Restart$/], ['/privacy/', /^Privacy — Review Backlog Restart$/], ['/terms/', /^Terms — Review Backlog Restart$/], ['/404.html', /^Page not found — Review Backlog Restart$/]] as const) {
    await page.goto(path);
    await expect(page).toHaveTitle(title);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveCount(1);
    await expectNoAxeViolations(page);
  }
});

test('landing metadata includes a canonical social preview and demo entry', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://review-backlog-restart.sociobot.in/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /review-backlog-restart-social\.jpg$/);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
  await page.getByRole('button', { name: /Try it with sample data/ }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.locator('.demo-banner')).toContainText('nothing is saved');
  await expect(page.locator('.stats')).toContainText('120');
});

test('390px keyboard journey has no horizontal overflow and 44px controls', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const page = await context.newPage();
  await page.goto('/demo');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth && document.body.scrollWidth <= window.innerWidth)).toBe(true);
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
  await page.locator('input[value="protect"]').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('.plan-card.selected .plan-name')).toHaveText('Protect memory');
  const tooSmall = await page.locator('button:visible, a:visible, summary:visible').evaluateAll((elements) => elements
    .filter((element) => {
      const box = element.getBoundingClientRect();
      return box.width < 44 || box.height < 44;
    })
    .map((element) => ({ text: (element.textContent ?? '').trim(), width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height })));
  expect(tooSmall).toEqual([]);
  await expectNoAxeViolations(page);
  await context.close();
});
