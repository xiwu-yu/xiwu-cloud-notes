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

test('contact artwork is softened and text overlays it with aligned headings on mobile', async ({ page }) => {
  await page.goto('./');
  await page.locator('.about-portraits').scrollIntoViewIfNeeded();
  expect(await page.locator('.about-portraits img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
  await page.locator('#contact').scrollIntoViewIfNeeded();
  await expect(page.locator('.contact-mobile-art')).toBeHidden();
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.locator('#contact').scrollIntoViewIfNeeded();
    for (const lang of profile.locales) {
      await page.selectOption('#language-select', lang);
      for (const theme of ['light', 'dark']) {
        if (await page.locator('html').getAttribute('data-theme') !== theme) await page.locator('.theme-toggle').click();
        await noOverflow(page, width);
        if (width <= 720) {
          await expect(page.locator('.contact-split')).toBeHidden();
          await expect(page.locator('.contact-mobile-art')).toBeVisible();
          const layout = await page.locator('#contact').evaluate(el => {
            const art = el.querySelector('.contact-mobile-art');
            const artBox = art.getBoundingClientRect();
            const overlay = getComputedStyle(el, '::before');
            const texts = ['.eyebrow', 'h2', '#email-link', '.contact-action .text-link'].map(selector => {
              const box = el.querySelector(selector).getBoundingClientRect();
              return {left:box.left, right:box.right, top:box.top, bottom:box.bottom};
            });
            return {
              art:{left:artBox.left,right:artBox.right,top:artBox.top,bottom:artBox.bottom},
              texts,
              headingLeft:el.querySelector('.eyebrow').getBoundingClientRect().left,
              previousLeft:document.querySelector('.boundaries .eyebrow').getBoundingClientRect().left,
              opacity:Number(getComputedStyle(art).opacity),
              overlayDisplay:overlay.display,
              overlayOpacity:Number(overlay.opacity),
              overlayPointerEvents:overlay.pointerEvents,
              artZ:Number(getComputedStyle(art).zIndex),
              overlayZ:Number(overlay.zIndex),
              textZ:Number(getComputedStyle(el.querySelector('.contact-copy')).zIndex)
            };
          });
          expect(Math.abs(layout.headingLeft-layout.previousLeft)).toBeLessThanOrEqual(1);
          for (const box of layout.texts) {
            expect(box.left).toBeGreaterThanOrEqual(layout.art.left);
            expect(box.right).toBeLessThanOrEqual(layout.art.right+1);
            expect(box.top).toBeGreaterThanOrEqual(layout.art.top);
            expect(box.bottom).toBeLessThanOrEqual(layout.art.bottom+1);
          }
          expect(layout.opacity).toBeGreaterThan(0);
          expect(layout.opacity).toBeLessThan(1);
          expect(layout.overlayDisplay).not.toBe('none');
          expect(layout.overlayOpacity).toBeGreaterThan(0);
          expect(layout.overlayOpacity).toBeLessThan(1);
          expect(layout.overlayPointerEvents).toBe('none');
          expect(layout.artZ).toBeLessThan(layout.overlayZ);
          expect(layout.overlayZ).toBeLessThan(layout.textZ);
          await expect(page.locator('#email-link')).toHaveAttribute('href', 'mailto:2464178595%40qq.com');
        } else {
          await expect(page.locator('.contact-mobile-art')).toBeHidden();
          await expect(page.locator('.contact-split')).toBeVisible();
        }
      }
    }
    if (width <= 720) {
      await page.locator('#contact').scrollIntoViewIfNeeded();
      await expect.poll(() => page.locator('.contact-mobile-art img').evaluate(img=>img.complete && img.naturalWidth>0)).toBe(true);
      await page.locator('.contact-action .text-link').click();
      await expect.poll(() => new URL(page.url()).hash).toBe('#interests');
    }
  }
});
