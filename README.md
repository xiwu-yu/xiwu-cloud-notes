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

- 修改旧文：打开对应的 `.md`，改正文并更新该语言版本的 `updatedAt`；修改公共日期或配图时要同步已有译文。
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
- 同一篇文章的各语言版本使用**相同的 `id`**、相同的 `publishedAt`、`writtenAt`、`order` 和 `image`；标题、分类、标签、简介、配图 `alt` 和正文按语言翻译。构建会比较解析后的字段值：时间字符串（含时区写法）需相同，未填写的写作日期统一视为 `null`，省略的 `order` / `image` 使用模板默认值。差异会列出译文文件、原文文件、字段和值。
- `updatedAt` **允许每种语言独立维护**，表示该版本最近修改时间，默认等于 `publishedAt`，不能早于上传时间。只更新译文无需改原文的 `updatedAt`，sitemap 和文章元数据采用各版本自己的值。
- 必须有 `zh-CN` 原文。缺少其他译文不会导致失败；阅读弹窗明确提示展示简体中文原文，正文 `lang`、字体和阅读时长使用实际正文语言，搜索仍覆盖这份原文。分类键、日期、筛选和翻页共用相同文章模型。同语言重复 id 或只有译文没有原文会报错。
- 分类筛选使用原文分类作为内部键，显示当前语言翻译后的分类名。

## 分享文章

打开任意卡片后，地址栏始终包含 `?post=文章id&lang=zh-CN`（或 `zh-TW`、`en`、`ja`）。复制地址可保留当前界面语言；弹窗底部「复制链接」默认复制实际正文版本的独立静态文章页，让分享平台直接取得正文和文章元数据。缺译回退时复制简体中文原文页；剪贴板不可用时也显示同一静态地址供手动复制。明确的 URL 语言优先于浏览器中保存的偏好，普通首页没有语言参数时仍沿用偏好。旧 `?post=文章id` 链接继续可用，固定打开简体中文原文，并补齐 `lang=zh-CN`。切换语言会替换当前历史记录，打开/翻页会新增记录；关闭会移除当前文章参数，浏览器前进后退会同步标题和正文。

### 静态阅读与分享预览

构建还会为**实际存在**的每份 Markdown 生成 `dist/posts/<id>/<lang>.html`。这些页面有完整正文、标题、简介、canonical、Open Graph、实际语言信息及已有译文的 `hreflang` 链接，不依赖 JavaScript。缺译不会生成假译文页；弹窗的独立文章链接指向实际显示的版本。

首页文章卡片和时间轴是可访问的真实链接，普通点击增强为弹窗，按住 Ctrl/Cmd 或在新标签打开可读静态页。首页始终保留「静态文章目录」，即使禁用 JavaScript 或脚本/数据加载失败，也能展开目录阅读。静态页按系统设置使用深浅主题。原有查询参数链接保持兼容，但分享预览爬虫通常不执行脚本，**「复制链接」已默认使用独立文章页链接**。

`dist/sitemap.xml` 和 `dist/robots.txt` 同步生成；站点基址统一在 `scripts/static.mjs`，默认 `https://xiwu-yu.github.io/xiwu-cloud-notes/`，包含项目子路径。换域名或仓库名时修改这里。删除文章/译文后，下次构建会移除相应静态页和目录条目。所有内容校验在写入前完成，生成过程也先在临时目录进行；内容错误或生成失败保留上次成功输出。

## 在 GitHub 上直接改

