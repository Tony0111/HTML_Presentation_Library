# 当前技术栈与实现说明

本文描述当前代码，不是未来规划。制作流程见 [CREATION-WORKFLOW.md](CREATION-WORKFLOW.md)，普通内容修改先看 [EDITING-GUIDE.md](EDITING-GUIDE.md)。

## 1. 技术栈

| 层 | 使用技术 | 作用 |
| --- | --- | --- |
| 演示入口 | 静态 HTML、原生 JavaScript 普通脚本 | `file://` 下直接加载本地文件 |
| 阅读页 | HTML DOM、CSS Grid / Flex、SVG | 标题、要点、数据表、流程、时间线、来源与媒体 |
| 空间效果 | 本地 Three.js r160、WebGL | 折页封面、目录、粒子 Thanks |
| 纹理生成 | 浏览器 Canvas 2D | 折页文字、静态颗粒、阴影与 Thanks 文字采样 |
| 动画 | CSS keyframes、Web Animations API、requestAnimationFrame | 关键词、双向转场、折页与粒子更新 |
| 视频 | 原生 HTML `<video>` | 本地视频、用户触发、静音与离场重置 |
| 全屏 | Browser Fullscreen API | 全屏切换与尺寸重新适配 |
| 内容工具 | Python 标准库 `json` / `re` / `pathlib` | 受限 Markdown 编译为运行快照 |
| 字体工具 | Python fontTools、Brotli | 按实际字符生成 WOFF2 字体子集 |
| 开发验收 | Python Playwright、Chrome / Chromium、Pillow | 导航、离线、视口、像素、动画与截图对比 |

不使用 React、Vue、Node.js 运行时、npm 构建、后端、数据库、CDN、在线字体或运行时 AI。模板没有前端安装或构建步骤。

Three.js 以 `vendor/three.min.js` 普通脚本随目录携带，发布的是 `window.THREE`。当前文件为 r160；它的旧非模块发行形式会提示弃用警告，但不是加载失败。升级 Three.js 需要另做兼容验证，不应仅为消除警告换成 CDN 或 ES Module，从而破坏本地离线运行。

## 2. 内容到画面的数据流

```text
content/sample.md
  -> tools/build_content.py（开发期）
  -> data/presentation.config.js
  -> window.PRESENTATION_CONFIG
       -> review.html：文本审阅
       -> js/app.js：输入、状态与页面调度
            -> js/slide-renderer.js：阅读页 DOM
            -> js/spatial-stage.js：共享 WebGL Renderer
                 -> js/editorial-opening.js：折页封面与目录
                 -> js/particle-thanks.js：粒子结束页
```

浏览器不解析 Markdown，也不 `fetch()` JSON。普通脚本快照避免本地文件的请求限制。主稿是唯一人工内容源，快照不手改；重新编译后浏览器需重新加载。

编译器只支持修改指南中定义的有限语法：页 ID 与页型标题、`@key` 元数据、标题行、要点、引文和 JSON 围栏。它不是完整 CommonMark / Markdown 引擎，不支持任意 HTML、嵌套语法或插件。

章节按章 ID 首次出现顺序生成，包含连续编号、中英名称和第一页 ID；检查章节连续性、首章页元数据、引用、流程节点及 1-8 章范围。素材存在性、主稿与快照一致性、入口与导航由 `check_deck.py` 补充检查。

## 3. 模块职责

| 文件 | 维护范围 |
| --- | --- |
| `index.html` | DOM 容器、本地脚本与样式加载顺序、演示控件 |
| `review.html` | 同一快照的文字、页序、章节与资源路径审阅 |
| `js/app.js` | 启动、字体等待、画布适配、当前页状态、统一键盘输入、全屏、目录与正文转场 |
| `js/navigation.js` | 纯导航意图、空间页分类、章节归属，不操作 DOM |
| `js/slide-renderer.js` | 转义内容、短引、各阅读页型 DOM / SVG 与页脚 |
| `js/media.js` | 当前视频播放暂停、静音、错误提示及离场释放 |
| `js/spatial-stage.js` | 共享 Renderer、当前空间场景、渲染循环、后台暂停与 resize |
| `js/editorial-opening.js` | 目录 DOM、章节折页纹理、立体布局、封面与目录连续展开、视差 |
| `js/particle-thanks.js` | 文字采样、GPU 粒子聚合、局部指针扰动、点击散开与场景生命周期 |
| `styles/tokens.css` | 本地字体声明、共用颜色、字号角色、基础尺寸变量 |
| `styles/base.css` | 重置、逻辑画布、空间/正文分层、控件 |
| `styles/slides.css` | 阅读页版式与按页型变化的砖红装饰 |
| `styles/opening.css` | 开场、关键词动画、扫描纹理、Thanks 的 DOM 样式 |

`index.html` 按依赖顺序加载 Three.js、快照、导航、阅读渲染、媒体、两种场景、共享舞台，最后执行 `app.js`。调整模块或加载顺序必须检查初始化依赖。

