# P0 基线记录

> 记录时间：2026-10-03（按当前工作区文件与执行时环境记录）
> 用途：保护重构前的行为与实验，不表示认可旧视觉，也不表示新模板已经实现。

## 环境

- 项目目录：`E:\Design\presentation-template`（重命名前原路径为 `spatial-presentation`）
- 执行环境：本机 Chromium / Playwright；Python 3.13.5、Node.js 22.19.0
- 页面运行方式：直接打开本地 `file://` 页面
- 原项目自动化脚本：`test/tools/check.py`，脚本写死 Chrome 路径 `C:/Program Files/Google/Chrome/Application/chrome.exe`

## 基线入口与证据

基线截图存放于本目录 `screenshots/`：

- `root-index.png`：正式根入口 `index.html` 的当前封面状态
- `sample-cover.png`、`sample-toc.png`、`sample-body.png`：测试样稿代表状态
- `opener-dom.png`、`opener-three.png`：两种实验开场的冻结终态

`test/shots/` 下原有的逐页截图、对比表、冻结帧和 `checks.json` 保留为历史实验结果，不挪用为新设计验收证据。

## 观察到的当前行为

### 根入口 `index.html`

- 加载 `data/presentation.config.js`，由 `js/app.js` 直接读取人工维护的 JavaScript 配置；没有 Markdown 内容主稿。
- 使用固定的逐页 DOM 翻页，所有类型共用横移 / 淡入过场；当前配置共 12 页型混排示例。
- 目录是第 2 张内容页中的平面项目列表；点击 INDEX 固定跳转到数组索引 1。
- 按键行为是整场线性翻页，方向键 / Enter / Space 可直接逐页前进或后退；数字键按页面索引跳转。
- 根入口没有统一固定 16:9 设计画布；CSS 使用视口字号，页脚、控制栏和重复页码可能竞争空间。
- 页面使用旧配置主题及 CSS 装饰；它不是已确认的暖白 / 墨黑 / 砖红空间化新设计。

### `test/` 实验入口

- `test/sample.html`、`test/review.html`、`test/dom/` 和 `test/three/` 属于实验，不是正式入口。
- 样稿使用 `test/content/slides.js` 内嵌 Markdown，包含 7 个样例页面；DOM / Three.js 两种开场实验共享这份样稿模型。
- 实验已经覆盖固定画布、封面到目录推进、返回目录记忆、简单流程图、静态 SVG 和 Plotly 交互图回退等能力，但结构、页型和视觉均未成为批准的正式契约。
- `test/tools/check.py` 绑定本机 Chrome 安装路径，并验证实验入口；不能据此宣称正式根入口符合新模板验收标准。

## 执行前 Git 状态说明

项目更名和多处工作区改动在本次执行开始前已存在。基线不清理、不还原这些文件；重构执行必须在现有用户改动之上继续，且只修改本计划规定的范围。