进入 `content/posts`，点开文章，再点铅笔图标编辑，保存到 `main`。发布流程会自动安装依赖，通过单元测试、构建和浏览器测试后再发布。Pull request 运行同样的验证而不部署。

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
pnpm exec playwright install chromium  # 首次安装测试浏览器
pnpm test:e2e    # Playwright 浏览器测试
# Linux/CI 首次使用：pnpm exec playwright install --with-deps chromium
pnpm build       # 从 Markdown 生成数据、静态文章页和 sitemap
```

`pnpm test:e2e` 会自动构建并启动两套服务：`4173` 使用真实文章进行内容冒烟检查，`4174` 使用 `tests/fixtures/posts/` 的固定文章测试排序、搜索、分类/月份、缺译回退、弹窗、语言偏好冲突、复制链接、历史和焦点恢复。服务同时支持本地根路径与 `/xiwu-cloud-notes/`，测试使用项目子路径。正常新增合法文章不需要改交互测试的篇数、标题或顺序。测试覆盖 320、375、768、1440px，四种语言和深浅主题，检查控制台、资源失败和横向溢出。也覆盖无 JavaScript、主脚本或数据请求失败后的静态阅读入口。

默认使用锁定版本的 Chromium；如需用本机 Chrome 调试可运行 `PW_CHANNEL=chrome pnpm test:e2e`。失败截图和 trace 在 `test-results/`，HTML 报告在 `playwright-report/`，运行 `pnpm exec playwright show-report` 查看。

GitHub Actions 在 PR、main push 和手动触发时验证；安装 Chromium 及 Linux 系统依赖。只有 main 的全部验证通过才上传并部署 Pages，部署作业通过 `needs: validate` 依赖验证。验证作业仅有 `contents: read`，`pages: write` 和 `id-token: write` 仅授予部署作业。失败时保留报告/trace 14 天。

`dist/profile.js`、`dist/posts/`、sitemap 和 robots 是自动生成产物，不提交 Git；首页结构和 CSS/JS 源文件仍在 `dist/`。不要直接修改生成文件。构建只将个人资料和文章保留在 `localized`；删除了顶层默认语言副本及每篇的旧 `body` 别名，仓库运行脚本已使用 `localized`、`text`、`bodyHtml`，旧阅读脚本也优先使用这些字段。`text` 支持全文搜索/字数，`bodyHtml` 用于阅读，二者用途不同。没有拆分语言请求，切换仍是同步本地操作，没有新增缓存或网络失败状态；内容哈希继续控制缓存更新。

资源实测、验证记录与主要截图见 [本轮修复证据](artifacts/verification.md)。`node scripts/evidence.mjs after` 可用本机 Chrome 重新记录本地冷加载数据和截图（先构建）；测量的是本地无压缩 HTTP 服务，gzip 为离线估算，不代表线上 CDN 的传输压缩。

移动端联系区使用完整配图作为底层背景，沿用桌面端的透明度和主题遮罩；标题、联系方式和「再翻一篇」叠在图上。文字保留 20px 页边距，使「05 / MORE TO BE CONTINUED」与前面章节标题对齐。浏览器测试覆盖各语言、主题下的文字边界、对齐与链接可操作性。[联系区前后截图与验证记录](artifacts/contact-mobile/README.md)。

### 缓存版本

`pnpm build` 会计算 `style.css`、`profile.js`、`archive.js`、`script.js`，以及 `dist/assets` 中图片的内容哈希，并自动写入 HTML、CSS 和文章配图的 `?v=` 参数。部署后浏览器会请求新的 JS、CSS 和图片，不需要手动改版本号。不要手写固定的 `?v=`，再次构建即可自动更新。

## 文件地图

```text
content/site.json            个人资料（含四种语言的简介）
content/ui.json              界面固定文案（四种语言）
content/posts/*.md           每篇文章的资料与正文；译文使用相同 id
templates/post.md            新文章模板，不会出现在网站中
scripts/content.mjs          解析和检查 Markdown
scripts/build.mjs            校验并生成数据、资源哈希和静态页面
scripts/static.mjs           独立文章页、元数据、目录与 sitemap
scripts/e2e-serve.mjs        固定测试内容的独立构建/服务
scripts/evidence.mjs         记录资源大小与主要截图
scripts/preview.mjs          本地预览并监听 Markdown
scripts/serve.mjs            测试用静态服务器
dist/index.html              页面结构（构建时更新资源版本）
dist/style.css               蓝粉云朵与排版
dist/script.js               筛选、阅读、语言、主题与地址栏
dist/archive.js              时间排序、分组与字数
playwright.config.mjs        Playwright 配置
tests/fixtures/posts/        固定交互测试文章（含缺译）
tests/e2e/site.spec.mjs      固定数据的浏览器回归
tests/e2e/content-smoke.spec.mjs 真实内容的动态冒烟检查
.github/workflows/pages.yml  自动构建并发布 GitHub Pages
```

网页仍是静态 HTML、CSS 和 JavaScript。Markdown 在发布时转换，访客不需要安装任何东西。

此仓库与网站公开访问。文章应是适合公开的版本；不要将原始日记、联系方式、他人的身份信息或令牌写入仓库。

详细练习见 [学习与修改指南](学习与修改指南.md)。
