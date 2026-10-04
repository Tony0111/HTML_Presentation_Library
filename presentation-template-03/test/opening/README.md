# Opening study（P2）

封面进入目录的空间研究，用来验证已确认的 `editorial-spatial` 开场方向，并比较两种渲染器。

## 入口

- `dom/index.html`：DOM / CSS 3D 版本
- `three/index.html`：Three.js / WebGL 版本
- `compare.html`：并排比较，共享进度

全部页面在 Chrome / Edge 中以 `file://` 直接打开，不需要服务器或构建步骤。

## 共同内容

两个入口共享：

- `shared/storyboard.js`：内容、世界坐标、镜头、共享投影、砖红阅读路径；
- `shared/driver.js`：统一键盘、冻结进度、减少动态、返回与失败回退。

唯一差异是 `window.OPENER`（渲染器）。这样可以确认空间动作本身，而不是比较两套实现。

## 参数

- `?p=0` / `?p=0.25` / `?p=0.5` / `?p=0.75` / `?p=1`：冻结到指定进度；
- `?reduced=1`：减少动态路径；
- `?auto=1`：加载后自动播放开场。

键盘：`Enter` / `Space` 前进，`↑` / `Backspace` 返回，`←→` 选章，`F` 全屏，`R` 重放。

## 证据

```text
python tools/capture.py   # 五个冻结帧 + 每渲染器一段开场录屏，写入 shots/
python tools/verify.py     # 纵深、减少动态选章、失败回退、DOM 投影一致性
```

开发期需要 Playwright；观看演示不需要。`shots/` 是 P2 的设计确认证据，不代表正式入口已经实现。

## 边界

- 这是研究原型，不是正式入口，也不是三个主题或旧玻璃屏风方案。
- 正式渲染器的选择记录在 `design/DECISIONS.md`，待确认。