## 4. 渲染与生命周期

正文使用可访问的 DOM，表格是 HTML 表格，流程是 SVG，图表是已做好本地 SVG / 图片。不会把整页正文转成 WebGL 纹理。封面与目录标题、章节信息仍在 DOM；纸张印刷内容使用 CanvasTexture。

Thanks 将 Canvas 文字遮罩采样为 BufferGeometry 点，ShaderMaterial 在 GPU 上做聚合、轻微运动、指针排斥与纵深散开。与开场共用一个 Renderer，不再初始化第二个 WebGL Canvas。该实现只视觉参考素材库，没有复制原粒子项目的代码或图片。

舞台保持单一 requestAnimationFrame 渲染循环，文档进入后台时暂停；隐藏的粒子场景不更新。目录与正文的透视转场由 Web Animations API 完成，导航期间至多保留一个待处理动作，后续输入可提前结束转场。

空间场景启动时读取系统减少动态偏好或 `?reduced=1`，停用装饰运动并保留导航。改变系统偏好后，重新加载演示可确保全部场景采用新设置。

视频默认静音、不自动播放；离场暂停并将时间重置为零。`P` 与 `M` 用于媒体，翻页键用于导航，不同时消费同一输入。

## 5. 视口适配

`app.js` 以 1920 × 1080 为设计基准计算：

```text
scale = min(viewportWidth / 1920, viewportHeight / 1080)
logicalWidth = viewportWidth / scale
logicalHeight = viewportHeight / scale
```

DOM 舞台等比缩放，逻辑画布扩展填满当前窗口，额外竖向空间用于居中内容。Three.js 相机投影与渲染尺寸同步调整，像素比上限为 2。标题和材料不会分别按视口拉伸。

章节数改变时，目录网格列数、折页数量、间距、缩放和编号随配置计算；砖红/暖白按位置交替。已用 3/4/5/6 章样稿验证桌面、超宽屏和手机横竖屏。更多章节与长名称仍需要视觉检查，不能仅以编译成功判断容量。

## 6. 开发环境

只生成内容快照：Python 3.10 或更高版本，使用标准库，不需要安装 Markdown 库。

浏览器测试与图像对比：

```bash
python -m pip install playwright pillow
```

脚本优先使用 `C:/Program Files/Google/Chrome/Application/chrome.exe`。没有该 Chrome 时会使用 Playwright Chromium，需要先安装：

```bash
python -m playwright install chromium
```

字体子集：

```bash
python -m pip install fonttools brotli
```

当前字体源路径写在 `tools/subset_fonts.py`：

- `C:/Windows/Fonts/NotoSerifSC-VF.ttf`
- `C:/Windows/Fonts/NotoSansSC-VF.ttf`
- 用户目录下 `AppData/Roaming/Python/Python313/site-packages/matplotlib/mpl-data/fonts/ttf/DejaVuSansMono.ttf`

这些源字体不是交付 WOFF2 子集；制作机器上需存在或显式调整为有再分发许可的源文件路径。matplotlib 路径仅用于寻找源字体，不是演示的运行依赖。当前工具缺源文件会打印 `missing source` 并继续，必须人工判为未完成，不能把 `done` 当作字体成功更新。

## 7. 验证与维护边界

普通内容修改运行 `tools/build_content.py` 与 `test/tools/check_deck.py`；新增字符后重建字体。渲染器或共享契约修改运行 [test/README.md](test/README.md) 所列的回归测试，覆盖当前示例、可变章节、关键词、折页、粒子、视频与转场。

测试包含截图、Canvas 非空白像素和前后帧变化检查；软件渲染测试不能保证真实演示设备达到某个帧率，也不能替代投影环境的可读性检查。

已知边界：没有 `.pptx` 导出、任意布局编辑器、公式引擎或通用图表生成器。WebGL 不可用时现有代码提供有限静态提示，不是完整静态封面/目录的等效实现；正式交付前需确认目标浏览器 WebGL 可用。`review.html` 不显示粒子和转场，不能作为视觉验收替代。

新增页型要同时修改编译器允许类型、渲染器、样式与测试；若是新的空间页型，还需更新导航分类和舞台分发。普通内容 AI 不应进行这类改动。升级本地库、换字体或改变导航必须单独做回归，不为一场演示引入在线服务或网络资源。

## 8. 许可与离线边界

Three.js 使用 MIT 许可；Noto 字体使用 SIL OFL 1.1；DejaVu 使用其随附许可。文本位于 `LICENSES/`，分发时随对应库和字体保留。用户新增图表、媒体与字体必须另外确认授权。

运行文件只引用演示目录内路径，不引用 `../assets/`、CDN、上级素材库或原始研究仓库。直接复制完整演示目录即可观看；Python、Playwright 与源字体只在制作和验收阶段需要。
