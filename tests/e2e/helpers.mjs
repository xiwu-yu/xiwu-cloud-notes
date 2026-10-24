import { test as base, expect } from '@playwright/test';
export { expect };
export const test = base.extend({
  page: async ({ page }, use) => {
    const issues = [];
    page.on('console', message => { if (message.type() === 'error') issues.push(`console: ${message.text()}`); });
    page.on('pageerror', error => issues.push(`pageerror: ${error.message}`));
    page.on('requestfailed', request => issues.push(`requestfailed: ${request.url()} (${request.failure()?.errorText})`));
    page.on('response', response => { if (response.status() >= 400) issues.push(`HTTP ${response.status()}: ${response.url()}`); });
    await use(page);
    expect(issues, '页面不应出现控制台错误或资源加载失败').toEqual([]);
  }
});
export const ids = page => page.locator('.interest-card').evaluateAll(nodes => nodes.map(node => node.dataset.essayId));
export const param = (page, key) => new URL(page.url()).searchParams.get(key);
export async function noOverflow(page, width) {
  expect(await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth))).toBeLessThanOrEqual(width + 1);
}
