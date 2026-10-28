# 文章共享点赞：Cloudflare Workers + D1

网站仍由 GitHub Pages 提供，不迁移托管、不修改 DNS / Pages 设置。Worker 只提供点赞 API，D1 保存真实关系和累计数。访客无需账号。作者于2026-10-28授权完成云端配置，当前使用自己的 Cloudflare 账号；以下保留首次配置及日常维护说明。

## 已配置的服务

- API：`https://xiwu-article-likes.xiwu-cloud-notes.workers.dev`。
- Worker / D1 名称均为 `xiwu-article-likes`，`DB` 绑定指向已提交的真实数据库 UUID；已应用 `0001_likes.sql`。已有数据库无需重复创建。
- `VISITOR_SECRET` 已通过标准输入写入 Cloudflare Secret，未输出或提交明文。后续部署不要重复生成或替换密钥。
- 官方 Wrangler 仅授权账号读取、用户读取、Workers Scripts Write、D1 Write及后台刷新；不申请 DNS、Pages 或计费权限。可在个人资料 → Access Management → Connected Applications 撤销。
- 真实 API 已验证双身份累计、并发重复点赞只加一次、取消与重复取消、精确 CORS 和未知文章拒绝；测试票全部撤销。站点仍沿用现有 PR / main 验证及 Pages 部署门槛。

## 当前开关与数据含义

- `content/likes.json` 的 `apiUrl: null` 表示尚未配置。入口隐藏且不发点赞请求，不显示假的零或本地累计。配置真实 HTTPS 服务根地址、重新构建并发布后，弹窗和独立文章页显示入口。
- 计数以文章原始 `id` 为键，四语言及缺译回退共用。每个匿名浏览器身份对每篇文章最多一票；取消后可重新喜欢。
- 浏览器生成 256 位随机身份，保存在 `xiwu-like-visitor-v1`，只向配置的 API 发送。数据库保存 HMAC，不保存原始匿名凭证；不使用第三方 Cookie。页面刷新与同源标签页沿用身份，跨设备、隐私窗口或清除数据后会成为新身份。此机制不能证明“一人一票”。
- 更新必须得到服务端确认。失败显示暂不可用；已有计数保留为上次成功读数，未知为 `—`，不会假加一。8 秒超时可主动重试；没有持久存储时禁用点赞并说明原因。
- GET 结果不共享缓存，每次打开文章最多读取一次，30 秒内同页重开复用；写入后同步同源其他标签页并重新读服务器。其他访客的变化在重新打开或刷新时更新，不是实时推送。
- 无 JS 时隐藏点赞，正文、目录、文章导航和元数据仍完整可读。主题、玻璃设置、音乐 iframe 不受影响。

## 一次性配置（终端在项目根目录）

### 0. 注册账号与找到控制台入口

