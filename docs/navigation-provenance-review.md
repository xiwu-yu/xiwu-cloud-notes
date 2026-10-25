# 构建来源、导航与恢复体验验收

日期：2026-10-25。审查基线 main `e8cfef8f3a07b8a7271f4bf392a671ec16cfc070`。开始时工作区干净，无适用 AGENTS.md；本地原分支 HEAD 虽为 f895493，但与 main 的 Git tree 均为 `824115eb5c7955289e06dd0be5e31c937b5e9226`，不把合并 SHA 的差异当成内容分叉。随后建立 `codex/navigation-provenance-recovery` 分支。

开始时只读核对正式 build-info 与 GitHub main，均为指定 e8cfef8。基线 21 单元、构建、54 E2E 通过，没有复现新的站点阻断或部署错误，没有新增 P0 定性。没有改作者 Markdown、生产基址、DNS、Pages 设置、Actions 权限或任何重定向。用户后续明确授权审查、测试通过后提交并部署；最终发布版本以对应工作流及公开 build-info 为准，本记录不冒充发布证明。

## 本轮选择与实现

| 项目 | 原因、具体文件与最小实现 | 预期和验收 |
| --- | --- | --- |
| P1 来源不实 | `scripts/build-info.mjs` 原先忽略 untracked，且 Boolean(null) 把 Git 失败当干净。改用真 HEAD、仓库根确认、包含 untracked 的 NUL 分隔 Git status；`scripts/build.mjs` 另检查实际构建输入是否被跟踪，避免误 ignore 的文章漏算 | 未 git add 的新文章进入构建时 dirty=true；正常依赖/报告/生成产物继续忽略；Git 失败或无仓库 dirty=null，不冒用父仓库/虚构 SHA |
| P1 契约 | `scripts/verify-site.mjs` 允许本地 SHA/dirty 为 null，正式检查要求 SHA 匹配、来源 Actions、dirty 严格 false；完整 SHA、UTC 构建时间和 siteUrl 含义保留 | 预览不被 unknown 阻断，正式来源拒绝 dirty/unknown；错误构建仍保留最后成功输出 |
| P1 真 Git 回归 | `tests/deployment.test.mjs` 真正 init/add/commit 临时仓库，不再塞假 SHA | 覆盖干净、tracked 修改、untracked 文章/脚本、正常忽略目录、误忽略但参与构建的 Markdown、真 Git index 状态失败、删除 Git 信息、根/项目子路径、失败保护与哈希 |
| P2-A 静态首页声明 | **选择单个中文静态首页**；`scripts/static.mjs` 移除查询参数 hreflang，不新增语言子目录/SSR。`verify-site` 检查原始 lang、中文 h1、原始 title/OG、无虚假静态入口 | ?lang= 继续作为四语言 JS 增强，无 JS 首页原文与 OG 都为中文。既有文章语言路径、真实正文、canonical/hreflang、分享与新标签阅读不改；不声称完成多语言首页 SEO 或索引排名修复 |
| P2-B 全宽与轻盈导航 | `dist/index.html` 拆为 `.site-header > .site-header-inner.wrap`；`style.css` 外层 sticky/背景/细边线，内层 flex/网格对齐。桌面主体 76px、实际含边线 77px，移动/放大文本可换行；实色回退及支持时毛玻璃 | 320/375/768/1024/1440px × 四语言双主题检查外层覆盖视口、内层与正文对齐、无横向溢出、40px 控件热区及锚点可见；200% 导航文本放大不裁切 |
| P2-B 2 秒闲置 | `dist/navigation.js` 集中 `IDLE_HIDE_MS=2000`；`style.css` 200ms 退出；`navigation.spec` 和 `navigation-evidence` 同步新规则。保留原来刷新流程独立的 2000ms 兜底 | 离顶后 1900ms 可见、2000ms 开始隐藏，另测 200ms 动画结束与布局占位不变；上/下滚立即恢复，页首常显；hover/focus/选择器/刷新、后台返回、Tab、减少动态及真实刷新均有回归 |
| P2-B 音乐避让 | 仅 `style.css` 的音乐 max-height 改为跟随外层 `--header-height`，保持原生 iframe 尺寸；ResizeObserver 仍测外层实际高度 | 矮桌面、200% 字体下不覆盖导航，滚动可达上下内容，关闭/备用入口留在外层；未重建 iframe，桌面限定及移动零请求策略保留 |
| Safari 视觉发现 | 真实桌面 Safari 中主题切换的 nav 颜色过渡留下旧色，截图可见小字不清楚；独立 WebKit 计算颜色也在过渡开始时为旧色。显式使用主题文字色，文字即时更新，保留 160ms 背景/下划线反馈 | Safari 最终深色滚动截图文字清晰；自动化每次切主题后立即断言导航文字色，不靠等待掩盖瞬时不可读 |
| P3 真实 404 | `scripts/static.mjs` 构建四语言、主题一致的恢复页；`build.mjs` 纳入受保护输出；`serve.mjs` 返回该 HTML 且状态 404；`preview.mjs` 复用同一服务 | 未知深路径及旧项目路径返回 404，不统一回首页 200。链接、CSS/JS 从站点根路径开始；noindex、不入 sitemap；禁用 JS 也可从目录读静态文章 |
| P3 分享图片 | `scripts/share-cover.mjs` 用自有 cloudscape.svg、系统字体生成提交的 `dist/assets/share-cover.png`；`static.mjs` 输出 PNG 类型/1200×630/四语言 alt/内容哈希 | 正常构建无需浏览器，不改正文配图。验证真实 PNG 头/尺寸、MIME、OG 和同源引用；不据此推断任意社交平台一定成功/失败 |
| 回归与说明 | `tests/e2e/recovery.spec.mjs`、`navigation.spec.mjs`、`music.spec.mjs`、`playwright.config.mjs`、`tests/content.test.mjs`、README 与本记录 | 原文、四语言、归档/搜索、弹窗/静态阅读/主题、缺译、无 JS、哈希和发布门槛保留 |

