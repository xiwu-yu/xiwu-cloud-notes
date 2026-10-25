# 晨雾云笺：本地修正与验收

历史证据说明：批量截图、日志和补丁已移出 Git 跟踪；本机备份位于 `work/pr-evidence-before-cleanup/`。CI 重新生成的截图、报告和日志统一保存为 `review-evidence-<SHA>` Actions Artifact，保留 14 天；以下文件名相对于对应的 Artifact 目录。记录中的测试数字属于当时版本，最新结果见 `docs/domain-migration-review.md`。

2026-10-25。本轮基线 `d85949d33a488c564b8ff880a19f94748c8598c7`，分支 `codex/evidence-based-improvements`。开始时工作区干净，仓库及祖先目录未发现适用的 AGENTS.md。本轮未提交、推送、部署或修改作者文章。已上线的语言 URL、静态分享、元数据校验、缺译、静态阅读、资源哈希和移动导航沿用原实现。

## 1. 功能修正

基线 `pnpm build`、19 项单元测试、28 项 E2E 均通过，没有新增 P0 定性。矮桌面是原测试遗漏的布局问题，使用标明的外部文档 fixture 独立复现，不依赖网易云网络。

| 问题与原因 | 实施文件与方法 | 验收结果 |
| --- | --- | --- |
| 1440×360 三列网格的行最小尺寸与垂直居中导致 iframe 顶部越界，外层 overflow 截断 | `dist/style.css` 去掉 1200px 三列网格，改为 400px 右下角抽屉、`min-height:0` 和可收缩滚动视口，iframe 保持 330×450。另留传统滚动条宽度 | iframe 顶部和底部均可滚动到达；外层关闭、收起、官方入口均可点；面板不覆盖页头 |
| 没有宿主等待反馈，无法区分等待与可播 | `scripts/music.mjs`、`dist/script.js`、`content/ui.json`：首次展开才设 src，四语言即时等待、10 秒长等待说明、load 后一般使用说明 | 慢网、失败备用入口、语言切换通过。load 只用于宿主文案，错误文档也可能触发，绝不据此声称播放成功 |
| iframe 内 Esc 不冒泡 | 视口可键盘滚动、播放器后提供 Tab 可达的官方入口与收起按钮，保留外层关闭 | iframe 内 Esc 保持展开；Tab 离开 fixture 后可收起并归还焦点。没有透明覆盖层或假五键 |
| 非触屏桌面以外不应有音乐 | 保留 UA 移除与媒体查询策略，补齐触屏/无指针样式屏蔽 | 手机、平板、桌面触屏没有可见音乐入口、第三方音乐请求或页脚留白；桌面缩为禁用布局会清除 src，恢复后收起 |

真实配置仍为 `content/site.json` 的 `18522359099`，官方 HTTPS `type=0&auto=0&height=430`，没有解析、代理或 VIP 绕过。默认收起；矮桌面展开时暂时隐藏原切换按钮，外层两处收起操作保留。节点、src 和 contentWindow 在同页折叠、语言、主题、搜索、分类/月筛选、阅读弹窗过程保持稳定；进入禁用布局是有意卸载的例外。整页导航会离开当前播放器，不能跨页续播。

### 1440×360 实测

| 指标 | 基线 | 本轮 |
| --- | ---: | ---: |
| panel 宽度 | 1200px | 400px |
| panel clientHeight / scrollHeight | 262 / 390 | 222 / 222 |
| iframe 顶部 y | −38.5px | 219.59px |
| iframe 视口可滚动距离 | 0px | 386px |

[基线几何与资源](before/measurements.json) · [本轮几何与资源](after/measurements.json)。iframe 的实际底边可以超出视口，这是保留原生尺寸的滚动内容；外层控件固定留在滚动区外。最矮场景可视区域较小，需要滚动，不承诺同时显示全部播放器。

## 2. 视觉与可读性

