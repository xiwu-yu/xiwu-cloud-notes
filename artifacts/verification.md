# 本轮修复与验证证据

本地完成于 2026-10-25（Asia/Shanghai）。仓库：`xiwu-yu/xiwu-cloud-notes`。起点为 `main` / `origin/main` 的 `2017559`，工作分支为 `codex/evidence-based-improvements`。第一轮工作保留在本地；2026-10-25 获准推送后，补齐了默认静态分享入口。提交内容包含全部构建辅助脚本和固定测试数据，部署结果见 [GitHub Actions](https://github.com/xiwu-yu/xiwu-cloud-notes/actions/workflows/pages.yml)。仓库和上级目录没有适用的 `AGENTS.md`。

## 基线与问题原因

基线先运行了 14 个单元测试、8 个 E2E 和构建，全部通过；它们未覆盖以下问题。

| 范围 | 基线证据 | 本轮处理 |
| --- | --- | --- |
| 分享语言 | `requestedLocale` 本来已正确优先采用明确 URL 语言；但 `writeUrl` 删除默认语言，`syncFromUrl` 在缺少参数时保留当前语言，复制直接使用地址 | 保留原有 URL 优先级，所有新文章地址明确含 `lang`；旧无语言文章链接固定中文；历史、刷新、翻页一致，复制按钮默认使用实际正文语言的独立静态页 |
| 真实复现 | 中文分享得到 `/?post=xiwu`，保存英文偏好后打开得到 `Evening Mist` | [原版实际复现记录](before/share-reproduction.json)，新增明确中文对抗英文偏好的回归 |
| 公共元数据 | 仅检查译文 `order`，未约束日期和配图 | `publishedAt`、`writtenAt`、`order`、`image` 构建校验；报错含原文/译文文件、字段、冲突值 |
| 更新时间 | 各译文已有独立字段，但规则未明确 | `updatedAt` 独立维护，默认上传时间且不得早于上传；静态元数据/sitemap 使用对应版本值 |
| 缺译 | 已有 `fallback` 和 `lang` 数据，却未显示提示；阅读时长按界面语言 | 本地化提示、正文实际 `lang`/字体、按实际正文语言计算；继续共用搜索与筛选模型 |
| 日常写作测试 | 交互测试锁定三篇真实文章的 id、标题、篇数和顺序；工作流仅 main 单元测试/构建 | 固定测试文章 + 动态真实内容冒烟；PR/main 完整验证，成功才部署 |
| 静态阅读 | 首页空列表靠脚本生成，`noscript` 只要求启用脚本；没有独立静态正文/文章元数据/sitemap | 12 份实际语言静态正文、真实链接、常驻静态目录、构建时元数据、含项目子路径的 sitemap |
| 数据与样式 | 默认文章在顶层重复，纯文本还有 `body` 别名；CSS 累积覆盖、窄屏导航隐藏 | 去掉无消费者的重复字段，保留 `text` 全文搜索和 `bodyHtml` 阅读；组件整理、去重并恢复移动导航 |

原有同语言重复 id 拒绝、Markdown 安全处理、缺译回退、资源哈希和内容错误保护已有基础，本轮保留并扩展验证。`content/posts/`、`content/site.json` 和所有插画/头像/配图均没有改动。

## 修改文件

| 文件 | 实际改动 |
| --- | --- |
| `dist/script.js` | URL 语言确定性、历史同步、复制链接、缺译提示/正文语言/阅读时长、真实文章链接、切换后焦点恢复 |
| `dist/index.html` | 静态目录构建插槽、独立文章入口、缺译状态节点；资源版本由构建更新 |
| `dist/style.css` | 按组件排列并合并重复选择器/断点，删除无用装饰类；窄屏导航第二行、正文对比度/实际语言字形、静态页及系统主题 |
| `content/ui.json` | 四种语言的缺译提示及独立文章页标签 |
| `scripts/content.mjs` | 文章文件来源、公共字段一致性、具体重复 id/孤立译文错误，拒绝不存在的 24 点时间 |
| `scripts/build.mjs` | 删除数据重复，临时目录完成生成后替换成功输出，删除过时静态文章页 |
| `scripts/static.mjs`（新增） | 静态正文、title/description/canonical/OG、语言导航/hreflang、目录、sitemap/robots 和统一项目基址 |
| `scripts/serve.mjs` | 可复用服务、项目子路径与静态文章路径、XML/TXT MIME |
| `scripts/e2e-serve.mjs`（新增） | 在隔离目录构建并提供固定测试文章，不写入真实文章 |
| `scripts/evidence.mjs`、`scripts/compare-styles.mjs`（新增） | 资源/截图采集；32 组主要组件计算样式对比 |
| `tests/content.test.mjs` | 公共日期/顺序/图片、缺译、孤立译文、重复 id、独立更新时间、新增/删除和完整成功输出保护 |
| `tests/fixtures/posts/*.md`（新增 9 份） | 两篇四语言文章与一篇无译文长文，覆盖不同日期、分类、正文搜索与 Markdown |
| `tests/e2e/site.spec.mjs`、`helpers.mjs`、`content-smoke.spec.mjs` | 固定交互测试、错误收集、动态真实内容检查；脚本失败/无脚本阅读和焦点/布局矩阵 |
| `playwright.config.mjs` | 锁定 Chromium，真实/固定内容双服务，HTML 报告、失败截图与 trace |
| `.github/workflows/pages.yml` | PR/main 验证，安装浏览器/系统依赖、成功门禁、失败诊断；发布权限只在部署作业 |
| `.gitignore` | 隔离测试目录、临时构建、自动生成静态文件与分析用原始快照 |
| `README.md`、`学习与修改指南.md` | 与实际语言、写作规则、静态输出、缓存兼容及验证方式同步 |

## 验证结果

- `pnpm test`：**17/17 通过**。[完整记录](unit-tests.txt)
- `pnpm build`：**通过**，三篇原文、四种语言，生成 12 个独立文章页。[记录](build.txt)
- `pnpm test:e2e`：**15/15 通过**，使用 Playwright 1.64.1 配套 Chromium 156.0.8078.4。报告留在仓库的 `playwright-report/index.html`（忽略提交）。
- 额外临时加入第四篇合法、无译文文章，再运行原样 E2E：**14/14 通过**；测试后已删除临时文章并恢复三篇构建。没有改动任何测试篇数/标题/排序预期。
- 320、375、768、1440px × 简体、繁体、英文、日文 × 深浅主题：首页、导航、弹窗、静态阅读检查通过；正常阅读流程无横向溢出、控制台错误或资源加载失败。
- 真实文章全部四语言/双主题逐篇打开；头像与联系区移动/桌面布局检查通过。故意中断 `profile.js` 或 `script.js` 请求的独立测试确认目录仍可阅读；这些中断是测试注入。
- 中文显式分享覆盖英文偏好、旧链接、刷新、切换语言、翻页、关闭、后退/前进、切换后焦点恢复均通过。复制静态地址覆盖四种语言，保留 GitHub Pages 子路径、无查询/片段、实际静态正文与 OG 元数据、缺译时复制原文，以及剪贴板失败的手动复制地址；复制不会改变当前阅读地址。
- 公共日期错误、缺失译文、孤立译文、重复 id、删除译文/文章、构建幂等，以及失败保留全部 `dist` 输出均通过。
- 对相同当前 DOM 分别使用 `2017559` CSS 和当前 CSS，比较 32 组主要组件计算样式；差异仅为主动恢复的窄屏页头/导航，其余采集组件没有非预期差异。[详细数据](style-comparison.json)
- 工作流 YAML 已解析检查 PR/main 触发、浏览器依赖、`needs: validate`、main 条件、失败报告与权限范围。配置依据 [Playwright CI 文档](https://playwright.dev/docs/ci) 和 [GitHub Pages 工作流文档](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。云端执行和部署状态见主分支工作流。

## 前后资源体积

字节单位。Chrome、1440×900、新建浏览器上下文、冷加载、本地 `Cache-Control: no-store` HTTP。gzip 是 `gzipSync` 的离线估算，本地服务未启用传输压缩，不能据此宣称线上 CDN 的实际压缩比。首屏子资源含浏览器在初始视口自动发起的懒加载请求，包含图片，不含 HTML 导航本身；HTML 大小单列。截图前才强制加载下方配图，未计入首屏测量。

| 文件 | 原始字节：前 → 后 | gzip：前 → 后 | gzip 变化 |
| --- | ---: | ---: | ---: |
| `profile.js` | 315,634 → 184,432 | 54,849 → 42,983 | -21.6% |
| `style.css` | 29,088 → 31,877 | 8,080 → 7,376 | -8.7% |
| `script.js` | 19,984 → 21,124 | 5,957 → 6,259 | +5.1% |
| `archive.js` | 2,645 → 2,645 | 1,171 → 1,171 | +0.0% |
| `index.html` | 13,506 → 15,236 | 4,735 → 5,272 | +11.3% |

首屏子资源传输合计：**516,969 → 389,696 字节（-24.6%）**。[修复前原始数据](before/resources.json) · [修复后原始数据](after/resources.json)

`profile.js` 原始体积下降 41.6%，gzip 下降 21.6%。没有按语言拆请求；四语言切换继续在已加载数据中完成。旧运行脚本本来使用 `localized`，正文优先 `bodyHtml` / `text`；删除顶层默认副本和 `body` 不影响这些消费者。哈希仍随内容变化更新，全文搜索保留。

CSS 原始体积因分行整理、恢复导航及静态页样式有所增加，gzip 下降 8.7%；HTML 增加来自可直接访问的静态目录。未引入新依赖或框架。

## 主要截图

所有截图均在原有真实文章和配图下采集，截图前等待配图解码。前后页面来自同一 `2017559` 内容；对比图不是模拟稿。

| 页面 | 修复前 | 修复后 |
| --- | --- | --- |
| 首页 320px | [截图](before/home-320.png) | [截图](after/home-320.png) |
| 首页 375px | [截图](before/home-375.png) | [截图](after/home-375.png) |
| 首页 768px | [截图](before/home-768.png) | [截图](after/home-768.png) |
| 首页 1440px | [截图](before/home-1440.png) | [截图](after/home-1440.png) |
| 阅读 320px | [截图](before/reading-320.png) | [截图](after/reading-320.png) |
| 阅读 375px | [截图](before/reading-375.png) | [截图](after/reading-375.png) |
| 阅读 768px | [截图](before/reading-768.png) | [截图](after/reading-768.png) |
| 阅读 1440px | [截图](before/reading-1440.png) | [截图](after/reading-1440.png) |
| 英文深色首页 | [截图](before/home-en-dark.png) | [截图](after/home-en-dark.png) |

新增：[日文深色移动首页](after/home-ja-dark-375.png) · [繁体平板首页](after/home-zh-TW-light-768.png) · [英文静态页浅色](after/static-en-light-1440.png) · [英文静态页深色](after/static-en-dark-1440.png) · [320px 日文静态页深色](after/static-ja-dark-320.png)

## 实际限制

- 本地测试使用 macOS 配套 Chromium；GitHub Linux 验证和部署由 main 工作流执行，运行结果见上方 GitHub Actions 链接。
- 旧查询参数链接继续依赖浏览器脚本定位弹窗，分享爬虫可能仍得到首页预览。独立文章页提供真正静态的文章元数据与正文；复制按钮现已默认使用该链接。未对社交平台抓取缓存或 SVG 配图的实际展示做线上测试。
- 数据仍一次包含四语言，今后内容增长会增大文件；本轮根据实测删除重复，没有新增按语言请求的缓存/失败复杂度。
