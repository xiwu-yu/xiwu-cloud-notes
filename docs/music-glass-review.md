# 网易云悬浮音乐栏验收（2026-10-26）

> 本文是第一轮本地验收快照。后续阅读美化将音乐面板改为稳定实色，仅音乐按钮保留玻璃材质，见 [阅读美化验收](glass-reading-review.md)。作者随后授权一并发布，实际发布状态以对应 PR、Actions 及正式站 build-info.json 为准。

本轮按作者最终选择保留网易云可见原生控件，使用既有歌单 `18522359099`。未引入本地 MP3、Spotify、YouTube、自定义播放控制或音频解析。检查基于本地主分支提交 `101405051eb3f55e28fbbbbd2fd4c53bf61eeecf`；以下为本地改动验证，不表示已经发布。

## 功能与原因

- `scripts/music.mjs`：保留桌面官方地址、新增官方 HTTPS 移动地址，仍为 `type=0`、`auto=0`、`height=430`。HTML 只含待加载地址，首次点击才设置 src；加密媒体/播放权限不等于自动播放。
- `dist/script.js`：移除旧的手机/触屏入口禁用逻辑。首次展开按设备选择地址，此后不因窗口尺寸、主题、语言、搜索、筛选、阅读弹窗或折叠而重写 src，也不重建 iframe。收起后焦点返回切换按钮。
- `dist/style.css`：右下角蓝粉白音乐按钮；底部中央圆角矩形，宽至多 420px、常规高度至多 520px，细高光边框、柔和阴影和静态毛玻璃，支持 WebKit 前缀和实色回退、深色模式、安全区及减少动态。保留原生 330×450px 文档，窄屏/矮窗口在内部滚动，不缩放或遮盖原生控件；关闭与备用入口始终在滚动区外。
- `content/ui.json` / `dist/index.html`：四语言说明与生成的播放器 HTML、资源内容哈希更新。`dist/profile.js` 仅由构建生成，未手改。
- `tests/music.test.mjs` / `tests/e2e/music.spec.mjs`：官方地址、按需加载、稳定节点和 contentWindow、键盘、触屏、双主题四语言、内部双向滚动、矮窗口、失败回退、无 JS、缩放等回归。新测试使用 HTTPS 父页并模拟旧入口的 HTTP 重定向，断言手机直接请求 HTTPS 移动入口。
- `tests/e2e/navigation.spec.mjs` / `scripts/morning-mist-evidence.mjs`：官方地址 mock 同时覆盖桌面和移动入口；截图/布局 fixture 不代表真实歌曲播放成功。

### 移动端空白的独立复现

在 Chromium 的 iPhone 设备配置中，用模拟的 `https://cloud.xiwu.space/` 父页加载真实网易云桌面地址，浏览器报 Mixed Content：该地址跳转到 `http://music.163.com/m/outchain/player?...`，被阻止。直接请求官方 `https://music.163.com/m/outchain/player?...` 返回 200，显示封面及四首歌曲。父页仅通过本地路由供给测试 HTML，未改动正式站。

仅设置手机可见并不能解决这个 HTTP 跳转；所以新增移动地址，而且只在首次加载时选择，避免切换视口时中断播放器。

## 验证

- 修改前：`pnpm test` 22 项、`pnpm build`、`pnpm test:e2e` 59 项全部通过。
- 修改后：`pnpm test` 22 项通过，`pnpm build` 通过。
- 全量 Chromium E2E：包含新增 HTTPS 回归，60 项通过。
- 补充 WebKit 音乐测试：18 项通过。属于 Playwright WebKit，不能冒充 iPhone 真机 Safari。
- `scripts/verify-site.mjs --local dist`：13 个页面、14 个资源通过，正式基址、文章元数据和哈希未回归。
- 维护中的 `scripts/morning-mist-evidence.mjs after` 完成，无新增生产依赖。
- 视口 320×568、375×812、768×900、1440×900、568×320、1440×360、1280×480、768×400，以及 200% 等效 CSS 视口，覆盖四语言与双主题。宿主无页面横向溢出；框内原生内容可滚到上下及左右边界，关闭/备用链接可命中。

正常宿主自动化使用明确标识的外部文档 fixture，校验控制台与资源错误；失败场景单独隔离，不掩盖正常流程错误。

### 真实官方文档探测

另用 Chromium、HTTPS 父页和真实网易云官方 iframe 检查桌面及 iPhone 设备配置：四首歌曲可见；通过原生歌曲项点击第二首，官方倒计时推进，收起后仍推进（一次记录：桌面 05:16→05:15，移动配置 05:18→05:17）。没有调用内部播放器或解析接口。这是原生界面观察，不代表全部歌曲、地区、VIP 及系统后台播放均可用，也未做听音验证。

真实网易云脚本出现自身的跨域访问报错（例如 `device__browser_update`）；本站不能修改第三方脚本，未通过代理、放宽权限或屏蔽日志掩盖。真实 Safari、iPhone 音频输出/锁屏/后台、所有歌曲的版权状态仍需人工复核。整页导航仍会离开当前播放器。

## 资源变化

本地文件字节数，gzip 使用 Node zlib 默认设置，不是网络 CDN 压缩或 Lighthouse 分数：

| 文件 | 修改前 bytes / gzip | 修改后 bytes / gzip |
| --- | ---: | ---: |
| index.html | 19,440 / 6,465 | 19,629 / 6,523 |
| style.css | 39,846 / 9,434 | 40,287 / 9,459 |
| script.js | 26,014 / 7,644 | 25,496 / 7,564 |

JS+CSS gzip 合计减少 55 字节；未增加远程字体、插画或动画依赖。外部网易云资源仅首次展开时加载，后续流量由官方文档决定。

## 本地证据与媒体

截图和完整探测 JSON 位于被忽略的 `work/local-audio/review/`：`https-real-desktop.png`、`https-real-mobile.png` 为真实官方控件；`desktop-dark-expanded.png` 等明确使用布局测试文档。HTTPS 跳转对照为 `https-mobile-check.json`，点击/收起观察为 `native-play-check.json`。常规 CI 截图仍通过既有 Actions Artifacts 保存，不将大量图片或日志加入仓库。

三个用户视频已转为 MP3，但最终方案不使用这些音源；文件只在被忽略的 `work/local-audio/`，不在 dist、Git 索引或发布输入。原 MP4 未改动。本轮没有推送、部署或修改 DNS/Pages。
