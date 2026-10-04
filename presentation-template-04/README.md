# Presentation Template 04

低饱和竖向笔触封面与二维空间线路图目录的第一版。

入口：[index.html](index.html)，可直接双击离线打开，无需安装依赖。

## 视觉

- 封面：6 种交替配色（`#ed9874`、`#e9eeb9`、`#0c567d`、`#edb79c`、`#425066`、`#e4c6d0`）。笔触紧凑排列，长度、宽度和端点不同，由左下向右上抬升；最右侧从窗口顶部进入并提前结束。笔触数量随画布宽度增加，保持宽度与间距稳定。
- 目录：连续曲线路线、远近缩放的章节节点和投影。封面到目录的镜头展开约 2.2 秒，切换章节的镜头偏移约 2.2 秒，不锁定输入。
- 正文：保留模板一的 19 页内容、阅读页结构、图表和视频，改为冷白与柔和鼠尾草绿强调。

## 操作

按 Enter、空格或右方向键从封面进入目录。目录中使用左右方向键或数字键选章，Enter 或空格进入章节；也可直接点击章节节点。正文保持模板一的翻页、回目录、全屏和媒体操作。连续操作可提前完成转场；减少动态设置下显示静态画面。

## 内容

内容主稿为 `content/sample.md`，运行快照为 `data/presentation.config.js`。修改内容后在本目录运行 `python tools/build_content.py`。

开场实现为 `js/editorial-opening.js`、`js/spatial-stage.js` 和 `styles/opening.css`。正文渲染器为 `js/slide-renderer.js`。

## 开发环境

Worktree：`E:/Design-agent-template-04`。
分支：`agent/template-04`。
所有新增实现仅在 `presentation-template-04/` 内维护。
