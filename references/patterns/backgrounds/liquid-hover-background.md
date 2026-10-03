# 液体悬停背景（Liquid hover background）

## 来源观察

- 来源：[Shery.js](../../../github_res/sheryjs/readme.md) 的 liquid 图像效果（MIT），拆解见 [sheryjs-image-effect-styles.md](../webgl/sheryjs-image-effect-styles.md)。
- 原效果是“图片 + 噪声折射 + 指针放大镜”。这里**去掉放大镜**，只保留折射变形，并把它改成全屏背景。
- 核心是一条公式：`uv += refract(vec2(0.), noiseSurface, eta)`。噪声没有位置感，图像上的直线会被推成缓慢的波浪。

## 视觉结构

1. 静止时背景是一张普通图片或渐变，没有任何运动。
2. 指针进入页面后，`gate` 以 0.07 的系数平滑升到 1，背景才开始变形。
3. 指针离开后 `gate` 回到 0，变形自然平静下来，不会突然跳回。
4. 背景图要有结构（网格、纹理、线条、照片细节）。纯色渐变几乎看不出折射，所以默认渐变上叠了一层淡网格。

## 本地复刻方式

文件都在 `references/rebuilds/sheryjs-liquid-lens/`：

| 文件 | 用途 |
| --- | --- |
| `liquid-background.js` | 背景组件，约 110 行，无依赖，普通 `<script>` 加载 |
| `background-demo.html` | 最小示例，直接双击打开 |
| `index.html` | 完整 playground，有滑杆、预设和 JSON 导出 |

接口：

```html
<script src="liquid-background.js"></script>
<script>
  const bg = LiquidBackground({
    colors: ["#05070b", "#12304a", "#2e7c6b"], // 或 image: canvas / <img> / ImageBitmap
    strength: 1,   // 变形幅度
    speed: 2,      // 流动速度
    scale: 1,      // 噪声尺度，越大越细碎
    eta: 0.72,     // 折射系数
    dpr: 1.5,      // 像素比上限
    zIndex: 0,     // 画布层级
    container: document.body
  });
  bg.set({ strength: 1.4 }); bg.pause(); bg.resume(); bg.destroy();
</script>
```

验证情况：headless Chromium 下 shader 编译、链接通过；静止截图网格笔直，悬停截图网格出现波浪变形，没有放大。真实 GPU 上的帧率和观感未测。

## 接入 PPT / 演示页前必须注意

以下针对本仓库的 `presentation-template/`，其他项目按同样思路检查。

### 1. 与现有 WebGL 舞台的关系

- `presentation-template/index.html` 里 `#stage`（Three.js 画布，`z-index: 0`）和 `.noise`（`z-index: 1`）都是全屏 `position: fixed`。再加一个全屏 WebGL 画布会产生**第二个 WebGL 上下文**，两者会互相遮挡。
- 推荐只在不需要 Three.js 舞台的页面使用：把 `container` 指向要显示背景的容器，并让该页面的 `#stage` 隐藏；或者用 `bg.destroy()` 在切页时销毁、`LiquidBackground()` 重新创建。
- 现有项目没有改动，这里的接入方式**还没有在 PPT 里实际跑过**，需要第一次接入时预览确认。

### 2. 层级与点击

- 画布默认 `pointer-events: none`，不会挡住按钮和键盘导航。
- **不要用 `z-index: -1`**：`body` 有不透明背景（`var(--ink)`）时，画布会被盖住，页面看起来是纯黑。这个问题在测试中真实出现过。
- 正文要放在画布之上（`position: relative; z-index: 1`）。

### 3. 只在合适的页面启用

对照 `REQUIREMENTS.md` 8.3 动态背景：

- 封面、目录、章节页可以使用。
- 正文默认显著减弱；统计图、表格、流程图、研究图、视频页必须静态，图表阅读期间背景保持静态（见 8.2/8.3）。
- 同一页只保留一个主要运动焦点，不要同时有镜头推进、文字动效和背景变形。
- 切到静态页时调用 `bg.pause()`。注意：`pause()` 只把变形强度归零，画布仍在每帧重绘；需要完全停掉就用 `bg.destroy()`。

### 4. 背景图片与 `file://`

- 这个项目要求双击 `index.html` 就能运行，不使用 CDN、`fetch()` 或 ES module。
- 从 `file://` 打开时，Chrome 会把本地 `<img>` 当作跨域资源，**WebGL 纹理上传会失败**。可用的做法：
  - 用程序生成的渐变或 Canvas 绘图（默认做法，最稳）。
  - 把图片转成 data URI 再加载。
  - 把图片画进 canvas 的前提是图片本身不是跨域的，所以同样要用 data URI。
- 外部图片文件直接传路径是**不行的**。

### 5. 输入事件

- 监听的是 `window` 的 `pointermove`，所以背景在内容后面也能响应。
- 演示时通常是投影加遥控笔，几乎没有鼠标移动，变形几乎不会触发。如果主要用键盘或遥控笔演示，这个效果基本看不到，需要提前决定是否改成“进入页面时自动播放几秒”。
- 触屏没有持续 hover，保持静态首帧即可。

### 6. 无障碍与性能

- `prefers-reduced-motion: reduce` 时组件不会启用变形，背景保持静态。需求文档要求的“减少动态模式关闭装饰性背景运动”已满足。
- 切到后台标签页时帧循环自动跳过并重置时间，返回后不会跳变。
- `dpr` 默认上限 1.5，高分屏投影时画面不会过度耗电；需要更清晰可以调到 2。
- 没有 WebGL 时回退为纯色背景，不会报错。
- 文字对比度：背景变形只在悬停时发生，但背景图亮部（如渐变右下角的橙色）会降低白字对比度，使用前检查正文颜色，必要时在文字后加一层半透明深色。

### 7. 让 AI 写接入文件时的提示

选用这个效果后，建议对 AI 说明：

> 使用 `references/rebuilds/sheryjs-liquid-lens/liquid-background.js`，复制到项目的 `js/` 并用普通 `<script defer>` 引入。只在封面、目录、章节页启用；统计图和正文页销毁或暂停；背景图用程序生成的渐变或 data URI；不要使用 `z-index: -1`；先读 `references/patterns/backgrounds/liquid-hover-background.md` 的“接入注意”。

## 适合使用

- 演示的封面、目录、章节扉页背景
- 深色主题、只想要一点“活着”的感觉的首屏
- 需要对指针产生反馈，但不想要放大、拖尾等强效果的场景

## 使用边界

- 变形幅度保持克制（`strength` 在 0.5–1.5），背景不应该盖过标题。
- 不要用在需要精确读数的页面，变形会让图表、表格和文字看起来不稳定。
- 背景图没有结构时折射几乎看不到，需要选带纹理、线条或照片细节的图。
- 光源是 Shery.js 的 liquid 公式（MIT）；这里是独立重写的精简版，没有复制原项目代码。
