# 四首歌、移动端与底部播放栏验证（2026-10-25）

基于 `095159d` 修复。用户最终选择“保留网易云原生控件，改成底部播放栏”，并指定只保留四首歌：

1. 使一颗心免于哀伤 — 陈予恩（`2124631325`）
2. 僕が死のうと思ったのは — 鹿乃（`2015021865`）
3. この世界を愛したい — 鹿乃（`2064848159`）
4. 烟雨行舟（原唱：伦桑）— 司南（`1301884692`）

歌曲页面 ID 由网易云公开歌单和歌曲页面核对。音源仍由网易云提供；没有下载、重新托管或解析音频。手机目录在 `content/site.json` 的 `music.tracks`，是显式维护的四首歌曲快照；网易云歌单变化后需同步配置。

## 原因与设计

使用真实 iPhone WebKit 和 Android UA 重现：原外链请求先返回 302，重定向到 `/m/outchain/player` 移动页面。移动页脚本在跨域 iframe 访问父页面时产生 SecurityError，因此原有面板出现整块白屏。[重定向与错误证据](before-redirects.json)。上轮测试只模拟小屏和固定 iframe 响应，没有覆盖服务端针对手机 UA 的实际行为。

新布局在底部展开。桌面仍使用官方 iframe 与原生播放控件，折叠、语言、主题、筛选和阅读弹窗不重建播放器。手机/iPad 使用曲目目录，点击打开网易云官方歌曲页；手机完全不请求出错的 iframe。窄窗口桌面仍可内嵌。手机目录显示和官方音频播放分工明确，不声称手机在本站内播放。

没有添加无法控制跨域音频的自定义五键或随机/循环按钮。播放功能继续由网易云原生控件或官方页面/App 提供。

## 验证

- `pnpm test`：19 项通过，增加目录字段、重复曲目 ID 与注入形式 ID 的校验。
- `pnpm build`：通过；未手改生成的 `dist/profile.js`。
- `pnpm test:e2e`：27 项 Chromium 回归通过。新增 iPhone、Android、iPad 设备 UA 分支，断言曲目列表、四语言、官方歌曲链接、无溢出且第三方 iframe 请求为零；保留桌面生命周期、键盘、故障回退和全站内容测试。
- WebKit：同一组 9 项音乐面板测试全部通过，包含设备 UA 分支。随后四首配置再次通过单元、构建、全量 Chromium 与真实 iPhone WebKit 的四首目录检查。
- 真实设备检查无固定响应：iPhone WebKit 和 Android 均显示目录，零网易云播放器请求、零页面脚本异常；桌面等待真实四首歌渲染后截图，原生控件和曲目显示正常。没有点击播放，未声称验证音频试听。见 [实测记录](real-devices.json)。
- 原有 320、375、768、1440px 以及 568×320 横屏、四语言、深浅主题、关闭与焦点恢复检查继续通过。

## 截图

- [iPhone 浅色](iphone-light.png) · [iPhone 深色](iphone-dark.png)
- [Android 浅色](android-light.png) · [Android 深色](android-dark.png)
- [桌面底部栏浅色](desktop-light.png) · [桌面底部栏深色](desktop-dark.png)

主要修改：`content/site.json`、`content/ui.json`、`scripts/music.mjs`、`dist/index.html`、`dist/script.js`、`dist/style.css`、`tests/music.test.mjs`、`tests/e2e/music.spec.mjs` 和根目录 README。
