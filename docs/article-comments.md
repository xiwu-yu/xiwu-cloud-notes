# 文章评论：GitHub Discussions + Giscus

网站继续由 GitHub Pages 提供。2026-10-30 已完成 Giscus App 的单仓库授权与公告型“文章评论”分类创建；不修改 DNS、Cloudflare 点赞、文章原文或部署权限。

## 已接通的配置

`content/comments.json` 是唯一配置入口，仓库 ID 与分类 ID 均从 GitHub 实际读取：

```json
{
  "enabled": true,
  "repo": "xiwu-yu/xiwu-cloud-notes",
  "repoId": "R_kgDOVU6AUw",
  "category": "文章评论",
  "categoryId": "DIC_kwDOVU6AU84DJ-VK"
}
```

Giscus 安装号为 `176635575`，仅授权此仓库的 metadata 读取及 discussions 读写，没有代码写权限。GitHub 分类编号为 `52946250`，采用 Giscus 官方推荐的 Announcements 类型：维护者和 Giscus 可创建文章讨论，普通读者仍可评论、回复。

如换用其他仓库，先启用 Discussions、安装 Giscus（Only select repositories 限定目标仓库）、创建公告型分类，再从 https://giscus.app/zh-CN 或 GitHub GraphQL 取得真实 ID。不能猜填分类 ID，也不能把 Token/Secret 放进配置。构建检查配置，错误不会覆盖上次成功产物。

## 文章关联和阅读体验

- 映射固定为 `specific`，term 为 `xiwu-article:<文章原始 id>`，`strict=1`。同一文章四语言、首页弹窗、独立文章页共用讨论；标题、语言与根路径/项目子路径变化不会拆成多条讨论。不要更改既有文章 ID 或映射前缀；由文件名推导 ID 的文章重命名前应明确保留 id。
- 文章末尾点击“查看评论 / 写评论”才下载官方客户端，iframe 设置 `loading=lazy`。普通首页/阅读不主动请求评论；第一位读者提交评论时 Giscus 才建立对应讨论。
- 评论公开存于 GitHub Discussions。公开评论无需登录即可阅读，发表需要读者自己的 GitHub 登录和授权，不是匿名评论；作者在 GitHub 管理、回复、编辑、锁定或删除讨论。
- 评论宿主保留网站的蓝粉玻璃按钮与稳定正文底色，官方组件使用对应 light/dark 主题，支持网站手动选择、跟随系统和跨标签页主题更新。四语言文案来自 `content/ui.json`。
- 同一文章的语言和主题通过官方 `setConfig` 更新，保留 iframe 节点。翻到其他文章会重置评论入口，只有再次点击后才加载对应 iframe，避免复用官方组件的旧 OAuth 返回地址而登录后回到上一篇文章。一次语言变化会触发网站多个刷新事件，宿主在微任务中合并最终配置并去重，避免 Giscus 内部重复路由取消。未提交草稿不保证跨文章或整页导航保存。
- 搜索、筛选、点赞、分享和音乐节点不由评论模块重建。iframe 内 Esc 不向父页冒泡，阅读器保留可见的外层关闭入口。
- 慢网显示等待提示，初始化/网络错误提供重试，始终保留 GitHub 讨论入口；无 JS 时静态正文与 GitHub 链接仍可用。不显示虚假的空评论数，主帖 reactions 关闭，避免另加重复点赞入口。

## 运维和发布

正常新增文章无需创建讨论或修改分类；沿用稳定文章 ID 即可。新增/修改译文也不产生独立讨论。

```sh
pnpm test
pnpm build
pnpm test:e2e
node scripts/verify-site.mjs --local dist
```

按现有 PR → validate → main → GitHub Pages → 发布版本校验流程发布，PR 不部署，Actions 权限不扩大。截图、日志、trace 保留在现有 Actions Artifacts，新增评论截图使用 `EVIDENCE_DIR/comments/`；本地默认 `work/comments/`，不提交截图或测试日志。

可将 `enabled` 设为 false 并重新构建发布来停用入口，不删除历史 Discussions。卸载 App 不等于清空历史评论。来源限制可以通过仓库根 `giscus.json` 的 origins 设置；添加前明确正式站和实际预览来源，不擅自放开通配符。来源限制不能替代 GitHub 权限和内容审核。

## 2026-10-30 验证与边界

- 单元测试 33/33，构建 5 篇文章、4 语言；静态校验 21 页、20 资源。完整 E2E 151/151；评论专项 Chromium 11/11、WebKit 11/11。
- 覆盖 320/390/768/1440px、四语言、浅深主题、跟随系统、严格 ID 映射、同页历史、键盘、失败/慢网、伪造消息、无 JS。WebKit 懒加载可能晚于 iframe 可见，测试等待实际文档请求，不以 DOM 可见误判已加载。
- 已用真实官方 Giscus 只读核对弹窗和静态页相同 repo/category/term，以及四语言和浅深主题。配置合并后常规语言切换没有宿主/官方错误日志；新文章尚无讨论时官方的 “Discussion not found” 提示表示会在首次评论时建立讨论。
- 宿主脚本 6,865 字节，gzip 2,419 字节；没有新增包依赖。第三方 Giscus 资源点击后才下载，不计入宿主脚本体积。
- 自动化模拟官方服务边界，不向 GitHub 发表公开测试评论；没有代替读者授权 GitHub OAuth。真实评论提交/取消授权、真机 Safari/Android、部分地区无代理可达性仍需实际环境验证，不把 WebKit 或窄屏模拟称为真机检查。

官方文档：https://giscus.app/zh-CN 、https://github.com/giscus/giscus/blob/main/ADVANCED-USAGE.md 。
