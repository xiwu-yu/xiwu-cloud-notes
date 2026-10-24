# 夕雾 · 云间来信

一个放随笔和日常碎碎念的个人网站。淡蓝、浅粉和白色的云朵，偶尔认真，时常跑题。

[打开网站](https://xiwu-yu.github.io/xiwu-cloud-notes/)

界面支持简体中文、繁體中文、English 和日本語。右上角切换语言时，页面文字、文章列表和正在阅读的文章会一起切换；选择会保存在浏览器里，分享文章链接时也会带上语言。

## 写文章

**一篇文章对应 `content/posts/` 里的一个 `.md` 文件。** 开头两行 `---` 之间是标题、分类和收录日期，下面是 Markdown 正文。

```markdown
---
lang: "zh-CN"
title: 今天想说的几句话
category: 日常碎碎念
description: 放在首页卡片上的一句简介。
writtenAt: "2026-10-14"
publishedAt: "2026-10-23T20:00:00+08:00"
---

第一段正文。段落之间空一行就行。

## 一个小标题

可以写 **加粗**，也可以写普通段落。

> 想单独放出来的一句话。
```

- 修改旧文：打开对应的 `.md`，改正文并更新 `updatedAt`。
- 新增文章：复制 `templates/post.md` 到 `content/posts/`，换文件名、标题、分类和实际收录日期，再写正文。
- 文件名用小写英文和连字符，如 `a-rainy-day.md`，默认作为文章编号。旧文有显式 `id`；复制旧文时要更改或删掉这个字段。
- 删除文章：删除对应的 `.md`。
- 改昵称、个人介绍：编辑 `content/site.json`；其他语言在 `locales` 里写。
- 改界面固定文案：编辑 `content/ui.json`。四种语言必须使用同一组键，漏写或拼错时构建会报错。

文章区域支持搜索，会同时匹配标题、简介、分类、标签和正文，并与分类、月份、排序筛选组合生效。

`writtenAt` 是写作日期，格式为 `YYYY-MM-DD`；未知时不填或填 `null`。`publishedAt` 是上传时间，保留时区。页面可以选择按写作时间或上传时间排序，月份筛选和时间轴随选择切换；没有写作日期的文章排在最后。字数和阅读时长自动生成。卡片左上角的编号跟随**当前排序和筛选后的显示顺序**，不是固定编号。

### 翻译一篇文章

每篇译文也是一个普通 Markdown 文件。文件名建议用 `<id>.<语言>.md`，例如 `a-rainy-day.en.md`，并在资料里写：

```markdown
---
id: "a-rainy-day"
lang: "en"
title: "A Rainy Day"
category: "Everyday life"
description: "A short summary for the card."
publishedAt: "2026-10-23T20:00:00+08:00"
order: 3
---
```

- `lang` 可以是 `zh-CN`、`zh-TW`、`en`、`ja`，不写时默认 `zh-CN`。
- 同一篇文章的各语言版本使用**相同的 `id`**、相同的 `publishedAt`、`writtenAt`、`order` 和配图；标题、分类、标签、简介和正文按语言翻译。
- 必须有 `zh-CN` 原文。某语言缺少译文时，页面会暂时显示中文原文，构建不会失败。
- 分类筛选使用原文分类作为内部键，显示当前语言翻译后的分类名。

## 分享文章

打开任意卡片后，地址栏会变成 `?post=文章id`；英文界面还会带上 `&lang=en`。复制地址即可分享，也可以用弹窗底部的「复制链接」按钮。浏览器前进、后退会在打开过的文章和文章列表之间切换；直接打开分享链接会载入对应文章。

## 在 GitHub 上直接改

进入 `content/posts`，点开文章，再点铅笔图标编辑，保存到 `main`。发布流程会自动安装依赖、检查文章并生成网站。

新增文章可以点击 **Add file → Create new file**，文件名填写 `content/posts/你的文件名.md`，再粘贴模板。保存后到仓库 **Actions** 查看结果；绿色对勾表示发布成功。

## 本地查看

需要 Node.js 22.13 或以上版本和 pnpm 11.25.0。在仓库目录运行：

```sh
pnpm install --frozen-lockfile
pnpm dev
```

打开 http://127.0.0.1:8080。保存 Markdown 后会重新生成内容，刷新浏览器查看；按 Ctrl+C 停止。

```sh
pnpm test        # 检查解析、格式校验、构建和缓存版本
pnpm test:e2e    # Playwright 浏览器测试（需要本机安装 Google Chrome）
pnpm build       # 从 Markdown 生成网页使用的数据
```

`pnpm test:e2e` 会自动构建并启动 `127.0.0.1:4173`，覆盖文章加载、筛选、时间轴、弹窗、翻页、地址栏前进后退、主题、四种界面语言，以及 320、375、768、1440 像素布局。测试还会收集控制台报错、资源加载失败和横向溢出。

`dist/profile.js` 是自动生成的文件，不再作为文章来源，也不提交到 Git。不要直接修改它，否则下次构建会覆盖。

### 缓存版本

`pnpm build` 会计算 `style.css`、`profile.js`、`archive.js`、`script.js`，以及 `dist/assets` 中图片的内容哈希，并自动写入 HTML、CSS 和文章配图的 `?v=` 参数。部署后浏览器会请求新的 JS、CSS 和图片，不需要手动改版本号。不要手写固定的 `?v=`，再次构建即可自动更新。

## 文件地图

```text
content/site.json            个人资料（含四种语言的简介）
content/ui.json              界面固定文案（四种语言）
content/posts/*.md           每篇文章的资料与正文；译文使用相同 id
templates/post.md            新文章模板，不会出现在网站中
scripts/content.mjs          解析和检查 Markdown
scripts/build.mjs            生成网站数据、语言版本和资源哈希
scripts/preview.mjs          本地预览并监听 Markdown
scripts/serve.mjs            测试用静态服务器
dist/index.html              页面结构（构建时更新资源版本）
dist/style.css               蓝粉云朵与排版
dist/script.js               筛选、阅读、语言、主题与地址栏
dist/archive.js              时间排序、分组与字数
playwright.config.mjs        Playwright 配置
tests/e2e/site.spec.mjs      浏览器测试
.github/workflows/pages.yml  自动构建并发布 GitHub Pages
```

网页仍是静态 HTML、CSS 和 JavaScript。Markdown 在发布时转换，访客不需要安装任何东西。

此仓库与网站公开访问。文章应是适合公开的版本；不要将原始日记、联系方式、他人的身份信息或令牌写入仓库。

详细练习见 [学习与修改指南](学习与修改指南.md)。
