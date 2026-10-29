# 随系统主题与3:4文章分享卡片验收

2026-10-30（Asia/Shanghai），作者已审核本地预览并授权提交和发布。审查基线为 `ac1ebc8747198d366c312d4b03f8871acf7c8143`；开发分支为 `codex/system-theme-share-cards`。原用户工作区的未提交内容未覆盖或回滚。

## 最终行为

- 在原「玻璃外观」入口新增主题模式：随系统、浅色、深色。未设置时实时跟随系统，旧手动偏好保留；原明暗按钮继续一键切换，需要时可恢复自动。首页、阅读弹窗、独立文章和跨标签页共用偏好；存储不可用时本页仍可操作，云朵的一次真实刷新保留当前模式。
- 文章底部复制链接右侧新增分享卡片，复制/分享/上一篇/下一篇复用玻璃材质。独立静态文章同样可分享。手机翻页与分享分行，目标至少44px。
- 分享图片为900×1200（3:4）PNG；文字区域左右64px、宽772px，标题66px/行高88px、摘要36px/行高52px。按实际行数排版，云朵只占摘要和页脚间的空间。保留作者标题/摘要、日期、实际正文语言和静态地址，长文本换行并按行数省略，避免标点孤立成行。
- 图片在本机生成，预览与下载同一PNG，不上传文章或请求外部制图服务。只有支持文件分享时才显示系统分享。生成或剪贴板失败仍提供真实链接。
- 原生分享子dialog位于当前阅读dialog内；Esc只关闭子面板并恢复焦点，退出阅读也关闭分享，关闭时释放对象URL。200%文字及长URL可以换行。
- 五种夜间文章封面只移除弯月后方独立圆形光晕。弯月蒙版、云朵及浅色图、主插画和联系区图片不变。静态OG仍为1200×630，分享图片不替换其元数据。

## 文件

- `dist/reading.js`、`dist/navigation.js`、`scripts/appearance.mjs`：主题状态、旧偏好兼容、跨标签页、刷新与设置入口。
- `dist/sharing.js`、`scripts/sharing.mjs`：本机PNG、真实下载、原生分享、错误回退与焦点。
- `dist/index.html`、`dist/script.js`、`scripts/static.mjs`、`scripts/build.mjs`：两类阅读器接入，构建自动更新内容哈希，不手改profile.js。
- `dist/style.css`、五份夜间云朵SVG、`content/ui.json`：玻璃按钮、响应式预览、光晕修正与四语言文案。
- `tests/sharing.test.mjs`、`tests/deployment.test.mjs`、`tests/content.test.mjs`、`tests/e2e/theme-share.spec.mjs`、`playwright.config.mjs`：转义、静态子路径/哈希、主题与分享回归。
- `scripts/theme-share-evidence.mjs`：可复现截图与资源测量；支持PREVIEW_URL与EVIDENCE_DIR。

## 验证与边界

- 发布前最终复核：`pnpm test`、`pnpm build`、`node scripts/verify-site.mjs --local dist`、`pnpm test:e2e` 顺序执行并通过：31项单元、构建、21页/19资源校验、140项完整Chromium E2E；日志位于忽略目录 `work/theme-share/release/`。
- 3:4版本此前已通过31项单元、构建、21页/19资源校验、Chromium/WebKit各15项主题分享测试。覆盖320/390/768/1440、四语言、双主题、长标题、PNG真实尺寸/下载、存储异常、跨标签页、音乐iframe稳定、历史/焦点、无JS、200%文字和减少动态。全站既有测试另覆盖375/1280和矮窗口。
- 3:4截图：1440/390/320×浅深6组，无文档横向溢出、控制台错误、资源404或加载失败。点击至可下载本机Chromium实测96.4–143.4ms，不代表低端手机性能。没有新增依赖或持续制图循环。
- 本机macOS Safari早期核对过本地分享预览、Esc、手动主题和恢复自动菜单；最终3:4另以WebKit模拟回归。真实iPhone/iPad/安卓保存图片流程未实测，不把窄屏/WebKit当作真机Safari。未向第三方实际发送图片、未改变操作系统主题。
- 点赞测试使用隔离数据，不写入正式票；Cloudflare Worker/D1、域名、DNS、Pages配置与文章正文均未改变。网易云真实播放及歌曲权限不由宿主测试证明。

## 预览与证据

- 本地预览：`http://127.0.0.1:8093/?lang=zh-CN&post=claw-marks`；仅预览副本关闭生产点赞API，仓库真实配置保留。
- 最新截图、真实PNG、测量：`work/theme-share/ratio-3-4/`；早期不同比例属于历史，不代表最终设计。
- 复拍：启动本地预览后运行 `EVIDENCE_DIR=work/theme-share/ratio-3-4 node scripts/theme-share-evidence.mjs`。
- 大量截图、日志及测试输出留在Git忽略目录；CI原有工作流在Actions Artifacts保留浏览器报告和验收证据。合并后沿用validate→deploy→verify-deployment门槛，PR不部署。

首次PR云端验证在原生选择器键盘测试上发现平台差异：Linux Chromium中Enter可打开原生下拉，随后的Esc/Tab先由系统菜单消费，不能假定会立即作用于宿主dialog。测试改用Playwright原生表单接口验证实际选值与主题生效，再分别检查选择器焦点、闭合控件的Tab导航、Esc关闭dialog及焦点恢复。保留全部测试和断言，没有拦截原生事件或改站点功能来迎合测试。
