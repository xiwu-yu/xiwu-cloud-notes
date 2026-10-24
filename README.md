# 夕雾 · 云间来信

一个放随笔和日常碎碎念的个人网站。淡蓝、浅粉和白色的云朵，偶尔认真，时常跑题。

[打开网站](https://xiwu-yu.github.io/xiwu-cloud-notes/)

## 写文章

**一篇文章对应 `content/posts/` 里的一个 `.md` 文件。** 开头两行 `---` 之间是标题、分类和收录日期，下面是 Markdown 正文。

```markdown
---
title: 今天想说的几句话
category: 日常碎碎念
description: 放在首页卡片上的一句简介。
writtenAt: "2026-10-14"
publishedAt: "2026-10-23T20:00:00+08:00"
---

第一段正文。段落之间空一行就行。

## 一个小标题

可以写 **加粗**，也可以写普通段落。

> 想单独放出来的一句话。
```

- 修改旧文：打开对应的 `.md`，改正文并更新 `updatedAt`。
- 新增文章：复制 `templates/post.md` 到 `content/posts/`，换文件名、标题、分类和实际收录日期，再写正文。
- 文件名用小写英文和连字符，如 `a-rainy-day.md`，默认作为文章编号。旧文有显式 `id`；复制旧文时要更改或删掉这个字段。
- 删除文章：删除对应的 `.md`。
- 改昵称、个人介绍：编辑 `content/site.json`。

`writtenAt` 是写作日期，格式为 `YYYY-MM-DD`；未知时不填或填 `null`。`publishedAt` 是上传时间，保留时区。页面可以选择按写作时间或上传时间排序，月份筛选和时间轴随选择切换；没有写作日期的文章排在最后。字数和阅读时长自动生成。

## 在 GitHub 上直接改

进入 `content/posts`，点开文章，再点铅笔图标编辑，保存到 `main`。发布流程会自动安装依赖、检查文章并生成网站。

新增文章可以点击 **Add file → Create new file**，文件名填写 `content/posts/你的文件名.md`，再粘贴模板。保存后到仓库 **Actions** 查看结果；绿色对勾表示发布成功。

## 本地查看

需要 Node.js 22.13 或以上版本和 pnpm 11.25.0。在仓库目录运行：

```sh
pnpm install --frozen-lockfile
pnpm dev
```

打开 http://127.0.0.1:8080。保存 Markdown 后会重新生成内容，刷新浏览器查看；按 Ctrl+C 停止。

```sh
pnpm test   # 检查解析、格式校验和更新流程
pnpm build  # 从 Markdown 生成网页使用的数据
```

`dist/profile.js` 是自动生成的文件，不再作为文章来源，也不提交到 Git。不要直接修改它，否则下次构建会覆盖。

## 文件地图

```text
content/site.json          个人资料
content/posts/*.md         每篇文章的资料与正文
templates/post.md          新文章模板，不会出现在网站中
scripts/content.mjs       解析和检查 Markdown
scripts/build.mjs         生成网站数据
dist/index.html           页面结构
dist/style.css            蓝粉云朵与排版
dist/script.js            筛选、阅读与主题切换
dist/archive.js           时间排序、分组与字数
.github/workflows/pages.yml 自动构建并发布 GitHub Pages
```

网页仍是静态 HTML、CSS 和 JavaScript。Markdown 在发布时转换，访客不需要安装任何东西。

此仓库与网站公开访问。文章应是适合公开的版本；不要将原始日记、联系方式、他人的身份信息或令牌写入仓库。

详细练习见 [学习与修改指南](学习与修改指南.md)。
