# 云朵动态与智能导航升级

本地基线：`96eca72`（上轮修复分支），工作区开始时干净，仓库及祖先目录没有适用的 AGENTS.md。先运行基线：19 项单元测试、构建、39 项 E2E 通过。本次复用已有主题、卡片进入、按钮悬停和导航颜色过渡，保留作者原文、搜索/分类/时间轴/弹窗/历史与桌面音乐策略。本轮不合并 main 或部署。

## 实际修改文件

| 文件 | 关键改动 |
| --- | --- |
| `dist/index.html` | 独立云朵按钮与原品牌链接分离；原生表单携带语言；弹窗内增加同一刷新动作；六枚静态星点；引用带内容哈希的 navigation.js |
| `dist/navigation.js`（新增） | 吸顶导航显隐、交互/可见性计时、动态锚点偏移，以及清理路由后真实刷新与一次性滚动恢复 |
| `dist/style.css` | sticky 占位、安全区、260ms 滑出、隐藏时禁用点击、焦点进入即时显示、云朵反馈、弹窗云朵布局 |
| `dist/motion.js` / `motion.css` | 逐层可见性暂停、第三层云、插画漂浮、一次首屏淡入、不同相位和移动简化；沿用卡片机制 |
| `dist/script.js` | 退出阅读时不再跳回文章焦点；刷新瞬间的主题回填；其余路由、偏好机制沿用 |
| `content/ui.json` | 新增 `nav.homeRefresh` 四语言无障碍文案；profile.js 仍仅由构建生成 |
| `tests/e2e/navigation.spec.mjs`（新增） | 14 项专项用例，覆盖计时、交互保持、刷新、动态、偏好、原生回退、五种宽度与四语言双主题 |
| `playwright.config.mjs` | 将导航专项纳入默认验证，支持可选 PW_BROWSER=webkit |
| `scripts/navigation-evidence.mjs`（新增） | 可复现截图、4/5 秒状态及离线资源体积 |
| `README.md` | 同步实际行为、动画参数、刷新边界、无脚本与 WebKit 验证方式 |

文章 Markdown、site.json、音乐生成器、静态文章生成器、reading.js、依赖与锁文件未改。没有引入大型库，没有手改 dist/profile.js；既有资源内容哈希和 `/xiwu-cloud-notes/` 子路径继续由构建维护。

## 动画参数

| 效果 | 参数 |
| --- | --- |
| 云一 / 云二 / 云三 | 30 / 36 / 28 秒，负延迟 −4 / −13 / −9 秒，第二层反向；闭合往返路径，无接缝跳变 |
| 背景位移 | x 在 −7～7px，y 在 2～−3px；只改变 transform |
| 首页插画 | 10 秒，上移最多 7px，再回原位；不改布局尺寸 |
| 首屏标题 / 简介 | 首次进入 380ms / 6px 淡入；简介延迟 60ms，默认内容可见 |
| 卡片 | 保留原 280ms / 8px 一次进入、160ms / 2px 悬停 |
| 导航 / 云朵按钮 | 导航滑动 260ms，颜色过渡沿用 160ms；云朵悬停 1.06、按下 .94 |
| 星点 | 六枚 3px、低透明度静态装饰，不闪烁、不接收点击 |
| 小屏或粗指针 | 云层周期 40 秒，x 幅度缩到 ±3px；第三层云停用，星点三枚，插画 14 秒 / 5px |
| 减少动态 | CSS 与 JS 停止装饰运动和淡入；导航显隐、返回顶部仍可用，立即完成 |

每层云由 IntersectionObserver 独立暂停；插画由首屏可见性暂停，文档隐藏时全部暂停。没有空转 rAF 循环、动画滤镜、粒子框架或假播放状态。

## 导航状态

| 条件 | 行为 |
| --- | --- |
| scrollY ≤ 8px | 保持显示，不启动隐藏计时 |
| 任意方向滚动 | passive 监听中同步唤醒；阴影只通过单个 rAF 更新，重新计时 |
| 离顶后静止 4 秒 | 仍显示 |
| 连续静止达到 5 秒 | 向上滑出；inert / aria-hidden / pointer-events 同时阻止不可见交互 |
| 悬停、焦点、原生选择器操作 | 不隐藏；同时满足焦点和指针均已离开后重新计时 |
| Tab | 先唤醒，保持原生焦点顺序；焦点进入导航时取消滑动，避免焦点停在屏外 |
| 切走标签页 / pagehide | 清掉计时和待执行帧；回来或 pageshow 时重新显示和计时 |
| 无增强脚本 / 主样式失效 | 不自动隐藏；原生链接和表单仍可用 |

CSS sticky 保留原位置，不插入突然出现的占位。ResizeObserver 只在高度变化时写入 `--header-height`，用于 scroll-padding-top，避免语言、宽度变化后的锚点标题被遮挡；无 JS 使用保守默认偏移。桌面英文副标题保留，小屏继续沿用原有隐藏副标题、第二行导航规则。顶部包含 safe-area-inset-top；真机工具栏与刘海见下方未验证事项。

## 云朵回顶与真实刷新

