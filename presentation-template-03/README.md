# Presentation Template 03

像素 / 代码字体与地球舞台的离线演示模板。英文使用 Departure Mono，中文展示标题使用 Fusion Pixel；封面使用 Library 中 `Three fragments, one system / Stars + Earth` 的原始 Stylized planet 模型，几何肖像已移除。目录保留高对比色块与侧面阴影，正文保留稳定阅读结构。主题 ID 暂沿用 `cubist-spatial`，不改变既有内容契约。

入口是 [index.html](index.html)，无需网络即可运行。封面按 `Enter`、空格或右方向键进入目录；目录中使用方向键、数字键或点击章节卡片进入内容。

面向组会进展与学科学习汇报的离线 HTML 演示模板。交付为完整文件夹，不生成 `.pptx`。内置 19 页、4 章示例；合成数据和待补来源均有明确标记，不代表真实研究结果。

## 当前状态

正式入口 `index.html` 已实现一套 19 页、4 章的完整回归演示，覆盖首版正文与结构页型：

- 封面和目录由本地 Three.js 地球舞台与可访问 DOM 文字共同渲染；
- 要点、陈述、图文、图表、流程、表格、比较、时间线、视频、引用由稳定的 DOM 阅读页渲染；
- 目录支持 3–8 章：3–4 章为单排，5–8 章为双排，不改变章节跳转契约；
- WebGL 不可用、Three.js 缺失或运行中丢失 WebGL 时，自动保留静态封面、可选章节目录和正文导航；
- 内容由 Markdown 主稿编译为运行快照；
- 字体以子集 WOFF2 随目录携带，离线可用。

| 项目 | 说明 |
| --- | --- |
| 渲染器 | 本地 Three.js（见 [design/DECISIONS.md](design/DECISIONS.md) D-06） |
| 内容源 | [content/sample.md](content/sample.md) |
| 编译 | `python tools/build_content.py` |
| 字体子集 | `python tools/subset_fonts.py` |
| 运行快照 | [data/presentation.config.js](data/presentation.config.js) |
| 审阅入口 | [review.html](review.html) |
| 开发工作区 | `E:/Design-agent-template-03`，分支 `agent/template-03` |

本 README 描述当前实现。继承的需求、设计方向与 P0–P6 文档记录旧编辑式方案，其中主题、页数和导航描述可能过时，不应据此覆盖模板 3 的现有方向。

## 当前开场

封面右侧使用 cmzw 的 Stylized planet 原模型，保留地球和云层贴图，配轻量星点与缓慢旋转；模型、贴图均随目录携带。进入目录时，地球缩小并移到章节下方，随选章重新定位。支持指针视差、点击选章和键盘选章。减少动态模式关闭旋转和视差；模型加载失败或 WebGL 不可用时显示同一模型生成的本地静态海报。

英文标题、编号与标签使用 Departure Mono 的真实像素字形，中文标题使用 Fusion Pixel 12px；不通过滤镜模拟像素。中文说明与长段落保留 Noto Sans SC，兼顾阅读。所有字体本地打包。

每章末页继续前进时返回目录，预选下一章；按 `Enter` / `Space` 进入下一章。目录与正文往返使用约 560ms 的透视展开 / 收回动画；再次导航可提前完成，减少动态模式直接切换。最后一章的参考资料页是演示末页，前进时保持停留。

## 运行

双击 `index.html`。演示画布会自适应并铺满当前窗口，支持 16:9、16:10、超宽屏及竖屏；文字与图表保持等比显示，不拉伸、不裁切。演示前按 `F` 进入浏览器原生全屏，退出全屏或调整窗口时会自动重新适配。

## 键盘

| 按键 | 操作 |
| --- | --- |
| `Enter` / `Space` / `→` / `↓` | 封面进入目录 |
| `Enter` / `Space` | 目录进入所选章；临时目录未改选时回原页 |
| `Space` / `→` / `↓` / `PageDown` | 章内下一页；章末返回目录并预选下一章；演示末页停留 |
| `←` / `→` | 目录中选章；正文中翻前后页 |
| `PageUp` | 正文上一页 |
| `↑` / `Backspace` | 正文打开临时目录；目录取消并回原页或封面 |
| `Home` / `End` | 目录选首章 / 末章；正文跳首张正文 / 最后一张内容页 |
| `1`–`8` | 目录选对应章节，不存在则不响应 |
| `P` / `M` | 视频播放暂停 / 静音 |
| `F` / `Escape` | 切换浏览器原生全屏 / 仅退出全屏 |