`dist/style.css` 使用暖白、浅蓝、樱花粉和深蓝灰夜色，区分文字/链接与装饰色；辅助文字最低 12px，主要正文 15–16px、行高 1.95。卡片移动单列、桌面多列，统一边框、圆角、留白和入口层级；整块仍是真实文章链接。导航有轻量毛玻璃与实色回退、悬停下划线和清楚焦点，没有改为吸顶，保留移动第二行。插画 `data-i18n-alt` 与 `hero.artAlt` 提供四语言描述。

实际背景采样另发现称呼卡固定渐变上的文字约 4.05:1，深色便笺小字最低约 2.98:1；均换成主题背景与文字色。320px 的 21px 正常字重配图标题按普通文字处理，提升夜间前景色；配图章节标记与小链接使用纸色底。

`node scripts/contrast-evidence.mjs` 保存真实合成背景，保留布局、移去墨色，仅采样 Range 指定的文字区域，排除圆角外部和无文字内边距；并按前景色计算相对亮度。覆盖 320/375/1440px × 双主题 × 13 个区域共 **78 个样本，全部达标**：普通文字最低 **4.623:1**，24px 及以上正常字重大字最低 **3.755:1**。最终数据（Artifacts: `contrast/results.json`） · 中间核查的旧固定背景问题（Artifacts: `contrast/before-surface-fix.json`）。E2E 另对纸面、组件底色及云色混合的保守上界做 token 校验。采样是选定区域的证据，不等于全站 WCAG 认证。

`reading.js`、`scripts/static.mjs` 和文章 Markdown 没有修改；真实静态正文、canonical / OG / hreflang、项目子路径、无 JS 与原有分享 URL 的回归继续通过。

## 3. 轻量动效

新增 `dist/motion.js` / `motion.css`：云层 30/36 秒、最多 12px 水平与 8px 垂直位移（合成位移约 14.4px）；卡片一次进入 280ms / 8px，悬停抬升 2px / 160ms，dialog 与音乐面板进入 180ms。只使用 transform / opacity，不持续动画 blur/filter、渐变或正文，不新增星点框架和大资源。

卡片默认可见，IntersectionObserver 仅在进入时加动画；同页记录文章 id，筛选、语言切换不重复进入。云层由可见性与文档隐藏事件暂停，没有 rAF 循环。CSS 与 JS 均响应减少动态偏好；缺失动效脚本仍能阅读，静态文章不加载这两份增强。没有新增阅读进度条。

## 4. CI 与部署边界

仅迁移三个经官方文件核对的 action：

