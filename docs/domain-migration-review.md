# 自定义域名与 Draft PR #1 审查

检查日期：2026-10-25。分支 `codex/evidence-based-improvements`，起始 HEAD `967956e`，工作区干净，仓库及祖先目录无适用 AGENTS.md。文章、作者原话和视觉样式未改，四语言功能保留；没有新增依赖。本轮只更新草稿 PR，不合并、不部署、不更改 DNS/Pages 设置。

## 正式站与旧站：证据

| 项目 | 2026-10-25 的实际结果 |
| --- | --- |
| GitHub main / 最近成功生产运行 | `d85949d33a488c564b8ff880a19f94748c8598c7` / [40127604094](https://github.com/xiwu-yu/xiwu-cloud-notes/actions/runs/40127604094) |
| PR #1 | 草稿，三个原始提交 96eca72、d7b9362、967956e；最后一次原始验证运行 40167781145 成功，deploy 跳过 |
| Pages API | 自定义域名 cloud.xiwu.space、workflow 构建、HTTPS 强制开启、证书 approved |
| 新域名源码 | script.js SHA-256 `04c8242030ae0552989f8474a5edf8f29985af35f477477082d823a11af8d9df`；style.css SHA-256 `526d84efdecdbe2a8ed0d91081f68cbca57948d67b093674ce9e1f39f6cff04c`；均与 d85949d 对应 Git 文件逐字节相同 |
| 新域名元数据 | 首页和文章 canonical、OG URL、hreflang、sitemap、robots 仍指向旧域名，需本轮修正上线后才生效 |
| build-info.json / navigation.js | 目前生产均为 404；不能声称新功能已经上线 |
| 旧首页 | HTTP 301 → https://cloud.xiwu.space/ |
| 旧查询链接 | HTTP 301 → https://cloud.xiwu.space/?post=xiwu&lang=en |
| 旧深链 | /xiwu-cloud-notes/posts/xiwu/en.html?lang=en → https://cloud.xiwu.space/posts/xiwu/en.html?lang=en |
| 浏览器完整跳转 | `?post=xiwu&lang=en#interests` 到新域名后保留 query/hash，标题 Evening Mist · Xiwu、正文 lang=en；日文静态深链保留正文语言 |

结论：当前没有两套独立线上版本的证据。旧域名已跳转到同一份 main 部署；PR 与 main 的功能差异是未合并造成的。HTTP Location 不含 hash，浏览器继承片段已另外实测。新旧域名的 localStorage 不共享，不声称迁移了旧主题/语言偏好。

### 安全迁移方案

维持现有 GitHub Pages 项目自定义域名与平台 301，保留所有 `posts/<id>/<lang>.html` 路径和原查询参数路由；不要删旧入口、把深链一律跳到首页，或另开一个会持续发布旧内容的源站。新元数据统一引用新域名，减少索引来回跳转。若未来更换托管商，先在新源站验证每个深链、语言和资源，再安排从旧路径去除**单个精确前缀** `/xiwu-cloud-notes/` 的服务端 301/308，并原样保留其后路径和 query；目标域名固定，避免依赖用户可控跳转地址。不需要为当前已工作的跳转另写客户端重定向。

配置与风险依据：[GitHub Pages 自定义域名官方文档](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages)。本轮没有操作域名或 DNS。

## 实际代码变更

| 文件 | 原因与实现 |
| --- | --- |
| content/site.json、scripts/static.mjs、scripts/build.mjs | baseUrl 配置及 SITE_URL 覆盖，统一生产根目录/可选项目子路径的静态 URL；验证 HTTPS 目录，错误时保留上次输出；补首页 OG/hreflang，沿用文章真实正文与相对入口 |
| scripts/build-info.mjs | 生成完整 Git SHA、UTC 时间、构建来源、基址和工作区脏状态；只在构建成功时发布 |
| scripts/verify-site.mjs | 本地与发布后共用校验器；校验 SHA/Actions 来源、13 个当前页面的元数据、真实正文、hreflang 目标及页面引用资源哈希；新增/删文随 sitemap 自动变化 |
| .github/workflows/pages.yml | bash pipefail 防止 tee 吞失败；成功/失败均上传证据；生成新截图；main 部署后只读核对新域名，最多三次；PR 不部署，写权限仍只在 deploy |
| .gitignore、artifacts/、证据脚本 | 从最终 PR diff 去除 132 个新证据文件，共 17,679,852 字节；本地备份保留，未来 CI 证据进入 Actions Artifacts；已有提交 SHA 不重写，因此 Git 历史中的旧大文件仍存在 |
| tests/deployment.test.mjs、tests/content.test.mjs | 基址配置/覆盖、根/子路径、非法配置、构建信息、失败保护、错 SHA/元数据/缺资源/哈希不符；构建时间明确固定用于确定性输出测试 |
| tests/e2e/site.spec.mjs、content-smoke.spec.mjs | 新生产 canonical；根路径与旧项目路径真实文章语言、返回链接、资源锚点和四个外链的回归 |
| content/ui.json、tests/e2e/music.spec.mjs | 四语言提示部分 Safari 需 Option+Tab，按原生键盘策略验证外层官方链接与收起焦点 |
| scripts/serve.mjs、README.md | JSON 正确 MIME；同步配置、验证、迁移和 Artifact 操作说明 |

## 三个原始提交的审查

- **96eca72**：音乐只用官方 HTTPS 外链，type=0、auto=0、歌单 18522359099；默认收起，首次展开加载；iframe 稳定，进入小屏/触屏禁用布局卸载；慢网反馈不宣称真实播放；外层关闭和官方入口可达。复查源码、17 项音乐回归及移动请求检查，没有重新实现已有功能。
- **d7b9362**：原生导航、独立可访问云朵按钮、一次性刷新状态、动态锚点偏移、passive 监听/单计时器、暂停云层与 reduced-motion，保留静态阅读、作者文字及桌面音乐策略。14 项导航回归覆盖实际刷新、4/5 秒显隐、焦点和路由。
- **967956e**：增强后云朵 type=button，阻止 select Enter 的隐式表单提交；无 JS 保留原生 GET 表单。专项回归确认语言选择不误刷新。

审查结论：未发现需要丢弃这些功能提交的问题。合并前须让本轮新增元数据、清理及发布核对改动的 PR CI 成功，再由用户审查；本轮保留 Draft，不将“本地通过”替代生产发布授权。

## 资源与音乐复核

四个外链 `https://mtf.wiki/zh-cn`、`https://hrt.transmtf.com/`、`https://www.one-among.us/`、`https://rle.wiki/` 均在本轮公开请求中返回 200。现有链接 target=_blank、rel=noopener noreferrer 正确；不改资源文字或作者文章。外站可能因网络/地区变化，不纳入离线 CI 的可用性承诺。#resources 在正式站能跳到资源区；本地新导航在 320/375/768/1024/1440px、四语言/双主题下标题不被遮住。

正式站 1440×360 **仍能复现旧音乐问题**：panel clientHeight=262、scrollHeight=390，iframe y=−38.5、高 450；PR 修复让 330×450 原生文档位于可滚动视口，关闭与备用链接留在外侧。当前不重复改音乐 CSS。WebKit 的 iPhone 布局公开站检查 musicNodes=0、musicLinks=0、music requests=0、横向溢出=0；这是 WebKit 引擎模拟，不是移动 Safari 真机。没有为了测试恢复移动音乐。

## 验证与证据

- 基线：19 单元、构建、53 Chromium E2E 通过。沙箱最初阻止端口监听（EPERM），取得测试环境权限后重跑通过，未把环境失败当作产品缺陷。
- 本轮：21 单元通过；构建通过（当前 3 篇、4 语言、12 静态文章页）；本地静态校验通过（含首页 13 页、页面引用的 13 个资源）。
- Chromium：54 项 E2E 通过，新增根路径/旧路径内容与外链检查。
- WebKit：34 项音乐/导航/真实内容专项通过。截图生成脚本两项通过、errors=[]；1440×360 新面板 clientHeight=scrollHeight=222，播放器视口可滚动 386px。最终 PR CI 状态以对应 Actions 运行与交付说明为准；引擎测试不代表真实 Safari。
- 新截图和日志：CI 的 `review-evidence-<SHA>`（保留 14 天）。[Artifacts 下载官方说明](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/download-workflow-artifacts)。本地运行结果位于忽略目录 `work/evidence/`，公开站检查位于 `work/domain-audit/`。

补充复现了 macOS WebKit 默认键盘策略：普通 Tab 会跳过链接/按钮，Option+Tab 能从 iframe 到官方链接及收起按钮。四语言提示已补充这一边界，测试使用引擎对应的原生键；没有用脚本伪造焦点。Safari 键盘设置的边界另对照了 [Apple 官方快捷键说明](https://support.apple.com/guide/safari/keyboard-shortcuts-and-gestures-cpsh003/mac)。根路径测试返回首页后等待 load，避免下一次测试导航人为取消其资源。

依赖/锁文件没有变化，没有新增浏览器端 JS/CSS。本地原始字节 / 离线 gzip：index.html 18,666 / 6,297 → 19,540 / 6,444；自动生成 profile.js 188,786 / 44,409 → 188,959 / 44,488（四语言键盘说明增加 173 / 79）；style.css 保持 39,145 / 9,259，script.js 保持 26,014 / 7,644。build-info 本地为 194 字节，独立加载时才产生请求，不增加日常浏览请求。构建来源/时间不同会改变其大小；这些不是 CDN 传输实测，不虚构 Lighthouse 或真机帧率。

## 发布与未验证风险

本轮未合并或发布；正式域名当前仍是 d85949d，以上旧元数据与音乐裁切尚未在线修好。发布后使用实际 main SHA 运行 `node scripts/verify-site.mjs https://cloud.xiwu.space/ <完整SHA>`；工作流已安排同一检查。它检查公开 CDN 返回的构建信息、静态正文/元数据和资源内容哈希，不能证明世界各地缓存已全部更新。失败会标红并保留报告，不会自动回滚已部署文件。

真实 iPhone/iPad Safari、Safari 桌面应用、网易云真实播放/暂停/切歌/收起续播及版权/VIP/地区限制未人工验证。播放器宿主的 mock 测试仅能验证节点、布局与回退，不代表音频可播。整页导航/刷新会结束播放器，跨域和跨站偏好仍受浏览器边界约束。
