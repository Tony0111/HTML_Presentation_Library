# 液体折射背景（用于 HTML 演示）

## 来源观察

- 来源：Shery.js 的 liquid 图像效果，原理见 [sheryjs-image-effect-styles.md](sheryjs-image-effect-styles.md)。
- 本页是最简版：背景完全静止，鼠标悬停处有一个平滑的曲率放大，离开后缓慢恢复。没有噪声、没有持续晃动。
- 等价于 playground 里把 Wobble 拉到最大，只留下 Pointer lens 的效果。

## 核心机制

1. 一张铺满屏幕的图（默认是程序生成的渐变加淡网格，也可以传入自己的 canvas 或图片）作为 WebGL 纹理。
2. 片元着色器只做一件事：以指针为中心，用 `uv = m + (u - m) * (1 - strength * k)` 把采样点向指针收拢，画面就在该处鼓起。
3. `k` 是 smoothstep 的衰减遮罩，边缘平滑过渡，远处 `k = 0`，完全不动。
4. 指针位置和 `gate` 都在 JS 里平滑追随（系数 0.08 / 0.06）。首次移动时直接从指针处开始，不会从画面中心滑过来。
5. 脚本里没有时间变量，鼠标不动、不悬停时画面是纯静态首帧。

## 本地复刻方式

文件都在 `references/rebuilds/sheryjs-liquid-lens/`：

| 文件 | 用途 |
| --- | --- |
| `liquid-background.js` | 背景版脚本，约 120 行，无依赖，普通 `<script>` 引入即可 |
| `background-demo.html` | 最小演示页，双击打开 |
| `index.html` | 完整 playground，带滑杆和 JSON 预设 |

```html
<script src="liquid-background.js"></script>
<script>
  const bg = LiquidBackground({
    colors: ["#05070b", "#12304a", "#2e7c6b"], // 或 image: canvas / <img>
    strength: 0.5, radius: 0.28, dpr: 1.5
  });
  // bg.set({ strength: 1.4 }); bg.pause(); bg.resume(); bg.destroy();
</script>
```

参数：`strength` 放大幅度（0.2–0.8，越大鼓得越明显），`radius` 影响范围（占屏幕宽度的比例，约 0.1–0.6）。

验证情况：在 headless Chromium（SwiftShader）里 shader 编译和链接通过。指针放在 (260, 200) 时截图，该处网格向外鼓起，远处保持笔直；不悬停时画面为直网格。没有用真实鼠标测过手感。真机 GPU、传入真实图片、投影仪环境都没有测过。

## 接入演示项目的注意事项

以下以 `presentation-template/` 为例，规则来自它的 `REQUIREMENTS.md` 第 8.3 节。

1. **只用在封面、目录、章节页。** 统计图、表格、流程图、研究图和视频页要静态背景。离开这些页时调用 `bg.destroy()`，进入时再创建。`pause()` 只会让曲率放大回到静止，不会停止绘制。
2. **同一页只保留一个运动焦点。** 该项目的 `#stage` 已经是 three.js 的全屏 canvas（`z-index: 0`，封面时还有 blur 和缩放）。不要在同一页同时开两个全屏动态层，二选一。
3. **层级。** 脚本默认 `z-index: 0`、`position: fixed`、`pointer-events: none`。`body` 如果有不透明背景，用 `-1` 会被盖住，截图是纯黑就是这个原因。正文内容层必须是 `z-index ≥ 1`。
4. **曲率放大跟着鼠标位置走。** 脚本监听 `window` 的 `pointermove`，离开浏览器窗口才算离开。演示者用键盘翻页、没碰过鼠标时背景保持静止。鼠标停在窗口内不动，指针附近的曲率放大会一直持续。如果想要“停下来就恢复”，需要另加一个空闲计时器，目前没有。
5. **`file://` 下的图片。** 直接加载相对路径图片会让 WebGL 纹理被浏览器拒绝。可选做法：程序生成的渐变（默认）、先画到 canvas 再传入、内嵌 data URI。传入真实图片这一条没有测试过。
6. **文字可读性。** 放大会让背景的高光和网格局部位移。大字标题没问题，小字注释下方要加半透明暗层，或者降低 `strength`。
7. **减少动态模式。** 系统开启“减少动态效果”时，脚本不会产生曲率放大，只显示静态首帧，符合需求文档的要求。
8. **性能。** `dpr` 上限默认 1.5，页面不可见时不绘制。投影仪常是 1080p，足够。
9. **脚本加载。** 该项目禁止 CDN 和 ES module，用 `<script defer src="…">` 放在 `js/app.js` 之前即可，与 `vendor/three.min.js` 不冲突。
10. **不要改运行文件的前提。** `presentation-template/` 当前仍是旧原型，需求文档说明完整模板尚未实现。接入前先确认要改的是哪个页面模板。

## 给 AI 的接入指令（复制使用）

```
把 references/rebuilds/sheryjs-liquid-lens/liquid-background.js 复制到 <项目>/js/，
在 index.html 的 js/app.js 之前用 <script defer> 引入。
只在 <封面/章节页> 创建 LiquidBackground，其余页面调用 destroy()。
配色用项目主题变量：<颜色列表>。
保持内容层 z-index ≥ 1，不改变已有键盘导航。
完成后用 Chrome 打开，确认：静止时背景不动，鼠标悬停处平滑鼓起、离开后恢复，开启减少动态后不产生曲率放大。
```

## 适合使用

- 深色封面、目录、章节扉页
- 抽象渐变或海报类背景，需要让静态背景对鼠标有反馈

## 使用边界

- 不用于正文、图表、表格和视频页。
- 不要同时叠加视差、镜头推进和这个背景。
- 放大幅度保持克制，背景不抢标题的注意力。
- 来自 Shery.js（MIT，© 2023 Harsh Vandana Sharma 和 Aayush Chouhan）的是思路和公式；本页代码是重写的，不含其源码。