- [upload-artifact v6：node24](https://github.com/actions/upload-artifact/blob/v6/action.yml)。
- [upload-pages-artifact v5：内部使用 v7.0.0](https://github.com/actions/upload-pages-artifact/blob/v5/action.yml)，[内部上传器为 node24](https://github.com/actions/upload-artifact/blob/v7.0.0/action.yml)。
- [deploy-pages v5.0.1：node24](https://github.com/actions/deploy-pages/blob/v5.0.1/action.yml)。

PR 仅验证；main 仍需 validate 成功后才能部署。顶层仅 contents:read，pages:write / id-token:write 仍只给 deploy。浏览器及系统依赖安装、失败报告和 trace 保留 14 天未取消。没有设置强制运行时环境变量或屏蔽弃用警告。**未触发远端 Actions，云端执行未验证。**

## 5. 最终验证

| 验证 | 结果与证据 |
| --- | --- |
| `pnpm test` | **19/19**，日志（Artifacts: `unit-tests.log`）：日期、重复 id、缺译、共享字段、Markdown 安全、最后一次成功构建保护 |
| `pnpm build` | **通过**，日志（Artifacts: `build.log`）：3 篇原文、4 语言；12 份实际静态文章页 |
| `pnpm test:e2e` | **39/39**，日志（Artifacts: `e2e.log`），Chromium 156.0.8078.4 |
| 隔离副本新增合法文章 | **2/2 内容冒烟**，日志（Artifacts: `new-article.log`） / 机器报告（Artifacts: `new-article-results.json`）。复制真实内容后仅临时加入第四篇无译文文章，重建 4 篇/13 静态页，复用原内容冒烟，无需改交互测试数量、标题或顺序；没有写进作者目录 |
| 实际背景对比度 | **78/78**，样本（Artifacts: `contrast/results.json`）；普通文字 ≥4.5，大字 ≥3 |
| 差异检查 | `git diff --check` 通过；package.json、锁文件、作者文章和 site.json 未改；沿用已安装依赖，不需要重装 |

浏览器覆盖 320/375/768/1440px、1440×360 / 1280×480 / 768×400 矮桌面、四语言、双主题、键盘、减少动态、无 JS、脚本/数据/播放器失败、语言偏好冲突、焦点归还、iframe 生命周期和慢网。正常路径检查控制台错误、失败请求、HTTP≥400 和横向溢出；故障注入用例独立上下文处理预期失败。宿主 mock 不代表真实网易云文档或音频可用。

200% 覆盖为 **等效 CSS 布局**：物理 2560×960 / 2 ⇒ 1280×480 CSS px，物理 1440×900 / 2 ⇒ 720×450 CSS px、DPR 2；后者按现有小屏策略禁用音乐。不是原生工具栏缩放或真机 Safari 测试。测试环境保留了原有 NO_COLOR / FORCE_COLOR 的运行器提示，它不属于浏览器控制台错误，没有通过改环境变量隐藏。

## 6. 资源与依赖

| 文件 | 前 原始 / gzip B | 后 原始 / gzip B |
| --- | ---: | ---: |
| `index.html` | 17,395 / 5,977 | 18,002 / 6,132 |
| `profile.js` | 186,586 / 43,573 | 188,553 / 44,316 |
| `style.css` | 36,476 / 8,666 | 37,900 / 8,964 |
| `script.js` | 24,813 / 7,304 | 25,605 / 7,544 |
| `archive.js` | 2,637 / 1,168 | 2,637 / 1,168 |
| `motion.js` | — | 1,637 / 760 |
| `motion.css` | — | 1,613 / 633 |

新增动效 JS + CSS 合计 **3,250 B 原始 / 1,393 B gzip（1.36 KiB）**，低于建议的 10 KiB。未新增依赖、远程字体或配图，原图尺寸与文件未改。`profile.js` 体积增加来自四语言插画描述和宿主说明，仍由构建生成，没有手工修改或删掉全文搜索数据。

1440×900 冷加载、未展开音乐的首屏子资源传输 **399,475 → 407,508 B（+8,033 B，约 +2.0%）**。包括浏览器首屏阶段预取的邻近懒加载图片，资源集合一致，另新增两份动效请求；不含主 HTML。测量使用本地无压缩 HTTP，gzip 是离线计算，不是 GitHub Pages CDN 传输或 Lighthouse 分数，不据此声称低端设备帧率。

## 7. 关键截图

音乐截图中的 HOST FIXTURE 明确表示宿主布局测试文档，**不是网易云真实播放截图**。同条件重新从基线的隔离副本生成对照图，不回滚当前工作区。

| 页面 | 修改前 | 修改后 |
| --- | --- | --- |
| 首页 1440 / 中文 / 浅色 | 完整图（Artifacts: `before/home-1440-zh-CN-light.png`） | 完整图（Artifacts: `after/home-1440-zh-CN-light.png`） |
| 首页 375 / 日文 / 深色 | 完整图（Artifacts: `before/home-375-ja-dark.png`） | 完整图（Artifacts: `after/home-375-ja-dark.png`） · 首屏（Artifacts: `after/viewport-375-ja-dark.png`） |
| 首页 320 / 英文 / 浅色 | 完整图（Artifacts: `before/home-320-en-light.png`） | 完整图（Artifacts: `after/home-320-en-light.png`） |
| 首页 768 / 繁中 / 浅色 | 完整图（Artifacts: `before/home-768-zh-TW-light.png`） | 完整图（Artifacts: `after/home-768-zh-TW-light.png`） |
| 文章卡片 | 图（Artifacts: `before/cards-desktop.png`） | 图（Artifacts: `after/cards-desktop.png`） |
| 静态文章 | 图（Artifacts: `before/static-reading.png`） | 浅色（Artifacts: `after/static-reading.png`） · 深色（Artifacts: `after/static-reading-dark.png`） |
| 1440×360 播放器顶部 | 裁切图（Artifacts: `before/music-short-top.png`） | 顶部可达（Artifacts: `after/music-short-top.png`） |
| 1440×360 播放器底部 | 无法滚动到底（Artifacts: `before/music-short-bottom.png`） | 底部可达，外框入口仍在（Artifacts: `after/music-short-bottom.png`） |
| 常规桌面音乐外框 | — | 1440×900 深色（Artifacts: `after/music-desktop.png`） |

## 8. 文件与 diff

可审查代码补丁（Artifacts: `changes.patch`） 包含运行时代码、测试、工作流、README 和取证脚本；本目录证据另阅，不包含二进制截图；补丁采用零上下文避免把补丁的空白上下文误报为源码空白问题，应用到基线时使用 `git apply --unidiff-zero`。源码改动也可在 GitHub PR 中查看。

- `scripts/music.mjs`、`dist/script.js`：宿主等待状态、无侵入的 iframe 生命周期和键盘收起入口。
- `dist/style.css`：抽屉/矮屏/传统滚动条、主题对比度、字号、导航和卡片；整理因字号提升而相同的覆盖规则。
- `dist/index.html`、`content/ui.json`：四语言 alt、宿主文案、构建后的音乐标记与资源哈希。
- 新增 `dist/motion.js` / `motion.css`：可失败、可减少动态的轻量增强。
- `.github/workflows/pages.yml`：官方 Node 24 action 升级，保持权限及验证依赖。
- `tests/e2e/music.spec.mjs` / `site.spec.mjs`：新增 11 项用例及矮桌面/传统滚动条断言；将静态页固定 RGB 夜色断言改为深色 scheme 与背景检查，保留正文和偏好回归。
- `README.md` 与新增 `scripts/morning-mist-evidence.mjs` / `contrast-evidence.mjs`：实际行为、边界和可复现证据；本目录保存日志、样本、截图与测量。

## 9. 人工真实播放记录与限制

本轮无真实音频、真机或 Safari 播放验证。下面是明确的待验清单，未用 Chromium 的 iPhone/iPad UA、mock 或 WebKit 冒充真机 Safari：

| 项目 | 本轮状态 | 人工验收方法 |
| --- | --- | --- |
| 网易云真实播放 / 暂停 | 未验证 | 桌面打开官方播放器，主动播放、暂停并听音，记录系统、浏览器和网络地区 |
| 真实切歌 / 权限曲目 | 未验证 | 使用原生控件切换歌单曲目，记录 VIP、地区或版权限制；不绕过限制 |
| 真实折叠续播 | 未验证 | 播放中反复折叠/展开，再切语言/主题、筛选和阅读弹窗，听音确认；自动化只证明节点、src、contentWindow 稳定 |
| 官方 iframe 内 Tab / Esc | 原生文档未验证 | 检查真实控件可否 Tab 离开，外层关闭始终可点；iframe 内 Esc 不承诺由父页捕获 |
| macOS Safari / 真机 iOS | 未验证 | Safari 验证官方桌面播放及矮窗口；iOS/iPadOS 验证音乐完全不出现、无外部请求 |
| 原生工具栏 200% 缩放 | 未验证 | 已做等效布局；仍需 Chrome/Safari 工具栏实测与系统滚动条设置复核 |
| GitHub Actions / 部署 | 未运行 | 用户审查后再另行授权提交/推送，观察 validate → deploy；本轮不触发 |

第三方网络、地区、版权与 VIP 权限仍由网易云决定；本站只能提供正确宿主反馈和官方备用入口。无跨页续播、没有为此改写站点架构。
