# 夕雾 · 云间来信

一个放随笔和日常碎碎念的个人网站。淡蓝、浅粉和白色的云朵，偶尔认真，时常跑题。

[打开网站](https://cloud.xiwu.space/)

首页资料区与问答区使用「阅读资源」「一些问题」作为标题，四语言切换同步对应翻译。

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

文章区域以「云间来信」为主标题，原句「一些思考，一点情绪」作为副标题保留。搜索始终可见，会同时匹配标题、简介、分类、标签和正文；分类及卡片/时间轴切换保持直接可用。写作/上传时间、月份和升降序位于原生「日期与排序」展开区，默认收起，折叠或切换语言不会丢失选择；闭合时仍显示已调整的条件数，空结果可恢复全部文章。

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

`dist/sitemap.xml` 和 `dist/robots.txt` 同步生成。生产基址在 `content/site.json` 的 `baseUrl`，当前为 `https://cloud.xiwu.space/`；可用 `SITE_URL=https://example.org/notes/ pnpm build` 覆盖，优先级为环境变量、配置、生产默认值。基址必须是无账号、查询参数或片段的 HTTPS 目录，自动补末尾斜杠；首页及静态文章的 canonical、Open Graph、文章 hreflang、sitemap 与 robots 共用该值。正文/资源和返回链接仍使用相对路径，兼容旧 `/xiwu-cloud-notes/` 项目子路径。删除文章/译文后，下次构建会移除相应静态页和目录条目。所有内容校验在写入前完成，生成过程也先在临时目录进行；内容错误或生成失败保留上次成功输出。

## 网易云音乐悬浮栏（桌面与移动端）

音乐使用夕雾yu_official 的《云间来信》，仍由网易云官方 HTTPS 外链提供播放、切歌和歌单操作。本轮按作者选择保留可见的原生控件，将音乐按钮和圆角面板改为蓝粉白液态玻璃风格；不添加不能控制跨域音频的假五键，也不隐藏或覆盖原生按钮。

右下角按钮默认收起，点击后在页面底部中央展开约 420px 宽的面板；手机、平板与触屏也提供相同入口。小屏宽度不足 330px 时，官方文档可在内部横向滚动，矮窗口可纵向滚动到顶部和底部，不缩放原生控件。关闭与备用入口位于滚动区外；高度不超过 600px 时展开后暂时隐藏右下按钮，关闭后恢复并返回焦点。预留底部安全区，阅读 dialog 仍在原生顶层。

配置位于 `content/site.json`：

```json
"music": {
  "playlistId": "18522359099",
  "title": "云间来信",
  "creator": "夕雾yu_official"
}
```

`playlistId` 必须是正整数字符串，`music: null` 或删除该配置可移除功能；错误配置保留上一次成功构建。首次展开才加载。移动设备直接使用官方 `https://music.163.com/m/outchain/player`，避开桌面入口向 HTTP 的重定向，避免 HTTPS 父页的混合内容拦截；桌面入口不变，仍保留 `auto=0`，不会自动打开外链或强制播放。同页收起、主题、语言、搜索、筛选、阅读弹窗和桌面/手机尺寸切换都不重建 iframe，也不改动其 src。整页导航会离开播放器，后台和移动系统是否持续播放由浏览器及平台决定。

外层支持四语言、深浅主题和减少动态；毛玻璃不受支持时使用实色回退。本站 CSS 无法重绘网易云跨域控件，官方播放器仍使用自己的配色。`load` 仅表示官方文档返回，不能证明歌曲可播；等待 10 秒提示网络、地区及权限限制，始终提供用户主动选择的官方备用入口，无 JS 时也可使用该链接。本站不提取音频、不接入解析或代理、不绕过 VIP。用户提供的视频转出的 MP3 仅保存在被 Git 忽略的 `work/local-audio/`，不参与构建、提交和发布。

Esc 只能在宿主面板内收起，iframe 内不向父页冒泡。可使用 Tab 到达原生播放器后面的备用链接和收起按钮（部分 Safari 设置需 Option+Tab），不使用透明覆盖层。

自动化的外部文档 fixture 仅验证宿主布局、按需加载及节点稳定性，不作为网易云真实播放成功的证据。移动端可播性还取决于网易云对该设备、网络与歌曲的支持。历史 `artifacts/music*` 与晨雾报告属于当时的版本，不能代表本轮手机入口或真实播放结果。

本轮变更与验证细节见 [网易云悬浮音乐栏验收](docs/music-glass-review.md)。

## 晨雾云笺样式与轻量动效

主题区分文字/链接 `--accent` 与装饰 `--accent-decor`，使用暖白、浅蓝、樱花粉，深色使用蓝灰背景。辅助文字至少 12px；长文在手机为 17px、桌面为 18px，行高 1.85，卡片使用整块链接与明确的悬停/键盘焦点；移动端保留单列和第二行导航。插画 alt 通过 `content/ui.json` 的 `hero.artAlt` 提供四语言。便笺和称呼卡也使用主题配色，配图上小字有实色底，避免仅检查纸面背景而漏掉实际合成背景。

`dist/motion.js` / `motion.css` 是可失败的首页增强：三层云分别以 30/36/28 秒、不同方向和负延迟缓慢往返，逐层离屏或文档隐藏时暂停；首页插画以 10 秒、7px 上下漂浮，小屏为 14 秒、5px，第三层云停用、六枚静态星点减少为三枚；卡片首次进入视口时短暂浮现，同页重复筛选不会重复播放。悬停抬升 2px，dialog 和音乐面板进入使用短过渡。默认内容可见，不依赖动效脚本读文章；CSS 和 JS 均响应 `prefers-reduced-motion`，不添加星点框架、持续动画滤镜或假播放状态。标题与简介首次进入时使用 380ms / 6px 淡入（简介延迟 60ms），不重复播放或依赖动画显示正文。静态文章不加载这两项增强，不改变其正文、元数据与无 JS 阅读。

构建后可运行 `node scripts/morning-mist-evidence.mjs after` 保存页面和本地冷加载数据，或 `node scripts/contrast-evidence.mjs` 对 320/375/1440px、双主题的实际文字区域背景采样。这些脚本使用已安装的 Playwright Chromium，不增加产品依赖。对比图、资源前后体积、验证命令和人工待验事项均在 [验收记录](artifacts/morning-mist/README.md)。

## 长文阅读与外观偏好

手机阅读弹窗接近全屏，正文左右各 20px；桌面正文行长不超过 720px。`--reader-font-size` 控制正文基础字号，四种语言继续使用原有系统字体。工具条固定在阅读容器顶部，关闭、语言选择、主题、回到云端及减少透明效果可通过键盘访问；Esc、地址栏历史、文章翻页和关闭后的焦点恢复沿用现有逻辑。独立静态文章使用相同排版，正文、元数据和返回链接仍在原始 HTML 中，禁用 JavaScript 也能读。

统一的 `.glass-surface` 将透色底层、边缘反光、阴影、交互高光分开管理，小控件、大面板、图片浮层使用不同参数。面层不再叠加蓝粉/白色渐变；蓝粉更多来自后面的云雾和一像素边缘染色。反光通过边缘掩膜限制，中央不盖斜白带。卡片外壳透色、摘要独立实色；封面本身不模糊。搜索区降低重量，不在内部控件重复叠加 backdrop-filter。缺少滤镜支持及减少透明效果时使用可读实色。这里只实现透色与边缘反馈，不声称是完整 Apple 光学折射。

右上角两个重叠圆形的按钮为「减少透明效果」，阅读工具条也有同一开关。`dist/appearance.js` 在样式加载前恢复 `xiwu-reduce-transparency` 偏好；主站和静态文章共用，存储被禁用时只影响当前文档。系统减少透明度、更高对比度或强制颜色优先，届时开关显示启用状态并由系统管理。四语言文案来自 `content/ui.json`。减少动态时取消高光移动和按压缩放；系统减少透明度媒体查询的兼容性有限，因此手动开关独立保留。

`dist/appearance.js` 是独立增强，不依赖 `profile.js`；脚本加载失败时手动按钮隐藏，正文和原生链接不受影响。静态文章模板在 `scripts/static.mjs`，修改模板后通过构建生成，不手改 `dist/posts/`。主页 HTML、CSS 和 JS 仍以 `dist/` 中的受版本控制文件为源。

执行 `node scripts/design-evidence.mjs after` 可生成首页、文章列表、手机正文与本地冷加载实测；设置 `EVIDENCE_DIR` 时输出至相应目录。CI 在验证阶段捕获这些证据并沿用既有 Actions Artifacts，不扩大权限。详见 [本轮排版与玻璃材质验收](docs/glass-reading-review.md)。

## 智能导航与回到云端

首页导航使用 CSS sticky 保留原有占位和无脚本导航能力，滚动后增加柔和阴影；支持安全区，移动端沿用第二行链接和小屏隐藏英文副标题的既有规则。实际导航高度由 ResizeObserver 更新锚点偏移，语言和视口变化后标题仍可见。

导航采用全宽背景外层和与正文网格对齐的限宽内层；桌面主体为 76px（另计边线和顶部安全区），小屏和放大文字可自动换行。实色回退保持对比度，支持时增加轻量毛玻璃。导航文字即时随主题更新，背景和下划线反馈为 160ms。

离顶部 8px 内常显；离顶后每次滚动立即唤醒，连续 **2 秒**没有滚动或导航交互才开始向上隐藏，滑动为 **200ms**。实现集中使用 `IDLE_HIDE_MS=2000`；云朵刷新的 2 秒完成兜底用途不同，保持不变。悬停或焦点在导航内（含原生语言选择器）时不隐藏，离开后重新计时；切回标签页或页面缓存恢复也重置。滚动监听为 passive，仅阴影更新使用单个 rAF，隐藏时设置 inert / aria-hidden 并禁用点击。Tab 会先唤醒导航，焦点进入时取消滑动以确保控件立即可见；减少动态时显隐也即时完成。脚本或样式失败时不启用自动隐藏。

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

GitHub Actions 在 PR、main push 和手动触发时验证；安装 Chromium 及 Linux 系统依赖。只有 main 的全部验证通过才上传并部署 Pages，部署作业通过 `needs: validate` 依赖验证。验证作业仅有 `contents: read`，`pages: write` 和 `id-token: write` 仅授予部署作业。失败时保留报告/trace 14 天。Node 20 的 action 已按官方发布迁移：诊断上传使用 `upload-artifact@v6`，Pages 上传使用 `upload-pages-artifact@v5`（内部为 Node 24 的上传器），部署使用 `deploy-pages@v5.0.1`；Actions 的最近运行与本轮结果见对应 PR/运行记录；历史验收数字不代表当前生产状态。

`dist/profile.js`、`dist/posts/`、`dist/404.html`、sitemap、robots 和 `dist/build-info.json` 是自动生成产物，不提交 Git；首页结构和 CSS/JS 源文件仍在 `dist/`。不要直接修改生成文件。构建只将个人资料和文章保留在 `localized`；删除了顶层默认语言副本及每篇的旧 `body` 别名，仓库运行脚本已使用 `localized`、`text`、`bodyHtml`，旧阅读脚本也优先使用这些字段。`text` 支持全文搜索/字数，`bodyHtml` 用于阅读，二者用途不同。没有拆分语言请求，切换仍是同步本地操作，没有新增缓存或网络失败状态；内容哈希继续控制缓存更新。

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

## 自定义域名、版本核对与审查证据

旧站 `https://xiwu-yu.github.io/xiwu-cloud-notes/` 已由 GitHub Pages 301 到新域名；实测保留文章深链、查询语言与浏览器 hash。继续沿用仓库 Pages 的自定义域名设置，不创建第二套内容发布，也不增加全站客户端重定向。旧域名与新域名的 localStorage 不共享，旧分享链接须依靠 URL 中的显式语言。迁移证据、PR 三个提交的审查结论和待验风险见 [域名与发布审查](docs/domain-migration-review.md)。

每次成功构建生成 `dist/build-info.json`：`commitSha`、UTC `builtAt`、`source`、`siteUrl`、`workingTreeDirty`，Actions 另含运行链接。SHA 从实际仓库 HEAD 读取，不允许传入假 SHA 证明来源；没有仓库信息时为 `null`。`workingTreeDirty` 为三态：`true` 表示有未提交状态（包括未跟踪源码），`false` 表示 Git 状态已知且干净，`null` 表示状态读取失败或构建目录不是仓库根目录。Git 正常忽略依赖和输出，但构建实际读取的文章、脚本、样式和资源即使误加入 ignore 也不能当成干净来源。本地未知状态仍可预览/校验正文；正式来源校验必须 SHA 匹配、来源为 Actions、dirty 严格为 false，拒绝未知状态。构建失败保留上次信息。构建时间不参与资源内容哈希，文章与资源仍可确定性生成。

```sh
node scripts/verify-site.mjs --local dist
# 发布完成后（填入实际发布的完整 SHA）：
node scripts/verify-site.mjs https://cloud.xiwu.space/ <完整GitSHA>
```

校验器核对 build-info 的 SHA/来源、首页和 sitemap 中所有文章的静态元数据、语言、正文、robots 及页面引用的带哈希资源；正式检查用独立查询参数避开缓存，不接受跳转到其他版本。PR 仅 validate、不部署；main 仍须先 validate 才能 deploy，部署后新增只读 `verify-deployment`。发布后校验失败会使工作流失败并保存报告，**不会自动回滚已经发布的文件**，应查明缓存/发布原因后人工处理。仅 deploy 作业拥有 Pages 写权限与身份令牌权限。

PR 新增的大批截图、日志和重复补丁不再放入 Git；保留简洁 Markdown 记录与少量体积/几何摘要。Actions 每次验证均上传 `review-evidence-<SHA>`（包括成功时），失败也保留 Playwright 报告/trace，保留期 14 天。可从 Actions 运行页面下载，或 `gh run download <运行ID> -n review-evidence-<SHA>`。本地重新生成用 `EVIDENCE_DIR=work/evidence node scripts/morning-mist-evidence.mjs after` 和 `EVIDENCE_DIR=work/evidence node scripts/navigation-evidence.mjs`；历史截图仅本机备份于 `work/pr-evidence-before-cleanup/`，不重写既有提交历史。

## 静态首页声明、404 与分享封面

本轮选择保留**单个中文静态首页**，不声称完成首页多语言静态 SEO。`?lang=zh-CN/zh-TW/en/ja` 继续作为浏览器界面增强，原始 HTML、title/description/OG 和根 canonical 均是中文首页，移除原来指向查询参数的首页 hreflang。禁用 JavaScript 的分享抓取端仍看到中文首页；四语言文章独立静态页及其真实互相对应的 hreflang 保留，路径未改。没有新增语言子目录、SSR 或客户端重定向，也不声称搜索索引/排名已修复。

`dist/404.html` 在构建阶段生成，四种语言的恢复说明、回首页、文章目录和静态文章链接均不依赖脚本；样式/脚本及链接从站点根路径开始，因此未知深路径不会把它们解析成 `missing/deep/style.css`。本地 serve/dev 和 GitHub Pages 都使用真实 404 状态，404 设为 noindex 且不进入 sitemap。`reading.js` 仅增强主题。

首页和文章 OG 共用站点自有 `dist/assets/share-cover.png`，1200×630，`image/png`，带宽高、四语言 alt 和资源哈希；文章正文配图不改。封面由现有 cloudscape.svg 和系统字体生成，开发时显式运行 `node scripts/share-cover.mjs` 可以重生成，日常 `pnpm build` 只读取提交过的 PNG，不要求浏览器参与构建。它不会作为首页正文图片额外加载。实际 PNG/元数据/MIME 可验证，但没有登录社交平台执行发布、清缓存或验证平台预览成功。

本轮逐项原因、文件、验收与资源变化见 [导航、来源与恢复体验记录](docs/navigation-provenance-review.md)。基线报告仍按其检查日期保留；发布后以实际 main SHA 的 build-info 和工作流校验结果为准。

## 蓝粉玻璃与音乐栏拖拽

首页两个入口改为等宽蓝粉玻璃按钮；分类保留原生按钮和 `aria-pressed`，由单一 aria-hidden 玻璃底托以 340ms transform 连续移动；文字不缩放，减少动态时直接切换。语言、窗口、字体变化后重测，窄屏分类横向滚动并保持选中项可见。插画下方英文取消斜体和旋转、两行左对齐；末尾 05 标签和联系方式组浮在原有图片上，正文保持原样。

阅读弹窗新增独立主题按钮，与主站及静态页使用同一偏好。桌面精细指针、宽度超过 900px 时，可拖动音乐标题移动面板，或聚焦标题后使用方向键（Shift 加大步长），Home 恢复默认位置；调整窗口后约束到可见区域，手机/触屏仍固定在底部。同页折叠、拖拽与切换语言不会重载网易云 iframe。外层材质无法修改网易云跨域文档本身。

作者已确认界面并授权发布。浏览统计仍暂不实现，没有新增后台、埋点或追踪请求。前一轮实现记录见 [v2 快照](docs/glass-v2-review.md)，最新材质与截图方法见下文 v3 记录。

联系图片深浅原样沿用 2026-10-26 cloud.xiwu.space 正式站：图片层透明度 .62、饱和度 .9、主题纸色遮罩 .45，不再自行调色；文字和邮箱直接叠图，不加玻璃底托。「再翻一篇」仍在页脚「回到云端」下方、右对齐且不使用玻璃。音乐重复说明收进原生 details「使用帮助」，等待/异常反馈和官方入口保留；官方白色控件不修改，不额外套白框。

最新本地材质验收见 [透色玻璃与连续交互](docs/glass-v3-review.md)。`scripts/glass-v3-evidence.mjs` 生成同位置前后图，`scripts/glass-contrast.mjs` 对真实合成截图中的文字区域采样。证据为开发时本地记录；发布版本以正式站 build-info 和 Actions 校验为准。

作者最新本地审阅调整：联系图片上方的 05 标签、标题和邮箱都直接叠图，仅用轻微文字阴影辅助识别；图片的浅深主题效果恢复正式站原有参数，不再自行调整。「卡片／时间轴」与分类复用同一选中底托逻辑，以 340ms transform 连续移动，文字不动，减少动态时立即定位；保留键盘、aria-pressed、语言/窗口/字体变化重测与不透明回退，工具条内不重复叠加背景模糊。