音乐布局测试首次出现跨帧矩形比较：host load 文案变长改变面板高度，测试连续读取了更新前后的坐标。固定在已收到文档状态后测量；另有慢网/loading 状态专项。没有把这项测量竞态当新站点阻断，也没有改 iframe 生命周期。

## 验证结果与证据

- 基线：21 单元、构建、54 Chromium E2E 通过。
- 最终本地：`pnpm test` **22/22**；`pnpm build` 通过；`node scripts/verify-site.mjs --local dist` 通过，当前 13 个索引页面 / 14 个引用资源，另验证 noindex 恢复页。
- `pnpm test:e2e` Chromium **59/59**；`PW_BROWSER=webkit pnpm test:e2e tests/e2e/music.spec.mjs tests/e2e/navigation.spec.mjs tests/e2e/recovery.spec.mjs tests/e2e/content-smoke.spec.mjs` **39/39**。
- 真实 macOS Safari：新开本地测试标签，复查通栏背景、浅/深主题、滚动 sticky/资源锚点、原生语言菜单展开与选择 English；最后修正后的实际截图已人工查看。完成后关闭本轮测试标签，未修改 Safari 设置。
- 精确 1900/2000ms 和动画阶段由 Playwright 时钟检查，Safari 原生 UI 不以肉眼估秒替代时钟；WebKit 移动配置是模拟，**不是 iPhone/iPad 真机**。
- 截图/日志继续进入忽略目录与 Actions Artifacts，不把大量二进制证据加入 Git。CI 已有成功/失败均保留的 `review-evidence-<SHA>`（14 天），没有扩大权限。

本地证据位于 `work/next-review/`：

| 对比 | 基线文件（before/smart-navigation） | 本轮文件（after/smart-navigation） |
| --- | --- | --- |
| 桌面浅色 | home-1440-zh-CN-light.png | home-1440-zh-CN-light.png |
| 桌面深色 | home-1440-en-dark.png | home-1440-en-dark.png |
| 窄屏 | home-320-en-light.png / home-375-ja-dark.png | 同名 |
| 滚动显示态 | anchor-1440-en-dark.png | 同名 |
| 闲置前后 | nav-idle-4s.png / nav-idle-5s.png（旧基线） | nav-idle-1.9s.png / nav-idle-2s.png（新规则） |
| 放大/恢复页 | 未有 | navigation-text-200-percent.png / recovery-404.png |

真实 Safari 截图另在 `work/next-review/safari-desktop-light.png`、`safari-native-language-menu.png` 和 `safari-final-dark.png`；浏览器自身的标签栏含用户其他标签，因此只作本地证据，不上传第三方。CI 截图只含测试站点。

资源体积原始字节 / 离线 gzip（基线 → 本轮）：index.html 19,540 / 6,444 → 19,440 / 6,465；style.css 39,145 / 9,259 → 39,846 / 9,434；navigation.js 6,031 / 2,293 → 6,070 / 2,309；profile.js 188,959 / 44,488 → 190,343 / 44,904。新增 404 为 4,263 / 1,691；共享 OG PNG 为 374,251 / 357,201。完整值见本轮 `resources.json`，新页面/图片只在恢复或分享抓取时使用。依赖/锁文件无变化；motion.js/motion.css 未变，没有远程字体、动画库或额外运行时框架。新的 OG PNG 不被首页正文引用，正常首屏不会为它新增图片请求；404 仅在访问缺失路径时加载。测量不代表 CDN 压缩实测或 Lighthouse 分数。

## 边界

- 首页未实现真正的四份静态译本。无 JS 首页查询语言仍显示中文，已去掉相悖声明；需要英文/日文静态分享请使用既有独立文章语言页。
- 未使用 Search Console 或社交平台账号执行发布/缓存清理；索引排名、平台预览缓存和实际抓取结果仍待验证。PNG/MIME 检查不等于平台预览承诺。
- 未验证真实 iPhone/iPad 工具栏、安全区和移动 Safari。网易云真实播放/暂停/切歌、版权/VIP/地区限制、收起续播仍待人工音频验证；iframe load 不表示可播。
- Git 状态失败保持 unknown；本地允许预览，正式校验拒绝。元数据说明来源和脏状态，并非密码学签名或防恶意篡改机制。
- 发布遵循 PR 验证通过再合并 main、main 验证成功后部署、发布后核对实际 main 完整 SHA；不修改 DNS、生产基址、Pages 配置或权限。发布后检查失败会保留报告，不自动回滚已部署文件。
