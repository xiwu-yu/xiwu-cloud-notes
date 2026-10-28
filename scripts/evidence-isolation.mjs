// 本地视觉截图不验证点赞服务，也不向正式 API 发请求。
// 点赞测试另用真正 Worker handler + SQLite；线上验收另作真实 API 检查。
export async function isolateLikes(page) {
  await page.route(/\/profile\.js(?:\?|$)/, async route => {
    const response = await route.fetch();
    await route.fulfill({response, body:(await response.text())+'\nwindow.siteProfile.likes=null;'});
  });
  await page.route(/\/posts\/[^/]+\/[^/]+\.html(?:\?|$)/, async route => {
    const response = await route.fetch();
    await route.fulfill({response, body:(await response.text()).replace(/data-api-url="[^"]*"/, 'data-api-url=""')});
  });
}