1. 打开 [Cloudflare 注册页面](https://dash.cloudflare.com/sign-up)，使用你自己的邮箱注册并完成验证邮件。已有账号可以直接登录。[官方注册说明](https://developers.cloudflare.com/fundamentals/account/create-account/)。
2. 登录后进入自己的账号，找到 **Workers & Pages**，使用 Workers Free。首次使用按提示设置一个自己的 `workers.dev` 子域；最终 API 地址形如 `xiwu-article-likes.你的子域.workers.dev`。可以使用该官方子域启动，无需把现有域名转入 Cloudflare。[官方 workers.dev 说明](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)。
3. 本项目需要的是 Worker 和 D1；保持现有 GitHub Pages 托管和 DNS 不动，不必选择将网站迁移到 Cloudflare Pages，也不必购买域名或开启 Workers Paid。若界面出现付费升级提示，先核对当前选中的产品。
4. 可在控制台 **D1 SQL Database** 找到稍后创建的数据库；在 **Workers & Pages → xiwu-article-likes → Bindings** 核对 `DB`，在 **Settings → Variables and Secrets** 核对 `VISITOR_SECRET`。控制台菜单可能调整，以产品名称为准。下面用项目锁定的 Wrangler 完成创建、迁移和部署，避免手工粘贴后端代码时漏掉文件。

### 1. 安装锁定工具并登录

安装 Node.js 24 和项目指定 pnpm 后：

```sh
pnpm install --frozen-lockfile
pnpm exec wrangler login --device --scopes account:read user:read workers_scripts:write d1:write
pnpm exec wrangler whoami
```

浏览器中由你登录并授权自己的账号。仓库锁定 Wrangler `4.153.0`，只作为开发/部署工具，不打包到浏览器。`pnpm-workspace.yaml` 仅允许锁定版本的 esbuild/workerd 必要安装脚本，不全局放开脚本。

请在包含 `package.json`、`content/` 和 `workers/` 的项目根目录运行。当前完整代码副本为 `/Users/xiwu/Documents/ChatGPT/云间来信/xiwu-cloud-notes-likes`；另一个旧工作区仍有未提交修改，先不要对它执行强制拉取或重置。注册密码、验证码和 Wrangler 登录授权由你在官方页面完成，无需把它们发到聊天中。

### 2. 创建 D1 数据库

```sh
pnpm exec wrangler d1 create xiwu-article-likes --config workers/likes/wrangler.jsonc --update-config=false
```

打开 `workers/likes/wrangler.jsonc`，仅在新账号首次建立服务时，将 `d1_databases[0].database_id` 替换为输出的真实 ID，保留 `binding: "DB"`、数据库名称和 `migrations_dir`。数据库 ID 不是秘密，可提交；API Token、OAuth 凭证与服务密钥不能提交。存在多个 Cloudflare 账号时按 Wrangler 提示选择自己的账号。

`ALLOWED_ORIGINS` 默认只有 `https://cloud.xiwu.space`。这是精确 origin（没有末尾 `/`），多个使用逗号分隔。旧 GitHub Pages 已跳转正式站，不必扩大到通配符。CORS 是浏览器访问限制，不能当作身份认证或绝对防刷。

### 3. 同步已发布文章和应用数据库迁移

```sh
pnpm likes:prepare
pnpm exec wrangler d1 migrations apply xiwu-article-likes --remote --config workers/likes/wrangler.jsonc
```

`likes:prepare` 使用同一 Markdown 校验器读取文章，更新 Worker `ARTICLE_IDS` 白名单，**不部署**。目前五篇文章，无假文章和假数据。正常新增文章后，需要再次执行 prepare 并部署 Worker；只更新译文无需改计数。不要重命名既有文章 ID，否则会视为新文章。

### 4. 部署 Worker 并设置服务端密钥

```sh
pnpm exec wrangler deploy --config workers/likes/wrangler.jsonc
openssl rand -hex 32 | pnpm exec wrangler secret put VISITOR_SECRET --config workers/likes/wrangler.jsonc
```

记录 Wrangler 返回的真实 `https://xiwu-article-likes.<你的子域>.workers.dev` 地址。首次使用 Workers 可能需要在 Cloudflare 设置自己的 workers.dev 子域。未设置密钥时 API 返回 503，不接受点赞。

`VISITOR_SECRET` 只存在 Cloudflare Secret 中，不能放进 `content/`、前端、GitHub Actions 日志或 PR。不要随意轮换：轮换后旧匿名身份无法对应数据库里的 HMAC，原有累计保留但旧票不能由原浏览器撤销。保留密钥的安全备份；如需轮换，应先设计数据迁移。

不需要开启付费计划、购买 VPS 或绑定新的生产域名。若账号已有其他付费设置，请自行核对使用计划。本功能不自动修改账户计费。

### 5. 只读验证，再接通网站

将下文 `https://你的真实地址.workers.dev` 换成第 4 步地址：

```sh
curl -i 'https://你的真实地址.workers.dev/v1/articles/xiwu' \
  -H 'Origin: https://cloud.xiwu.space' \
  -H 'Authorization: Bearer aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
```

该请求不产生点赞。初次空数据库应返回 HTTP 200 和 `{"id":"xiwu","count":0,"liked":false}`；已有票时 count 为实际值。403 检查 origin，401 检查匿名凭证格式，404 检查文章白名单，503 检查数据库迁移、DB 绑定和 Secret；不要把错误改成零来掩盖失败。

接着修改 `content/likes.json`：

```json
{"apiUrl":"https://你的真实地址.workers.dev"}
```

这里仅填**服务根地址**，不要填 `/v1/articles/...`、API Token 或密钥。构建拒绝 HTTP、账号密码、路径、查询参数和片段。部署 API 后，再运行：

```sh
pnpm test
pnpm build
pnpm test:e2e
```

提交 `content/likes.json` 和真实数据库绑定配置，按既有 PR → 验证 → main → GitHub Pages 流程发布。GitHub Actions 不需 Cloudflare Token，也不会替你创建或迁移数据库；不要因此扩大 Pages workflow 权限。

### 6. 上线人工检查

1. 浏览器 A 打开一篇文章，喜欢后刷新仍保持；切换四语言计数不变。
2. 独立浏览器 B / 设备显示同一总数但未喜欢；B 点赞后 A 刷新可看到增加。
3. A 取消仅移除自己的票，反复请求同一 desired state 不重复加减。另一篇不受影响。
4. 弹窗和静态页一致，其他标签页同步；断网/服务失败保持错误而非虚增，音乐不重载。
5. Cloudflare D1 控制台可只读执行 `SELECT article_id,total FROM article_counts ORDER BY article_id;` 核对。不要为演示直接插入虚假累计。

## 本地 Worker 验证与自动化边界

`pnpm test:e2e` 在 `.test-site/real/` 和 `.test-site/fixture/` 独立构建副本，关闭副本的生产 API；真实文章仍来自当前 Markdown。点赞专项通过官方 Worker handler + 独立 SQLite 验证，不向生产写票。CI 视觉证据脚本也仅在其浏览器响应中关闭点赞，不修改发布产物或正式配置。普通本地 `pnpm dev` 保持真实配置：因生产 API 精确允许正式 origin，本地读取将显示不可用；需要完整本地预览时应另配本地 Worker，勿扩大生产 CORS。

```sh
pnpm exec wrangler d1 migrations apply xiwu-article-likes --local --config workers/likes/wrangler.jsonc
pnpm exec wrangler dev --local --config workers/likes/wrangler.jsonc --port 8791 \
  --var VISITOR_SECRET:local-only-test-secret-value-at-least-32-chars
```

本地用 curl 将第 5 步服务地址换成 `http://127.0.0.1:8791` 并补 `-H 'CF-Connecting-IP: 127.0.0.1'`，测试数据库保存在忽略的 `.wrangler/` 中。这个本地测试密钥绝不能部署到生产。前端正式配置强制 HTTPS，不允许误把本地地址发布出去。

`tests/likes.test.mjs` 实际执行 SQLite schema、触发器和事务；浏览器测试使用同一 Worker handler + 独立 SQLite DB，通过拦截 API 边界检查前端，测试票不进入生产。它们不证明已创建云端 D1 或生产网络可达。真实 Cloudflare、各地区网络、真实 iPhone Safari 需配置后人工核对。

## 防刷、隐私与免费额度

- `(article_id, visitor_hash)` 唯一键 + `INSERT OR IGNORE` / 幂等 DELETE + 同事务触发器维护累计；客户端只能发 `{liked:true/false}`，不能提交 count。
- 参数绑定、已发布文章白名单、请求体最多 128 字节，限制允许的 Origin / 方法；拒绝无匿名凭证和无 Cloudflare 来源 IP 的请求。响应不泄露 SQL 或内部错误。
- 每个 Cloudflare 来源 IP 每分钟最多 20 次写入、120 次读取，D1 原子计数跨 Worker 实例生效；拒绝返回 429 / Retry-After。IP 只以每日轮换的 HMAC 存于短期限流键，小时任务清理过期项，不存原始 IP。服务端日志默认关闭，Cloudflare 自身的平台处理以其政策为准。
- 这是基础防护。共享出口可能同时受限；清缓存、代理 IP、脚本伪造 Origin 或大量地址仍可能绕过，不能保证一人一票。若遭持续攻击，应另行评估 Turnstile / 边缘规则，不能无限写入来追求防刷。
- 采用 O(1) 累计表及索引，读状态不扫描整张点赞表；限流本身也产生 D1 写入，不是“免费无限请求”。免费额度耗尽时功能暂不可用，正文仍正常。
- 当前官方标示 Workers Free 每日 100,000 请求；D1 每日 5,000,000 读取行、100,000 写入行及共 5GB 存储。配额按账号共享，实际以控制台与官方计费为准，不承诺永久免费或高流量仍零成本。[Workers 价格](https://developers.cloudflare.com/workers/platform/pricing/)、[D1 价格](https://developers.cloudflare.com/d1/platform/pricing/)。

数据库事务依据 [D1 batch API](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch)，部署参照 [Wrangler](https://developers.cloudflare.com/workers/wrangler/commands/) 与 [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/)。

## 停用与恢复

将 `content/likes.json` 恢复为 `{"apiUrl":null}` 并发布即可隐藏入口，不删除数据库或历史票。不要为停用执行 DROP TABLE。恢复原服务和 Secret 后原浏览器仍可取消。新增迁移应追加编号文件，不改写已应用的 `0001_likes.sql`；进行任何破坏性数据库操作前先备份。

## 日常使用与排查

- 读者点击文章末尾的心形按钮点赞，再点取消。线框/填充心形、按钮文字及 `aria-pressed` 一起表明状态；总数由 D1 返回，不由材质动画改变。
- 站长新增文章后运行 `pnpm likes:prepare` 并重新部署 Worker，再按现有流程发布文章。不要删除 D1 数据库来更新文章。
- 查看累计：进入 D1 数据库的 Console，执行 `SELECT article_id, total FROM article_counts ORDER BY article_id;`。不要编辑 `article_counts` 的数字来代替真实点赞关系。
- 查看额度：在 Worker 与 D1 的 Metrics 页面核对请求和读写使用量。免费额度按账号共享，限流查询也会产生读写；不把免费理解为无限制。
- 没有出现按钮：检查 `content/likes.json` 的 `apiUrl` 是否仍为 null，以及是否已重新构建、发布。
- 出现服务不可用：先检查 API 返回码、`DB` 绑定、迁移与 Secret；再在实际使用网络上测试 Worker 地址可达性。遇到地区网络限制时，应单独评估可达的 API 域名，不更改已正常运行的网站 DNS 来碰运气。
