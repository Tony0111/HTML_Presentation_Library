# Anime.js Examples — offline gallery

Anime.js v4 官方 26 个示例（共 36 个页面）的**离线改造版**。原示例使用 ES Module，双击打不开；这里把它们改成了普通脚本，库内嵌/本地引用，`file://` 直接运行。

## 使用

双击本目录下的 `index.html`，左侧选示例，右侧实时预览。不需要服务器，不需要网络。

也可以直接双击任意子目录里的页面，例如：

```text
stagger/index.html
svg-line-drawing/index.html
text/hover-effects/index.html
auto-layout/periodic-table/index.html
```

## 这里做了什么

1. 复制 `github_res/anime/examples` 的完整目录结构，共享资源（CSS、字体）相对路径不变。
2. 把 `import { ... } from '.../dist/modules/index.js'` 改成 `const { ... } = anime;`，配合内嵌的 UMD 库。
3. 把 `<script type="module">` 改成普通 `<script>`，并插入库文件引用。
4. 生成 `index.html` 画廊，把 36 个页面汇总在一起浏览。

## 状态

| 项目 | 数量 |
| --- | --- |
| 总页面 | 36 |
| 离线可双击 | 35 |
| 仍需额外库 | 1（`threejs/transforms`） |

`threejs/transforms` 依赖 three.js 模块版、anime 的 three.js 适配器和 OrbitControls，改造复杂度高，暂时保留原样。需要时可以单独处理。

## 关于 tweaks

`text/scramble`、`text/scramble-tl`、`text/split-effects`、`text/split-playground` 原本依赖 `tweaks` 控制面板包。

这些示例的动画本身是自动运行的，所以这里用 `_shim/tweaks-shim.js` 顶替：它把每个 tweak 解析成默认值，并把面板 API 变成空操作。**代价是这些页面没有可调参数的控制面板**，动画效果本身完整，仍然可以在鼠标悬停/点击时触发。

`tweaks-shim.js` 不是 `tweaks` 的通用替代品，只服务于这四个页面。

## 示例分组

```text
stagger/                错峰动画
svg-graph/              折线图
svg-line-drawing/       路径描边绘制
text/hover-effects/     文字悬停效果
timeline-*/             时间轴、无缝循环、压力测试
draggable-*/            可拖拽轮播
onscroll-*/             滚动驱动
auto-layout/            布局动画（9 个页面）
canvas-2d/              Canvas 绘制
additive-*/             加色混合
clock-playback-controls/ 播放控制
layered-css-transforms/ 分层变换
irregular-playback-typewriter/ 打字机
animatable-follow-cursor/ 跟随指针
animejs-v4-logo-animation/ Logo 动画
advanced-grid-staggering/ 网格错峰
```

## 许可

Anime.js 为 MIT 许可，版权归 Julian Garnier。库文件与许可原文见 `references/libs/anime/`。
