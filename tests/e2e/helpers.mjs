import { test as base, expect } from '@playwright/test';
export { expect };
// macOS WebKit 默认以 Option+Tab 遍历所有控件，保留浏览器原生键盘策略。
export const tabKey = (browserName, reverse = false) => `${browserName === 'webkit' ? 'Alt+' : ''}${reverse ? 'Shift+' : ''}Tab`;
export async function prepareClipboard(context, browserName) {
  if (browserName === 'chromium') {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    return;
  }
  // WebKit 自动化不提供 clipboard-write 权限。这里只验证宿主写入的分享 URL，
  // 不是系统剪贴板实测；Chromium 仍使用真正的浏览器剪贴板和权限。
  await context.addInitScript(() => {
    let copied = '';
    Object.defineProperty(navigator, 'clipboard', {configurable:true, value:{
      writeText:async text => { copied = text; }, readText:async () => copied
    }});
  });
}
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
