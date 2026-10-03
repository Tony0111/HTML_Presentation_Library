# Presentation Template

面向组会进展与学科学习汇报的离线 HTML 演示模板。首版视觉方向已确认：极简编辑式空间叙事、暖白正文、墨黑舞台、砖红强调；封面进入目录需要连续的空间纵深。目标通过有限页型和 Markdown 内容工作流降低制作门槛。

## 当前状态

正式入口 `index.html` 已实现一套 24 页、4 章的完整回归演示，覆盖首版全部页型：

- 封面、目录、章节扉页、结尾由本地 Three.js 空间舞台渲染；
- 要点、陈述、图文、图表、流程、表格、比较、时间线、视频、引用由暖白阅读页渲染；
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
| 执行进度 | P0–P6 已完成 |

执行依据与逐阶段状态见 [IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md)。

## 运行

双击 `index.html`。建议在 1920 × 1080 或常见 16:10 桌面屏幕使用，演示前按 `F` 进入浏览器原生全屏。

## 键盘

| 按键 | 操作 |
| --- | --- |
| `Enter` / `Space` / `→` / `↓` | 封面进入目录；目录进入所选章；正文下一页 |
| `←` / `→` | 目录中选章；正文中翻前后页 |
| `↑` / `Backspace` | 正文返回目录 |
| `Home` / `End` | 首张正文 / 结尾 |
| `F` | 浏览器全屏 |

## 目录结构（当前实现）

```text
presentation-template/
  index.html                  正式演示入口
  review.html                 内容审阅入口
  content/sample.md           唯一人工内容主稿
  data/presentation.config.js 主稿生成的运行快照
  assets/charts/              已完成图表材料
  styles/                     tokens / base / slides
  js/navigation.js            导航意图（纯逻辑）
  js/slide-renderer.js        阅读页渲染
  js/spatial-stage.js         Three.js 空间舞台
  js/app.js                   初始化与统一输入
  tools/build_content.py      Markdown → 运行快照
  design/                     样稿、分镜与决策记录
  test/                       实验、基线与证据
  vendor/three.min.js         本地 Three.js
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
python test/tools/check_formal.py    # 正式入口：24 页、全部页型、视口、减少动态、媒体、引用、离线
python test/opening/tools/verify.py  # 开场空间研究：纵深、选章、失败回退、投影一致
python test/tools/check.py           # 旧实验基线，仍保留
```

测试需要 Playwright 与本地 Chrome，仅用于开发；观看演示不需要。`test/opening/shots/` 与 `test/baseline/` 保存设计确认证据。

## 离线与资源

页面不使用 CDN、远程字体、远程素材或网络 API。字体子集、Three.js 与许可证随目录携带（`assets/fonts/`、`vendor/`、`LICENSES/`）。整个文件夹可复制到没有开发环境的电脑直接打开。

## 已知限制

- 目录为空间路径形式，首版固定；不提供多主题切换。
- 内容主稿使用受限 Markdown 方言；新增页型需要改渲染代码，不能仅靠内容。
- 视频与图表为预制本地材料；播放阶段不生成图表、不做统计计算。
- `test/` 下的历史实验与截图仍保留，会增大交付体积；它们不参与运行时。
- 结尾页复用封面文案结构；如需独立结束文案需在内容契约中扩展。
