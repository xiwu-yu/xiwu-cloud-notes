import { test as base, expect } from '@playwright/test';

const test = base.extend({
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

const cardIds = page => page.locator('.interest-card').evaluateAll(nodes => nodes.map(node => node.dataset.essayId));
const cardNumbers = page => page.locator('.interest-card .card-number').allTextContents();
const postParam = page => new URL(page.url()).searchParams.get('post');
const langParam = page => new URL(page.url()).searchParams.get('lang');

test('article cards are numbered in the order they are displayed', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.interest-card')).toHaveCount(3);
  expect(await cardIds(page)).toEqual(['xiwu', 'claw-marks', 'hrt-preface']);
  expect(await cardNumbers(page)).toEqual(['01', '02', '03']);
  await expect(page.locator('#item-count')).toHaveText('03 篇随笔');
  await expect(page.locator('#profile-about')).toContainText('nina喵');
  await expect(page.locator('.gentle-note > p')).toContainText('飞萤扑火');
  await expect(page.locator('#contact-title')).toContainText('我们的存在');
  await expect(page.locator('.ticker')).toContainText('昔雾曾隔长夜望');
  await expect(page.locator('.ticker')).toContainText('不知彼岸是今朝');
  await expect(page.locator('.editorial-note')).toHaveText('夕雾是一只可爱的猫猫，喵喵喵～');
  await expect(page.locator('#interests .section-heading > p')).toContainText('但行好事');
  await expect(page.locator('#resources .section-heading > p')).toContainText('一些跨性别相关网站');
  await expect(page.locator('#boundaries-title')).toHaveText('一些问题');
  await expect(page.locator('.faq summary').first()).toHaveText('怎么称呼？');
  await expect(page.locator('.faq details').nth(1).locator('p')).toHaveText('跨性别相关，游戏动漫，诗词文章都可以。');
  await expect(page.locator('.faq details').nth(2).locator('p')).toHaveText('需要征求夕雾的同意喵，联系方式在最后。');
  await expect(page.locator('.ticker i')).toHaveCount(0);
  await expect(page.locator('#email-link')).toBeVisible();
  await expect(page.locator('#email-link')).toHaveAttribute('href', /mailto:2464178595%40qq\.com/);
  await expect(page.locator('#email-label')).toHaveText('联系方式 2464178595@qq.com');
  await expect(page.locator('#contact-placeholder')).toBeHidden();
  await expect(page.locator('footer p')).toHaveText('今夕回眸怜旧我，明朝抵岸忆他宵。');
  await expect(page.locator('.about-portraits img')).toHaveCount(2);
  expect(await page.locator('.hero-art img').getAttribute('src')).toMatch(/cloudscape\.svg\?v=[a-f0-9]{10}/);

  await page.selectOption('#archive-order', 'oldest');
  expect(await cardIds(page)).toEqual(['hrt-preface', 'claw-marks', 'xiwu']);
  expect(await cardNumbers(page)).toEqual(['01', '02', '03']);

  await page.getByRole('button', { name: '性别与生活', exact: true }).click();
  await expect(page.locator('.interest-card')).toHaveCount(1);
  expect(await cardIds(page)).toEqual(['hrt-preface']);
  expect(await cardNumbers(page)).toEqual(['01']);
  await expect(page.locator('#item-count')).toHaveText('01 篇随笔');

  await page.getByRole('button', { name: '全部', exact: true }).click();
  await page.selectOption('#archive-order', 'newest');
  await page.selectOption('#archive-date-by', 'writtenAt');
  expect(await cardIds(page)).toEqual(['claw-marks', 'xiwu', 'hrt-preface']);
  expect(await cardNumbers(page)).toEqual(['01', '02', '03']);
});

test('theme, category filters and the timeline all work together', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.locator('.theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.locator('.theme-toggle').click();

  await page.getByRole('button', { name: '生活与情绪', exact: true }).click();
  await expect(page.locator('.interest-card')).toHaveCount(1);
  expect(await cardIds(page)).toEqual(['claw-marks']);

  await page.getByRole('button', { name: '全部', exact: true }).click();
  await page.getByRole('button', { name: '时间轴', exact: true }).click();
  await expect(page.locator('#essay-timeline')).toBeVisible();
  await expect(page.locator('.timeline-group')).toHaveCount(1);
  await expect(page.locator('.timeline-heading')).toContainText('2026.10.24');
  await expect(page.locator('.timeline-heading')).toContainText('3 篇');
  await expect(page.locator('.timeline-entry')).toHaveCount(3);

  await page.selectOption('#archive-date-by', 'writtenAt');
  await expect(page.locator('.timeline-group')).toHaveCount(3);
  await expect(page.locator('.timeline-heading').first()).toContainText('2026.10.14');
  await expect(page.locator('.timeline-heading').last()).toContainText('2026.03.12');

  await page.getByRole('button', { name: '卡片', exact: true }).click();
  await page.selectOption('#archive-month', '2026-09');
  await page.getByRole('button', { name: '生活与情绪', exact: true }).click();
  await expect(page.locator('#archive-empty')).toBeVisible();
  await expect(page.locator('#item-count')).toHaveText('00 篇随笔');
  await page.locator('#archive-reset').click();
  await expect(page.locator('#archive-empty')).toBeHidden();
  await expect(page.locator('.interest-card')).toHaveCount(3);
});

test('article dialog has a shareable URL and follows browser back and forward', async ({ page }) => {
  await page.goto('/');
  await page.locator('.interest-card').first().locator('.card-button').click();
  await expect(page.locator('#interest-dialog')).toBeVisible();
  await expect(page.locator('#dialog-title')).toHaveText('夕雾');
  expect(postParam(page)).toBe('xiwu');
  await expect(page.locator('#essay-position')).toHaveText('1 / 3');
  await expect(page.locator('#dialog-meta')).toContainText('写于 2026.09.16');
  await expect(page.locator('#dialog-body')).toContainText('昔雾曾隔长夜望');

  await page.locator('#essay-next').click();
  await expect(page.locator('#dialog-title')).toHaveText('在死亡来临之前，用力留下爪痕喵');
  expect(postParam(page)).toBe('claw-marks');
  await expect(page.locator('#essay-position')).toHaveText('2 / 3');

  await page.goBack();
  await expect(page.locator('#dialog-title')).toHaveText('夕雾');
  expect(postParam(page)).toBe('xiwu');
  await page.goForward();
  await expect(page.locator('#dialog-title')).toHaveText('在死亡来临之前，用力留下爪痕喵');
  expect(postParam(page)).toBe('claw-marks');

  await page.locator('.dialog-close').click();
  await expect(page.locator('#interest-dialog')).not.toBeVisible();
  await expect.poll(() => postParam(page)).toBeNull();

  await page.goto('/?post=hrt-preface');
  await expect(page.locator('#interest-dialog')).toBeVisible();
  await expect(page.locator('#dialog-title')).toHaveText('HRT 前言');
  await expect(page.locator('#dialog-meta')).toContainText('写于 2026.03.12');
  expect(postParam(page)).toBe('hrt-preface');

  await page.goto('/?post=claw-marks&lang=ja');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
  await expect(page.locator('#interest-dialog')).toBeVisible();
  await expect(page.locator('#dialog-title')).toHaveText('死が来る前に、爪痕を残したい');
  expect(langParam(page)).toBe('ja');
});

test('portrait images load and the contact artwork switches between split and mobile backgrounds', async ({ page }) => {
  await page.goto('/');
  await page.locator('.about-portraits img').first().scrollIntoViewIfNeeded();
  await expect.poll(() => page.locator('.about-portraits img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);

  await page.locator('#contact').scrollIntoViewIfNeeded();
  const desktopLayers = await page.locator('.contact-split span').evaluateAll(layers => layers.map(layer => getComputedStyle(layer).backgroundImage));
  expect(desktopLayers).toHaveLength(2);
  expect(desktopLayers.every(image => image.includes('contact.jpg'))).toBe(true);
  const positions = await page.locator('.contact-split span').evaluateAll(layers => layers.map(layer => getComputedStyle(layer).backgroundPosition));
  expect(positions[0]).toBe('50% 0%');
  expect(positions[1]).toBe('50% 100%');

  await page.setViewportSize({ width: 375, height: 900 });
  await expect(page.locator('.contact-split')).toBeHidden();
  const mobileStyle = await page.locator('#contact').evaluate(element => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return { background: style.backgroundImage, size: style.backgroundSize, ratio: rect.height / rect.width };
  });
  expect(mobileStyle.background).toContain('contact.jpg');
  expect(mobileStyle.size).toBe('contain');
  expect(Math.abs(mobileStyle.ratio - 508 / 338)).toBeLessThan(0.02);
});

test('category filters stay selected when the interface language changes', async ({ page }) => {
  await page.goto('/');
  await page.selectOption('#language-select', 'en');
  await page.getByRole('button', { name: 'Gender & Life', exact: true }).click();
  await expect(page.locator('.interest-card')).toHaveCount(1);
  await expect(page.locator('.interest-card')).toContainText('HRT: A Preface');

  await page.selectOption('#language-select', 'ja');
  const japaneseFilter = page.getByRole('button', { name: 'ジェンダーと暮らし', exact: true });
  await expect(japaneseFilter).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.interest-card')).toHaveCount(1);
  await expect(page.locator('.interest-card')).toContainText('HRT のまえがき');

  await page.selectOption('#language-select', 'zh-TW');
  await expect(page.getByRole('button', { name: '性別與生活', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.interest-card')).toContainText('HRT 前言');
});

test('language selection changes the interface and the essays, including an open dialog', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect(page.locator('#hero-title')).toContainText('想说的话很多喵');
  await page.locator('.interest-card').first().locator('.card-button').click();
  await expect(page.locator('#dialog-title')).toHaveText('夕雾');

  await page.selectOption('#dialog-language-select', 'en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('#dialog-title')).toHaveText('Evening Mist');
  await expect(page.locator('#dialog-body')).toContainText('Xi Wu once gazed across the long night');
  await expect(page.locator('.gentle-note > p')).toContainText('Fireflies into the flame');
  await expect(page.locator('#contact-title')).toContainText('Our existence');
  await expect(page.locator('.about-portraits img').first()).toHaveAttribute('alt', /anime portrait/);
  expect(langParam(page)).toBe('en');
  expect(postParam(page)).toBe('xiwu');
  await page.locator('.dialog-close').click();
  await expect(page.locator('#hero-title')).toContainText('So much I want to say');
  await expect(page.locator('.interest-card').first()).toContainText('Evening Mist');
  await expect(page.locator('.ticker')).toContainText('Xi Wu once gazed across the long night');
  await expect(page.locator('#email-label')).toHaveText('Contact 2464178595@qq.com');
  await expect(page.locator('footer p')).toContainText('Tonight I turn back and pity who I was');

  await page.selectOption('#language-select', 'ja');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
  await expect(page.locator('#hero-title')).toContainText('言いたいことはたくさん');
  await expect(page.locator('.interest-card').first()).toContainText('夕霧');

  await page.selectOption('#language-select', 'zh-TW');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-TW');
  await expect(page.locator('#hero-title')).toContainText('想說的話很多喵');
  await expect(page.locator('.interest-card').first()).toContainText('夕霧');

  await page.selectOption('#language-select', 'en');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('#hero-title')).toContainText('So much I want to say');
});

test('320px, 375px, 768px and 1440px layouts stay inside the viewport in every language', async ({ page }) => {
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    for (const language of ['zh-CN', 'zh-TW', 'en', 'ja']) {
      await page.selectOption('#language-select', language);
      const layout = await page.evaluate(() => {
        const header = document.querySelector('.site-header');
        const select = document.querySelector('#language-select').getBoundingClientRect();
        return {
          documentWidth: document.documentElement.scrollWidth,
          bodyWidth: document.body.scrollWidth,
          viewportWidth: window.innerWidth,
          headerWidth: header.scrollWidth,
          headerClientWidth: header.clientWidth,
          selectRight: select.right,
          selectLeft: select.left,
          columns: getComputedStyle(document.querySelector('#interest-grid')).gridTemplateColumns.split(' ').length
        };
      });
      expect(layout.documentWidth, `${width}px ${language}: document overflow`).toBeLessThanOrEqual(layout.viewportWidth + 1);
      expect(layout.bodyWidth, `${width}px ${language}: body overflow`).toBeLessThanOrEqual(layout.viewportWidth + 1);
      expect(layout.headerWidth, `${width}px ${language}: header overflow`).toBeLessThanOrEqual(layout.headerClientWidth + 1);
      expect(layout.selectLeft).toBeGreaterThanOrEqual(0);
      expect(layout.selectRight, `${width}px ${language}: language selector outside viewport`).toBeLessThanOrEqual(layout.viewportWidth);
      expect(layout.columns, `${width}px ${language}: card columns`).toBe(width > 720 ? 3 : 1);

      await page.locator('.interest-card').first().locator('.card-button').click();
      await expect(page.locator('#interest-dialog')).toBeVisible();
      const dialog = await page.locator('#interest-dialog').boundingBox();
      expect(dialog.x).toBeGreaterThanOrEqual(0);
      expect(dialog.x + dialog.width, `${width}px ${language}: dialog overflow`).toBeLessThanOrEqual(width + 1);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(overflow, `${width}px ${language}: overflow with dialog`).toBeLessThanOrEqual(width + 1);
      await page.locator('.dialog-close').click();
    }
  }
});
