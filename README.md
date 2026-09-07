# Design Asset Library

一个用于积累、拆解和复用网页设计的本地素材库。重点不是收集完整网站，而是把喜欢的视觉语言、交互方式和数据展示方式整理成可以重新制作的 HTML / CSS / JavaScript 片段。

## 快速入口

- [可视化素材库](DESIGN-ASSET-LIBRARY.html)：直接打开，查看当前素材和交互演示。
- [学习路线](LEARNING-ROADMAP.md)：从观察、拆解到独立复刻的练习计划。
- [交互与视觉模式](references/patterns/)：每个参考案例的拆解笔记。
- [可发布数据](references/datasets/)：演示页面使用的数据文件与来源说明。
- [本地参考网页](references/sources/README.md)：下载网页快照的本地目录说明。

## 项目结构

```text
Design/
├── README.md                         项目说明、上传边界和目录索引
├── LEARNING-ROADMAP.md               学习与积累路线
├── DESIGN-ASSET-LIBRARY.html         可直接打开的交互式素材库
├── .gitignore                        GitHub 上传排除规则
│
├── assets/                            可以直接复用的素材
│   ├── brand/logos/                   Logo 与品牌导出版本
│   ├── imagery/backgrounds/           背景与氛围图
│   ├── imagery/posters/               海报与编辑类图片
│   ├── icons/development/             开发技术与平台图标
│   ├── icons/tools/                   软件、工具与产品图标
│   └── terminal/                      终端相关资源
│
├── references/
│   ├── patterns/                      可复用模式的学习笔记
│   │   ├── backgrounds/               渐变背景、三角灯光场
│   │   ├── data/                      FLOPS、OWID 比较表
│   │   ├── scrollytelling/            滚动驱动的页面翻页
│   │   ├── stickers/                  贴纸与 Sprite 动画
│   │   ├── terminal/                  终端播放与命令切换
│   │   └── typography/                Roman / pixel 与动态词槽
│   ├── datasets/                      体积小、来源明确、可发布的数据
│   └── sources/                       本地网页快照，默认不上传 GitHub
│
└── archive/
    └── MONICA/                        旧项目完整存档，默认不上传 GitHub
```

## 当前模式

- [Pi 终端播放与命令切换](references/patterns/terminal/pi-terminal-pattern.md)
- [滚动驱动的左右联动叙事](references/patterns/scrollytelling/pi-sticky-story-pattern.md)
- [DeepSeek 线性渐变背景](references/patterns/backgrounds/deepseek-linear-gradient.md)
- [Vercel 三角灯光场](references/patterns/backgrounds/vercel-triangle-light.md)
- [Apple 夸张剪切贴纸](references/patterns/stickers/apple-jiggling-stickers.md)
- [FLOPS 数据叙事图表](references/patterns/data/supercomputer-power-flops-chart.md)
- [OWID 比较表与时间范围](references/patterns/data/owid-comparison-table-timeline.md)
- [动态标题最后一个词](references/patterns/typography/dynamic-last-word.md)

## 上传到 GitHub

### 建议上传

- `README.md`、`LEARNING-ROADMAP.md` 和 `.gitignore`
- `DESIGN-ASSET-LIBRARY.html`
- `assets/` 中已经整理并在素材库中使用的素材
- `references/patterns/` 中的拆解笔记
- `references/datasets/` 中有来源和许可证说明的数据
- `references/sources/README.md`，用于说明本地网页快照的组织方式

### 默认不上传

- `references/sources/` 中下载的第三方 HTML 快照和 `_files/` 资源
- `*.download`、浏览器缓存脚本、临时导出和 IDE 配置
- `archive/MONICA/` 中的旧项目原始文件和大体积图片

`.gitignore` 只负责阻止未跟踪文件进入提交，不会自动移除已经提交过的文件。第一次初始化仓库时，应在第一次 `git add` 前检查 `git status` 和待提交文件列表。

## 上传前体积检查

当前 `assets/` 约 24.5 MB，最大图片约 10.6 MB，暂时可以直接放进 GitHub。新增素材前建议先检查体积；单个文件接近 50 MB 时优先压缩，超过 100 MB 时不要直接提交，应改用 Git LFS 或外部素材存储。

## 使用方式

直接打开 `DESIGN-ASSET-LIBRARY.html` 即可离线查看。页面不依赖构建工具；素材、数据和模式笔记都使用相对路径组织。

新增内容时遵循这个顺序：

1. 把原始网页快照放入 `references/sources/项目名/`，HTML 和 `_files/` 保持同级。
2. 记录观察结果，写入 `references/patterns/` 对应类别。
3. 把真正可复用的图片、图标或数据复制到 `assets/` 或 `references/datasets/`。
4. 在 `DESIGN-ASSET-LIBRARY.html` 中加入一个可操作的最小演示。
5. 更新本 README 的目录或模式索引。

## 使用边界

本项目用于个人学习、设计研究和自有 HTML 演示。参考网页中的品牌、图片、字体、代码和数据可能属于原作者或第三方，复用前需要单独确认许可证；素材库记录的是设计结构和学习过程，不代表获得了原网页素材的再分发权。
