# 本地参考网页

这里保存从网页生成的本地参考快照，用于离线观察布局、交互和资源组织方式。

每个子目录把 HTML 文件和同名的 `_files/` 资源目录放在一起，避免移动后相对路径失效。当前包括：

- `pi-coding-agent/`
- `deepseek/`
- `apple-education-offer/`
- `linear/`
- `vercel-agentic-infrastructure/`
- `spacexai/`
- `owid-electoral-democracy/`

这些网页快照和下载资源默认由根目录 `.gitignore` 排除，不作为 GitHub 项目的发布内容。真正需要复用的结构、交互和数据，应整理成 `references/patterns/`、`references/datasets/` 或 `assets/` 中的独立内容。

新增快照时建议记录原始网址、抓取日期和许可证边界，不要让演示页面依赖第三方快照中的远程脚本。
