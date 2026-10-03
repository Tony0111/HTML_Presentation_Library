# Design Asset Library

一个用于积累、拆解和复用网页设计的本地素材库。重点不是收集完整网站，而是把喜欢的视觉语言、交互方式和数据展示方式整理成可以重新制作的 HTML / CSS / JavaScript 片段。

## 快速入口

- [可视化素材库](DESIGN-ASSET-LIBRARY.html)：直接打开，查看当前素材和交互演示。
- [交互与视觉模式](references/patterns/)：每个参考案例的拆解笔记。
- [可发布数据](references/datasets/)：演示页面使用的数据文件与来源说明。
- [本地参考网页](references/sources/README.md)：下载网页快照的本地目录说明。

## 项目结构

```text
Design/
├── README.md                         项目说明、上传边界和目录索引
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
│   │   ├── cursor/                    指针跟随、磁吸、悬停放大、媒体镜头
│   │   ├── data/                      FLOPS、OWID 比较表
│   │   ├── scrollytelling/            滚动驱动的页面翻页
│   │   ├── stickers/                  贴纸与 Sprite 动画
│   │   ├── terminal/                  终端播放与命令切换
│   │   ├── typography/                Roman / pixel 与动态词槽
│   │   └── webgl/                     DOM 到 WebGL 平面、shader 风格拆解
│   ├── rebuilds/                      自己写的无依赖复刻（可直接打开）
│   │   ├── particles-playground/      图片粒子 WebGL 交互效果（离线可打开）
│   │   ├── hologram-shader-portable/  单文件全息 Shader 效果（离线可打开）
│   │   ├── hologram-corner-widget/    透明背景全息角标（可嵌入 HTML）
│   │   ├── hover-card-row/            底部并排的悬停卡片（3D 倾斜 + 展开）
│   │   ├── anime-motion-intro/        Anime.js 开场动效（库已内嵌，单文件）
│   │   ├── anime-examples/            Anime.js 官方示例离线画廊（35/36 可双击）
│   │   ├── portfolio-v2-3d/           紫色线场、电脑模型、星空与地球（离线可打开）
│   │   ├── sphere-particle/            粒子球与文字之间的变形（离线可打开）
│   │   └── stlshaper-forms/           参数化形体变形与三套循环背景（离线可打开）
│   ├── libs/                          可直接带走的成品库文件（anime 等）
│   ├── datasets/                      体积小、来源明确、可发布的数据
│   └── sources/                       本地网页快照，默认不上传 GitHub
│
├── github_res/                        他人开源仓库的本地研读副本，整体不上传 GitHub
│   └── anime/                         Anime.js v4 官方库与 26 个示例，MIT（唯一保留在本地）
│
└── archive/
    └── MONICA/                        旧项目完整存档，默认不上传 GitHub
```

