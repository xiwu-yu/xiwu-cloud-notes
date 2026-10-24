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

test('contact has a spacious desktop image, mobile top-left heading and bottom-left links', async ({ page }) => {
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
        await expect(page.locator('#email-link')).toHaveAttribute('href', 'mailto:824396851az%40gmail.com');
        await expect(page.locator('#email-label')).toContainText('824396851az@gmail.com');
        await expect(page.locator('#contact-placeholder')).toContainText('824396851az@gmail.com');
        const headingOffset = await page.evaluate(() => document.querySelector('#contact .eyebrow').getBoundingClientRect().left - document.querySelector('.boundaries .eyebrow').getBoundingClientRect().left);
        expect(Math.abs(headingOffset)).toBeLessThanOrEqual(1);
        if (width <= 720) {
          await expect(page.locator('.contact-split')).toBeHidden();
          await expect(page.locator('.contact-mobile-art')).toBeVisible();
          const layout = await page.locator('#contact').evaluate(el => {
            const art = el.querySelector('.contact-mobile-art');
            const artBox = art.getBoundingClientRect();
            const overlay = getComputedStyle(el, '::before');
            const actionBox = el.querySelector('.contact-action').getBoundingClientRect();
            const copyBox = el.querySelector('.contact-copy').getBoundingClientRect();
            const texts = ['.eyebrow', 'h2', '#email-link', '.contact-action .text-link'].map(selector => {
              const box = el.querySelector(selector).getBoundingClientRect();
              return {left:box.left, right:box.right, top:box.top, bottom:box.bottom};
            });
            return {
              art:{left:artBox.left,right:artBox.right,top:artBox.top,bottom:artBox.bottom},
              texts,
              actionLeft:actionBox.left, actionTop:actionBox.top, actionBottom:actionBox.bottom, copyTop:copyBox.top, copyBottom:copyBox.bottom,
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
          expect(Math.abs(layout.actionLeft-layout.art.left-20)).toBeLessThanOrEqual(1);
          expect(Math.abs(layout.art.bottom-layout.actionBottom-28)).toBeLessThanOrEqual(1);
          expect(Math.abs(layout.copyTop-layout.art.top-36)).toBeLessThanOrEqual(1);
          expect(layout.actionTop).toBeGreaterThan(layout.copyBottom+12);
          expect(layout.opacity).toBeGreaterThan(0);
          expect(layout.opacity).toBeLessThan(1);
          expect(layout.overlayDisplay).not.toBe('none');
          expect(layout.overlayOpacity).toBeGreaterThan(0);
          expect(layout.overlayOpacity).toBeLessThan(1);
          expect(layout.overlayPointerEvents).toBe('none');
          expect(layout.artZ).toBeLessThan(layout.overlayZ);
          expect(layout.overlayZ).toBeLessThan(layout.textZ);
          await expect(page.locator('#email-link')).toHaveAttribute('href', 'mailto:824396851az%40gmail.com');
        } else {
          await expect(page.locator('.contact-mobile-art')).toBeHidden();
          await expect(page.locator('.contact-split')).toBeVisible();
          const desktop = await page.locator('#contact').evaluate(el => {
            const box = el.getBoundingClientRect();
            const previous = document.querySelector('.boundaries').getBoundingClientRect();
            const action = el.querySelector('.contact-action').getBoundingClientRect();
            const copy = el.querySelector('.contact-copy').getBoundingClientRect();
            return {width:box.width,previousWidth:previous.width,captionInset:el.querySelector('.eyebrow').getBoundingClientRect().left-box.left,right:box.right-action.right,bottom:box.bottom-action.bottom,gap:action.left-copy.right};
          });
          expect(desktop.width).toBeGreaterThan(desktop.previousWidth);
          expect(desktop.captionInset).toBeGreaterThanOrEqual(15);
          expect(Math.abs(desktop.right-32)).toBeLessThanOrEqual(1);
          expect(Math.abs(desktop.bottom-28)).toBeLessThanOrEqual(1);
          expect(desktop.gap).toBeGreaterThan(12);
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
