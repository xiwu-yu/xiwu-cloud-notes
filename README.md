# 夕雾 · 云间来信

一个放随笔和日常碎碎念的个人网站。淡蓝、浅粉和白色的云朵，偶尔认真，时常跑题。

原生 HTML、CSS、JavaScript，无需安装依赖或构建。

## 本地查看

在仓库目录运行：

```sh
python3 -m http.server 8080 --directory dist
```

打开 http://localhost:8080，按 Ctrl+C 停止。

## 修改文章

编辑 `dist/profile.js`。每篇文章需要唯一的 `id`、标题、主题、摘要、正文，以及带时区的 `publishedAt` 收录时间。段落用双换行分开。`updatedAt` 记录修改时间。

月份筛选、时间轴、字数和阅读时长自动生成。日期代表网站收录时间，原始日记日期不公开。随笔经过重新整理与改写。

## 发布

仓库 Settings → Pages → Source 选择 GitHub Actions。推送到 `main` 后，`.github/workflows/pages.yml` 自动发布 `dist`。Actions 页面可以查看发布进度。

网站和此仓库公开访问。提交前检查改动，避免写入联系方式、原始日记、其他人的身份信息、令牌或本地私密文件。

## 一边改，一边学

从 [学习与修改指南](学习与修改指南.md) 开始：先改一句介绍，再调整云朵颜色，然后添加一篇随笔。熟悉后再读 `archive.js` 中的筛选和排序规则。