长按不连续翻页；转场期间至多保留一个待处理动作，后续导航可提前完成转场；原地选章立即响应。输入框及按钮的原生键盘操作不会重复触发翻页。

## 目录结构（当前实现）

```text
presentation-template-03/
  index.html                  正式演示入口
  review.html                 内容审阅入口
  content/sample.md           唯一人工内容主稿
  data/presentation.config.js 主稿生成的运行快照
  assets/charts/              已完成图表材料
  styles/                     tokens / base / slides / opening
  js/navigation.js            导航意图（纯逻辑）
  js/slide-renderer.js        阅读页渲染
  js/editorial-opening.js     Library 地球、目录与静态回退
  js/spatial-stage.js         Three.js 空间舞台
  js/app.js                   初始化与统一输入
  tools/build_content.py      Markdown → 运行快照
  tools/extract_library_planet.cjs 原始 Library 地球 → 离线资源快照
  tools/capture_planet_poster.py   本地模型 → 静态回退海报
  design/                     样稿、分镜与决策记录
  test/                       实验、基线与证据
  vendor/three.min.js         本地 Three.js
  vendor/GLTFLoader.js        同版本 glTF 加载器，适配经典脚本
  assets/models/             地球资源快照与海报
  LICENSES/                   第三方许可
```

## 文档

- [DESIGN-DIRECTION.md](DESIGN-DIRECTION.md)：首版视觉与页面方向。
- [IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md)：分阶段执行计划与验收条件。
- [REQUIREMENTS.md](REQUIREMENTS.md)：产品场景、交互和学术内容需求。
- [CREATION-WORKFLOW.md](CREATION-WORKFLOW.md)：内容制作与离线打包流程。
- [TECHNICAL-ARCHITECTURE.md](TECHNICAL-ARCHITECTURE.md)：旧原型方案，仅作历史参考。
- [design/DECISIONS.md](design/DECISIONS.md)：已确认与待确认的设计决策。

## 验证

```text
python test/tools/check_formal.py              # 84 项：全部页型、视口、媒体、引用、离线
python test/tools/check_keyboard.py            # 46 项：键盘、快速输入、全屏与焦点
python test/tools/check_editorial_opening.py   # 39 项：地球旋转、视差、文字边界、减少动态
python test/tools/check_chapter_transitions.py # 33 项：章节回目录、双向动画、缩放
python test/tools/check_cubist.py              # 48 项：3–8 章容量、静态回退、WebGL 丢失
python test/tools/check_planet.py              # 14 项：Library 一致性、像素字体、模型失败回退
```

从 `presentation-template-03/` 目录执行。测试需要 Python、Playwright、Pillow 与本地 Chrome 或 Playwright Chromium，仅用于开发；观看演示不需要。新截图输出到系统临时目录 `presentation-template-03-opening/` 和 `presentation-template-03-cubist/`，不写入其他 Agent 的工作区。历史实验仍保留，但不作为当前模板 3 的验收依据。

## 离线与资源

页面不使用 CDN、远程字体、远程素材或网络 API。字体、Three.js、GLTFLoader、模型快照与许可证随目录携带。整个文件夹可复制到没有开发环境的电脑直接打开；运行时不依赖父目录 Library。

- 地球基于 [Stylized planet](https://sketchfab.com/3d-models/stylized-planet-789725db86f547fc9163b00f302c3e70)，作者 [cmzw](https://sketchfab.com/cmzw)，CC BY 4.0；详见 `LICENSES/planet-license.txt`。
- Departure Mono：Helena Zhang & Tobias Fried，MIT；详见 `LICENSES/departure-mono-LICENSE.txt`。
- Fusion Pixel：SIL OFL；字体及来源字体许可见 `LICENSES/fusion-pixel/`。
- 模型提取工具需要仓库的 Library 原文件，仅用于开发；观看演示不需要。

## 已知限制

- 目录为立体棱面章节构成，支持 3–8 章；不提供多主题切换。
- 竖屏保留与桌面相同的等比演示画布，文字会较小；正式演讲仍建议横屏或全屏。
- 内容主稿使用受限 Markdown 方言；新增页型需要改渲染代码，不能仅靠内容。
- 视频与图表为预制本地材料；播放阶段不生成图表、不做统计计算。
- `test/` 下的历史实验与截图仍保留，会增大交付体积；它们不参与运行时。
