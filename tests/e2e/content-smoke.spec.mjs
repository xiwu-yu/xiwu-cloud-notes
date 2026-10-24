import { readFile } from 'node:fs/promises';
import { test, expect, noOverflow } from './helpers.mjs';
// 真实内容的篇数和标题来自本轮构建；不锁定某几篇文章或固定顺序。
import { runInNewContext } from 'node:vm';
const context = { window: {} };
runInNewContext(await readFile(new URL('../../dist/profile.js', import.meta.url), 'utf8'), context);
const profile = context.window.siteProfile;

test('real content loads in all languages and themes; every article is readable', async ({ page }) => {
  for (const lang of profile.locales) {
    const posts = profile.localized[lang].interests;
    await page.goto(`./?lang=${lang}`);
    await expect(page.locator('.interest-card')).toHaveCount(posts.length);
    for (const theme of ['light', 'dark']) {
      if (await page.locator('html').getAttribute('data-theme') !== theme) await page.locator('.theme-toggle').click();
      await noOverflow(page, 1440);
      for (const post of posts) {
        await page.locator(`[data-essay-id="${post.id}"] .card-button`).click();
        await expect(page.locator('#dialog-title')).toHaveText(post.title);
        await expect(page.locator('#dialog-body')).toContainText(post.text.slice(0, 25));
        await expect(page.locator('#dialog-body')).toHaveAttribute('lang', post.lang);
        await page.locator('.dialog-close').click();
      }
    }
  }
});

test('portraits and contact art load at desktop and mobile widths', async ({ page }) => {
  await page.goto('./');
  await page.locator('.about-portraits').scrollIntoViewIfNeeded();
  expect(await page.locator('.about-portraits img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
  await page.locator('#contact').scrollIntoViewIfNeeded();
  await expect(page.locator('.contact-mobile-art')).toBeHidden();
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const lang of profile.locales) {
      await page.selectOption('#language-select', lang);
      for (const theme of ['light', 'dark']) {
        if (await page.locator('html').getAttribute('data-theme') !== theme) await page.locator('.theme-toggle').click();
        await noOverflow(page, width);
      }
    }
    if (width <= 720) {
      await expect(page.locator('.contact-split')).toBeHidden();
      await expect(page.locator('.contact-mobile-art')).toBeVisible();
      const layout = await page.locator('#contact').evaluate(el => ({ bottom: el.querySelector('.contact-mobile-art').getBoundingClientRect().bottom, email: el.querySelector('#email-link').getBoundingClientRect().top }));
      expect(layout.email).toBeGreaterThanOrEqual(layout.bottom);
    }
  }
});
