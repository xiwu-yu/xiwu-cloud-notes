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

`writtenAt` 是写作日期，格式为 `YYYY-MM-DD`；未知时不填或填 `null`。`publishedAt` 是上传时间，保留时区。卡片和时间轴默认按写作时间从新到旧排序；也可以选择按上传时间或从旧到新排序，月份筛选和时间轴随选择切换；没有写作日期的文章排在最后。字数和阅读时长自动生成。卡片左上角的编号跟随**当前排序和筛选后的显示顺序**，不是固定编号。

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

首页文章卡片和时间轴是可访问的真实链接，普通点击增强为弹窗，按住 Ctrl/Cmd 或在新标签打开可读静态页。首页始终保留「静态文章目录」，即使禁用 JavaScript 或脚本/数据加载失败，也能展开目录阅读。JavaScript 可用时，目录按主站当前语言显示对应文章入口，缺译时标明回退原文；禁用脚本或首页增强失败时仍保留所有语言的静态链接。静态页提供四语言的主题切换按钮，与主站共用保存的深浅主题，刷新、切换译文及浏览器返回后保持一致；没有保存偏好时跟随系统。文章语言始终以独立链接路径为准，译文导航和返回主站链接保留该语言。主题增强脚本 `dist/reading.js` 在样式加载前读取偏好，不依赖 `profile.js`；脚本不可用时正文、译文导航和元数据仍完整，主题跟随系统。浏览器禁止存储时允许切换本页主题，刷新则回到系统主题。原有查询参数链接保持兼容，但分享预览爬虫通常不执行脚本，**「复制链接」已默认使用独立文章页链接**。

`dist/sitemap.xml` 和 `dist/robots.txt` 同步生成；站点基址统一在 `scripts/static.mjs`，默认 `https://xiwu-yu.github.io/xiwu-cloud-notes/`，包含项目子路径。换域名或仓库名时修改这里。删除文章/译文后，下次构建会移除相应静态页和目录条目。所有内容校验在写入前完成，生成过程也先在临时目录进行；内容错误或生成失败保留上次成功输出。

## 桌面端网易云歌单

音乐功能仅保留在桌面端。手机、平板及移动布局不显示音乐按钮、面板或歌单跳转链接；不请求网易云，也不保留音乐面板的页脚空白。禁用 JavaScript 时，移动端也不显示歌单入口。