- [HOLO.SYS 全息 Shader 可视化器](references/rebuilds/hologram-shader-portable/index.html)：React + Three.js + GLSL 的赛博朋克全息几何体效果，已制作离线复刻版。原仓库：[YasirAwan4831/holographic-shader-visualizer-three.Js](https://github.com/YasirAwan4831/holographic-shader-visualizer-three.Js)。

## 当前模式

- [Pi 终端播放与命令切换](references/patterns/terminal/pi-terminal-pattern.md)
- [滚动驱动的左右联动叙事](references/patterns/scrollytelling/pi-sticky-story-pattern.md)
- [DeepSeek 线性渐变背景](references/patterns/backgrounds/deepseek-linear-gradient.md)
- [Vercel 三角灯光场](references/patterns/backgrounds/vercel-triangle-light.md)
- [Apple 夸张剪切贴纸](references/patterns/stickers/apple-jiggling-stickers.md)
- [FLOPS 数据叙事图表](references/patterns/data/supercomputer-power-flops-chart.md)
- [OWID 比较表与时间范围](references/patterns/data/owid-comparison-table-timeline.md)
- [动态标题最后一个词](references/patterns/typography/dynamic-last-word.md)
- [Shery.js：DOM 到 WebGL 平面的体系结构](references/patterns/webgl/sheryjs-effect-architecture.md)
- [Shery.js：7 种图像 shader 语言](references/patterns/webgl/sheryjs-image-effect-styles.md)
- [Shery.js：指针玩趣套件](references/patterns/cursor/sheryjs-cursor-playfulness.md)
- [液体折射背景（用于演示）](references/patterns/webgl/liquid-background-for-presentation.md)：静止背景 + 悬停曲率放大，含接入注意事项和给 AI 的指令

## 待学习的开源仓库

- **[webcam-particles](https://github.com/tuqire/webcam-particles)**：基于 JavaScript、Three.js 和 GPGPU 的摄像头粒子效果。
  - 在线演示：[tuqire.github.io/webcam-particles](https://tuqire.github.io/webcam-particles/)
  - 核心想法：读取摄像头视频作为纹理，让粒子显示现实画面中的颜色；使用 GPU 着色器更新粒子位置，并支持鼠标推开粒子。
  - 当前状态：暂时搁置，之后学习“摄像头输入 → WebGL / Three.js 纹理 → 粒子交互”这条技术路线。
  - 注意事项：原项目依赖较旧，运行需要 WebGL、桌面浏览器和摄像头权限；仓库中没有视频演示文件，主要演示通过在线 Demo 提供。

## 本地复刻

- [Liquid Lens](references/rebuilds/sheryjs-liquid-lens/index.html)：不依赖 three.js / GSAP 的 WebGL1 复刻，滑杆直接绑定 uniform，可导出 / 导入 JSON 预设，也可拖入自己的图片。素材库页面里有它的精简版。
- [Particles Playground](references/rebuilds/particles-playground/index.html)：Three.js + GLSL 图片粒子效果的离线打包版本，双击即可打开，鼠标交互和场景切换可用。
- [Portfolio V2 3D Materials](references/rebuilds/portfolio-v2-3d/index.html)：紫色渐变线场、电脑模型、星星背景与地球模型的离线独立展示。
- [Particle Morph](references/rebuilds/sphere-particle/index.html)：12,000 个粒子在旋转球体与输入文字之间变形，支持离线运行。
- [STLShaper Forms](references/rebuilds/stlshaper-forms/index.html)：把 STL 编辑器的 11 种变形算法移植到程序化网格上，可切换形体、变形与强度，也可自动轮播。
- [HOLO.SYS Portable](references/rebuilds/hologram-shader-portable/index.html)：单 HTML 文件的离线全息几何体 Shader 效果，支持拖动旋转、滚轮缩放及按键切换形状。
- [HOLO.SYS Corner Widget](references/rebuilds/hologram-corner-widget/index.html)：透明背景的小型全息角标，只显示几何体和圆台，适合用 iframe 嵌入 HTML 演示页面。
- [Hover Card Row](references/rebuilds/hover-card-row/index.html)：页面下方并排的章节卡片，悬停时抬起、产生 3D 倾斜并展开更多信息，可在 3 张与 4 张布局间切换。参考自 `github_res/movie_card_hover`。
- [Anime.js Motion Intro](references/rebuilds/anime-motion-intro/index.html)：用 Anime.js 做的开场动效，文字逐字入场、卡片错峰、数字滚动、折线绘制；库已内嵌，单文件离线可跑。
- [Anime.js Examples Gallery](references/rebuilds/anime-examples/index.html)：官方 26 个示例（36 个页面）的离线改造版，35 个可双击运行，左侧选示例右侧实时预览。含错峰动画、文字效果、路径描边、时间轴、拖拽轮播、滚动驱动、布局动画等。

### 可直接带走的库

- [anime](references/libs/anime/anime.umd.min.js)：Anime.js v4.5.0 的 UMD 成品包（116 KB，MIT）。用 `<script src>` 引入或内嵌进 HTML，都可离线使用，不需要 npm 或网络。说明见 [references/libs/README.md](references/libs/README.md)。

### 循环背景

三套线框形体背景，固定形状、持续自转、定时切换变形，无界面无文字，适合当幻灯底图：

- [Sphere background](references/rebuilds/stlshaper-forms/backgrounds/sphere.html)：球体 · 噪声 → 扭曲 → 像素化 → 边界撕裂
- [Torus background](references/rebuilds/stlshaper-forms/backgrounds/torus.html)：圆环 · 噪声 → 扭曲 → 弯曲 → 像素化 → 边界撕裂
- [Knot background](references/rebuilds/stlshaper-forms/backgrounds/knot.html)：环结 · 噪声 → 像素化 → 边界撕裂

## 上传到 GitHub

### 建议上传

- `README.md` 和 `.gitignore`
- `DESIGN-ASSET-LIBRARY.html`
- `assets/` 中已经整理并在素材库中使用的素材
- `references/patterns/` 中的拆解笔记
- `references/datasets/` 中有来源和许可证说明的数据
- `references/sources/README.md`，用于说明本地网页快照的组织方式
- `references/sources/GITHUB-REPOS.md`，第三方仓库地址记录（本地副本已删除）

### 默认不上传

- `github_res/`（已在 `.gitignore` 中），现在只保留 `anime` 一个库；其余研读过的第三方仓库已删除，地址记录在 `references/sources/GITHUB-REPOS.md`
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
5. 更新本 README 的目录或模式索引；如果只是暂时搁置的仓库，也在“待学习的开源仓库”中记录学习方向和状态。

## 使用边界

本项目用于个人学习、设计研究和自有 HTML 演示。参考网页中的品牌、图片、字体、代码和数据可能属于原作者或第三方，复用前需要单独确认许可证；素材库记录的是设计结构和学习过程，不代表获得了原网页素材的再分发权。