1. 页头云朵是原生表单按钮，品牌文字仍是原来的 `#home` 链接，不拦截普通链接。
2. 发出专用事件让原阅读控制器退出详情，跳过不合时宜的文章焦点回填。原生 modal 会使外部页头不可操作，因此弹窗左上也提供同一四语言云朵动作。
3. 普通模式平滑回顶，检测 scrollend / 短时位置检查；2 秒兜底会立即归零后完成。减少动态直接归零。只在这次动作期间检查，不长期轮询。
4. 构造项目子路径首页，只保留当前 lang，移除 post 和 hash；history.replaceState 写入一次性标记，再调用 `location.reload()`，确实重载文档。
5. 新文档在 head 先消费标记、暂设 scrollRestoration=manual，pageshow 回到 0，随后恢复原来的恢复策略。标记不会再次刷新页面。主题偏好照常保留，存储被阻止时用一次性主题回填保留这次选择。
6. 增强后云朵按钮设为 type=button，独立 click 执行动作；表单 submit 仅取消隐式提交，因此语言选择器原生 Enter 不会触发刷新。
7. 无 JS 或 navigation.js 失败时，通过 GET 表单返回首页，语言选择器由原生 form 属性关联，不依赖隐藏字段同步。

专项测试核对主文档请求数、`PerformanceNavigationTiming.type === 'reload'`、旧 JS 全局消失、卸载前与重载后 scrollY=0、标记消费、原恢复策略恢复；同时验证第二次点击只再发起一次刷新、品牌锚点不会刷新。整页刷新会结束播放器文档，不能跨页续播；普通滚动、语言、筛选、弹窗仍沿用稳定 iframe。

## 验证结果

| 命令 | 实际结果 |
| --- | --- |
| `pnpm test` | 19 / 19，[日志](unit-tests.log) |
| `pnpm build` | 通过，[日志](build.log)，3 篇文章 / 4 语言，12 个真实静态页 |
| `pnpm test:e2e` | Chromium **53 / 53**，[日志](e2e.log)，含原有 39 项及新 14 项 |
| `PW_BROWSER=webkit pnpm test:e2e tests/e2e/navigation.spec.mjs` | Playwright WebKit 引擎 **14 / 14**，[日志](webkit.log)，不是 Safari 真机 |
| `node scripts/navigation-evidence.mjs` | 截图与资源记录完成；4 秒未隐藏 / 5 秒隐藏，正常路径无控制台错误、资源失败或 HTTP≥400，[数据](measurements.json) |
| 差异检查 | `git diff --check` 通过，作者文章和依赖无变化 |

默认测试覆盖 320/375/768/1024/1440px、四语言双主题、悬停、焦点、原生语言选择器、可见性切换、无 JS、缺少 navigation.js、减少动态、两种动效偏好的真实刷新、存储失败、锚点和原有历史/阅读回归。原音乐 17 项验证继续通过，包括移动/平板/桌面触屏不显示和不请求音乐、稳定节点、矮桌面和备用入口。计时使用可控时钟；标签可见性事件为宿主状态测试，不伪装真机测试。

开发中修正了滚动唤醒等待 rAF 的延迟，以及原生选择器 Enter 隐式提交表单而误刷新的问题；后一项有 Chromium / WebKit 回归。计时用例也明确区分原生 Tab 回到页面顶部（应常显）与离顶后的失焦计时。动画尺寸检查容忍不到 0.01px 的合成浮点误差，不用逐像素相等断言替代布局检查。

## 资源和截图

所有体积均为本地原始字节及离线 gzip，非 CDN 或 Lighthouse 分数；无新增依赖。导航脚本及动效的最新 gzip 体积见下方数据文件（包含已有动效），没有大图或远程字体。逐文件前后体积见 [measurements.json](measurements.json)。截图使用减少动态以稳定复现，动态参数、实际位移与实时降级由专项测试核对。

| 视图 | 截图 |
| --- | --- |
| 1440 中文浅色 | [首屏](home-1440-zh-CN-light.png) · [锚点](anchor-1440-zh-CN-light.png) |
| 1440 英文深色 | [首屏](home-1440-en-dark.png) · [锚点](anchor-1440-en-dark.png) |
| 1024 英文深色 | [首屏](home-1024-en-dark.png) · [锚点](anchor-1024-en-dark.png) |
| 768 繁中浅色 | [首屏](home-768-zh-TW-light.png) · [锚点](anchor-768-zh-TW-light.png) |
| 375 日文深色 | [首屏](home-375-ja-dark.png) · [锚点](anchor-375-ja-dark.png) |
| 320 英文浅色 | [首屏](home-320-en-light.png) · [锚点](anchor-320-en-light.png) |
| 静止计时 | [4 秒仍显示](nav-idle-4s.png) · [5 秒隐藏](nav-idle-5s.png) · [Tab 重新显示](nav-keyboard-revealed.png) |
| 阅读中回顶刷新 | [弹窗云朵入口](reading-refresh-control.png) |

## 剩余边界

- 未在真实 iPhone/iPad、Safari 应用或低性能手机测试；已做两种引擎、响应式和移动音乐策略回归，不能据此声称真机工具栏、刘海或帧率验收。
- 网易云真实音频的播放、暂停、版权/地区/VIP 和折叠续播仍待人工确认；本轮未更改音频来源或试图跨域控制播放器。
- 云朵刷新会重建整页，包括清空筛选和结束当前播放；语言与主题保留。平滑滚动被打断时最多 2 秒后强制归顶并刷新。
- 仅作用于首页导航，独立静态文章维持原本的真实正文、主题、元数据与语言导航，没有为了跨页续播改写架构。

API 行为参考：[scrollend](https://developer.mozilla.org/en-US/docs/Web/API/Document/scrollend_event)、[scrollRestoration](https://developer.mozilla.org/en-US/docs/Web/API/History/scrollRestoration)、[inert](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inert)。实现同时包含无 scrollend 时的完成兜底和无脚本原生表单。