桌面点击音乐按钮，在右下角展开约 400px 宽的抽屉，内嵌 330×450px 的网易云官方播放器，使用 [夕雾yu_official 的《云间来信》](https://music.163.com/playlist?id=18522359099)。播放和切歌全部由网易云原生控件提供，不添加无法控制跨域音频的自定义五键或播放模式按钮。

在 `content/site.json` 修改配置后运行 `pnpm build`：

```json
"music": {
  "playlistId": "18522359099",
  "title": "云间来信",
  "creator": "夕雾yu_official"
}
```

歌单当前四首曲目由网易云维护，不再保留本站的移动曲目目录或歌曲跳转链接。`playlistId` 为正整数字符串；配置为 `null` 或删去 `music` 可移除整个功能。错误配置会指出文件和字段，保留上次成功输出。未手改生成的 `dist/profile.js`。

桌面首次展开才加载 HTTPS 外链，`auto=0`，不强制播放。折叠、语言、主题、筛选和阅读弹窗不会重建 iframe。若将桌面窗口缩为移动布局，会卸载 iframe 内容，避免出现隐藏播放；恢复桌面尺寸后仍默认收起。手机和平板直接移除音乐 DOM，触屏/小屏样式也屏蔽无脚本时的备用入口。

外层兼容四语言和深浅主题，深色只调整宿主外框，不能改变跨域播放器的皮肤。矮桌面给页头留出空间，只缩短外层滚动视口，不缩放原生控件；可滚动到播放器顶部和底部，关闭与官方入口始终在滚动区外。高度不超过 600px 时，展开后暂时隐藏切换按钮，使用顶部关闭或下方收起按钮，收起后焦点返回切换按钮。阅读弹窗保持原生顶层。

首次展开显示等待说明，超过 10 秒仍未收到文档加载事件时，提示网络、地区和歌曲权限可能影响使用。iframe 的 `load` 只用于更新宿主说明，不能证明文档正常呈现、音频可用或正在播放，浏览器错误页也可能触发它。官方歌单入口始终保留；不增加音频解析、代理、VIP 绕过或跨域播放控制。整页导航会离开当前播放器，同页保留节点不能实现跨页续播。

Esc 仅在焦点位于宿主面板时可收起，iframe 内的 Esc 不会冒泡到父页。播放器后有说明、官方入口和可用 Tab 到达的收起按钮，外层滚动区也可用键盘操作；不使用透明遮罩拦截原生控件。

本轮矮桌面、等待状态、键盘和触屏回归及截图见 [晨雾云笺验收记录](artifacts/morning-mist/README.md)。

音乐相关历史截图在 `artifacts/music/`、`artifacts/music-mobile/`，其中的移动目录属于已移除的历史版本。

## 晨雾云笺样式与轻量动效

主题区分文字/链接 `--accent` 与装饰 `--accent-decor`，使用暖白、浅蓝、樱花粉，深色使用蓝灰背景。辅助文字至少 12px，正文主要为 15–16px、行高 1.95，卡片使用整块链接与明确的悬停/键盘焦点；移动端保留单列和第二行导航。插画 alt 通过 `content/ui.json` 的 `hero.artAlt` 提供四语言。便笺和称呼卡也使用主题配色，配图上小字有实色底，避免仅检查纸面背景而漏掉实际合成背景。

`dist/motion.js` / `motion.css` 是可失败的首页增强：三层云分别以 30/36/28 秒、不同方向和负延迟缓慢往返，逐层离屏或文档隐藏时暂停；首页插画以 10 秒、7px 上下漂浮，小屏为 14 秒、5px，第三层云停用、六枚静态星点减少为三枚；卡片首次进入视口时短暂浮现，同页重复筛选不会重复播放。悬停抬升 2px，dialog 和音乐面板进入使用短过渡。默认内容可见，不依赖动效脚本读文章；CSS 和 JS 均响应 `prefers-reduced-motion`，不添加星点框架、持续动画滤镜或假播放状态。标题与简介首次进入时使用 380ms / 6px 淡入（简介延迟 60ms），不重复播放或依赖动画显示正文。静态文章不加载这两项增强，不改变其正文、元数据与无 JS 阅读。

构建后可运行 `node scripts/morning-mist-evidence.mjs after` 保存页面和本地冷加载数据，或 `node scripts/contrast-evidence.mjs` 对 320/375/1440px、双主题的实际文字区域背景采样。这些脚本使用已安装的 Playwright Chromium，不增加产品依赖。对比图、资源前后体积、验证命令和人工待验事项均在 [验收记录](artifacts/morning-mist/README.md)。

## 智能导航与回到云端

首页导航使用 CSS sticky 保留原有占位和无脚本导航能力，滚动后增加柔和阴影；支持安全区，移动端沿用第二行链接和小屏隐藏英文副标题的既有规则。实际导航高度由 ResizeObserver 更新锚点偏移，语言和视口变化后标题仍可见。

离顶部 8px 内常显；离顶后每次滚动立即唤醒，连续 5 秒没有滚动或导航交互才向上隐藏，滑动为 260ms。悬停或焦点在导航内（含原生语言选择器）时不隐藏，离开后重新计时；切回标签页或页面缓存恢复也重置。滚动监听为 passive，仅阴影更新使用单个 rAF，隐藏时设置 inert / aria-hidden 并禁用点击。Tab 会先唤醒导航，焦点进入时取消滑动以确保控件立即可见；减少动态时显隐也即时完成。脚本或样式失败时不启用自动隐藏。

左上云朵是独立按钮，站名与副标题仍是原品牌链接。云朵动作会退出阅读状态，滚动至顶部，清理 post / hash，再调用真正的 location.reload()。支持 scrollend，并有短时检查与 2 秒完成兜底；减少动态时直接回顶。一次性的 history.state 标记在重载前启用手动滚动恢复，新文档在页首消费标记、回到顶部后恢复原 scrollRestoration，不循环刷新；语言放入首页 URL，主题沿用偏好（存储被阻止时也可借一次性状态保留这次刷新主题）。真正重载会结束当前音乐文档。

原生 modal 会使外部页头不可操作，因此阅读弹窗左上也提供同一云朵动作，使用同一四语言标签。无脚本或导航增强缺失时，页头云朵以原生 GET 表单返回首页，携带语言选择器的当前值。增强完成后云朵变成普通按钮，表单的隐式提交被取消，避免语言选择器按 Enter 意外刷新；无脚本时仍是提交按钮。没有拦截普通品牌、文章链接和锚点。

浏览器安装齐全时，可用 `PW_BROWSER=webkit pnpm test:e2e tests/e2e/navigation.spec.mjs` 补查 WebKit 引擎；它不代表真机 Safari 验收。默认 CI 继续使用 Chromium。

验收截图、状态表、测试与资源变化见 [智能导航升级记录](artifacts/smart-navigation/README.md)。构建后运行 `node scripts/navigation-evidence.mjs` 可重新生成截图与尺寸记录。

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

GitHub Actions 在 PR、main push 和手动触发时验证；安装 Chromium 及 Linux 系统依赖。只有 main 的全部验证通过才上传并部署 Pages，部署作业通过 `needs: validate` 依赖验证。验证作业仅有 `contents: read`，`pages: write` 和 `id-token: write` 仅授予部署作业。失败时保留报告/trace 14 天。Node 20 的 action 已按官方发布迁移：诊断上传使用 `upload-artifact@v6`，Pages 上传使用 `upload-pages-artifact@v5`（内部为 Node 24 的上传器），部署使用 `deploy-pages@v5.0.1`；本轮没有触发远端 workflow。

`dist/profile.js`、`dist/posts/`、sitemap 和 robots 是自动生成产物，不提交 Git；首页结构和 CSS/JS 源文件仍在 `dist/`。不要直接修改生成文件。构建只将个人资料和文章保留在 `localized`；删除了顶层默认语言副本及每篇的旧 `body` 别名，仓库运行脚本已使用 `localized`、`text`、`bodyHtml`，旧阅读脚本也优先使用这些字段。`text` 支持全文搜索/字数，`bodyHtml` 用于阅读，二者用途不同。没有拆分语言请求，切换仍是同步本地操作，没有新增缓存或网络失败状态；内容哈希继续控制缓存更新。

资源实测、验证记录与主要截图见 [本轮修复证据](artifacts/verification.md)。`node scripts/evidence.mjs after` 可用本机 Chrome 重新记录本地冷加载数据和截图（先构建）；测量的是本地无压缩 HTTP 服务，gzip 为离线估算，不代表线上 CDN 的传输压缩。

移动端联系区使用完整配图作为底层背景，沿用桌面端的透明度和主题遮罩；章节标记和标题放在图片左上方（顶部 36px、左侧 20px），联系方式和「再翻一篇」固定在图片左下角（左侧 20px、底部 28px）。移动端文字保留 20px 页边距；桌面端联系方式和「再翻一篇」位于图片右下角（右侧 32px、底部 28px），图片稍微向正文两侧扩展，给「05 / MORE TO BE CONTINUED」留出图片内边距，同时与前面章节标题左边缘对齐。浏览器测试覆盖各语言、主题下的文字边界、对齐与链接可操作性。[联系区前后截图与验证记录](artifacts/contact-mobile/README.md)。

「怎么称呼」「可以问哪些问题」「可以转发吗」三项 FAQ 初次进入和重新加载时全部折叠；点击后可独立展开。[阅读偏好与默认状态的验证及截图](artifacts/reading-preferences/README.md)。

当前联系邮箱统一为 `824396851az@gmail.com`，四种语言的显示文案、备用文案和 `mailto` 均使用该地址。

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
