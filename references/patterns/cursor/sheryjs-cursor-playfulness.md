# Shery.js 的指针玩趣套件（cursor playfulness）

## 来源观察

- 源码：`github_res/sheryjs/src/Effects.js` 前半段（`mouseFollower` / `imageMasker` / `makeMagnet` / `textAnimate` / `hoverWithMediaCircle`）+ `src/Shery.css`
- 这一组完全不碰 WebGL，只用 GSAP + DOM + CSS `mix-blend-mode`，是库里"可以直接搬进任何项目"的部分
- 依赖只有 GSAP；每个效果的对外 API 都是一行 `Shery.xxx(selector, opts)`
- 观感来源基本是 Cuberto 那一脉：自定义光标 + 悬停放大 + 媒体镜头 + 磁吸

## 模式 1：会拉伸的光标（skew mouse follower）

```js
diff = gsap.utils.clamp(15, 35, dets.clientX - posx)   // 这一帧走了多远
posx = dets.clientX
gsap.to(".mousefollower", { width: diff + "px", ease: Expo.easeOut, duration: 1 })
gsap.to(".mousefollower", { top: dets.clientY, left: dets.clientX, duration: 1, ease: Expo.easeOut })
```

CSS 端只有：`position: fixed; transform: translate(-50%,-50%); border-radius: 50%; pointer-events: none; mix-blend-mode: exclusion; background: black`。

- 关键洞察：**把"移动速度"直接当成"宽度"**，一个 clamp 就得到果冻式拉伸，不需要顶点、不需要 shader、不需要角度计算（所以它只在横向上拉伸，纵向不变——这反而让它看起来更像"被甩出去"）。
- 上下叠两个 `.mousefollower`（`#behindmouse` 是白色的），靠 `mix-blend-mode: exclusion` 在深浅背景上都能保持可见。这是"一个光标适配任意底色页面"的最省Solution，比 `difference` 更耐脏。
- `mouseenter/mouseleave` 控制 opacity，避免离开窗口时光标残留在屏幕上。

## 模式 2：overflow 隐藏 = 免费 Ken Burns（imageMasker）

```js
parent.replaceChild(mask, elem)   // 用 div.mask 包住原 img
mask.addEventListener("mouseenter", () => gsap.to(globalMouseFollower, { opacity: 0 }))
mask.addEventListener("mousemove", () => gsap.to(elem, {
  scale: opts.scale || (elem.getBoundingClientRect().width < 450 ? 1.05 : 1.025)
}))
mask.addEventListener("mouseleave", () => gsap.to(this.childNodes[0], { scale: 1 }))
```

配套 CSS：`.mask { position: relative; display: inline-block; overflow: hidden; }`

- 全部结构就这一句 `overflow: hidden`。缩放不会溢出、不会改变布局、不会推挤邻居，这是"hover 放大"最正确的做法（很多人用 `transform: scale` 却没有 overflow 容器，导致重叠和滚动条）。
- **按元素尺寸决定放大倍率**：小图放大 1.05，大图只放 1.025。原因很实际——同样的倍率，大图视觉上跳得更厉害。这类"跟着尺寸自适应的常数"是设计判断，值得单列进自己的规则表。
- 跟随鼠标的 `.circle` 标签（`text: "View More"`）用 `duration: 2` 的超长缓动 → 它永远落在指针后面，形成"引力滞后"。尺寸也用 `clamp(50, 70, width*0.3)` 自适应。
- 反面：`mousemove` 里每次 `mask.appendChild(circle)`（重复插 DOM）；mouseleave 用 `this.childNodes[0]` 找图片，一旦里面还有别的节点就错。抄思路别抄这两行。

## 模式 3：磁吸（makeMagnet）

```js
var bcr = elem.getBoundingClientRect()
var zeroonex = gsap.utils.mapRange(0, bcr.width,  0, 1, dets.clientX - bcr.left)
var zerooney = gsap.utils.mapRange(0, bcr.height, 0, 1, dets.clientY - bcr.top)
gsap.to(".mousefollower", { scale: 4, duration: 0.5 })
gsap.to(elem, { x: lerp(-20, 20, zeroonex), y: lerp(-20, 20, zerooney) })
// mouseleave → x: 0, y: 0
```

- 这不是物理，是**归一化坐标映射**：`mapRange` → `lerp(-20, 20, t)`。整个元素就是一个 0..1 的指针场，位移上限固定 20px，所以永远不会跑掉。
- 同时把光标放大 4 倍 → "吸附成功"的反馈由两个通道一起说（元素动 + 光标变大），这是这类微交互显得"讲究"的原因。
- 可直接推广：磁吸旋转（`rotate: lerp(-8, 8, x)`）、磁吸高光位置（把 x/y 写进 CSS 变量再喂给 `radial-gradient`）。同一段 3 行代码就能变出好几种。

## 模式 4：字符级文本动画（textAnimate）

```js
elem.textContent = elem.textContent.trim().replaceAll(" ", "\u2002")  // en space 保住空格宽度
elem.textContent.split("").forEach(char => clutter += `<span>${char}</span>`)
```

- 第一行是很多人踩过的坑：**把文本拆成 span 之后空格会塌掉**，用 `en space`（U+2002）替换即可，它宽度是半个 em，且是真实字符，不需要 `white-space: pre`。
- style 1：`gsap.from(chars, { y: 10, opacity: 0, stagger: 0.1, scrollTrigger: { start: "top 80%" } })` —— 最标准的"逐字升起"。
- style 2：给前半段 `delay = i`、后半段 `delay = len - i`，形成**镜像延迟**：

```js
for (var i = 0; i < len / 2; i++)            childNodes[i].dataset.delay = i
for (var i = floor(len / 2); i < len; i++)   childNodes[i].dataset.delay = len - i
```

  结果是从中间向两边打开的"幕布"。这个"镜像索引"是一个通用招式，可以套到任何 stagger 上（卡片、列表、图表柱子、遮罩条）。
- 拆分后 `elem.childNodes` 直接就是动画目标，不需要 `SplitText` 插件。代价：会破坏文本选中和无障碍语义（span 之间对读屏不友好）——长段落正文绝对不要这么处理，只用于标题。

## 模式 5：媒体镜头（hoverWithMediaCircle）

```js
var trans = gsap.utils.pipe(
  gsap.utils.clamp(-1, 1),
  gsap.utils.mapRange(-1, 1, 0.8, 1.2)
)
var diffx = trans(dets.clientX - prevx)
gsap.to(".movercirc", {
  left: dets.clientX, top: dets.clientY,
  width: "20vw", height: "20vw",
  transform: `translate(-50%,-50%) scale(${diffx, diffy})`,   // 逗号表达式，实际只用 diffy
  ease: Circ, duration: 0.4, opacity: 1
})
```

- 结构：一个 `position: fixed` 的圆 `.movercirc`（`mix-blend-mode: exclusion`，`max-width/height: 250px`，`overflow: hidden`，初始 `width: 0; height: 0; opacity: 0`），里面一个 `object-fit: cover` 的 img/video，另外再垫一个纯白 `.just-a-white-blend-screen` 作为 exclusion 的作用底。
- **速度 → 缩放**：`clamp` 后 `mapRange(-1,1,0.8,1.2)`，快的时候压扁/鼓起来。和模式 1 的"速度 → 宽度"是同一个想法的两种实现。
  - 但这里有个坑：`scale(${(diffx, diffy)})` 是 JS 逗号表达式，`diffx` 被丢弃，实际只有 `diffy` 生效。要真正做各向异性拉伸，得写成 `scale(diffx, diffy)`。
- 静止 500ms 后 `setTimeout` 把 `transform` 复位 → "不动了就回到圆"，避免停在畸变状态。
- 内容切换：`mouseenter` 时按 `index % media.length` 换 `src`，所以"N 个条目 × M 个媒体"可以任意不齐，M 少于 N 会循环复用（很适合作品列表：8 个项目 3 张图）。
- 视频用 `preload / muted / autoplay` 三个属性，靠 `filter: invert(1)` 在 exclusion 下得到"负片镜头"观感。
- 使用边界：会遮挡文字（`z-index` 高 + blend），触屏上没有 hover 就完全失效，必须准备静态兜底；`exclusion + invert` 让内容不可预测，真实项目里更常用的是 `clip-path: circle()` + 正常合成。

## 抽出来的规则表

| 想要什么 | 做法 | 一次性的成本 |
| --- | --- | --- |
| 光标适配任意底色 | `mix-blend-mode: exclusion` + 黑点 + 白底层 | 3 行 CSS |
| 光标有速度感 | `clamp(15, 35, dx)` 写成 `width` | 4 行 JS |
| 悬停放大不破布局 | 外层 `overflow: hidden` + 内层 `scale` | 2 行 CSS |
| 放大倍率随尺寸走 | `< 450px → 1.05`，否则 `1.025` | 1 个三元 |
| 元素跟随指针但不脱疆 | `mapRange(0..size → 0..1)` + `lerp(-20, 20, t)` | 3 行 |
| 反馈成双通道 | 元素动 + 光标放大 4× | 1 个额外 tween |
| 标题逐字而不塌空格 | `replaceAll(" ", "\u2002")` 再拆 span | 1 行 |
| 中间向两边打开 | 索引 `min(i, len - i)` 当 delay | 6 行 |
| 滞后跟随的镜头感 | 同一坐标不同 `duration`（点 1s、圈 2s） | 1 个参数 |

## 本地复刻方式

- 上述规则表全部是纯 GSAP/CSS，可以脱离 Shery 直接用；如果不想引 GSAP，把 `gsap.to(el, {x, duration, ease})` 换成"每帧 `lerp` 到目标 + `transform`"即可，语义完全等价（库里的 `lerp(x, y, a) = x*(1-a) + y*a` 就是它自己的兜底实现）。
- 已在 `DESIGN-ASSET-LIBRARY.html` 的指针类演示中采用了 `exclusion` 光标与 `overflow: hidden` 放大这两条；其余（磁吸、媒体镜头）作为待复刻清单保留在本文。

## 适合使用

- 作品集、品牌官网的项目列表（masker + magnet + textAnimate style 2 三件套就够撑起一个 section）
- 需要"自定义光标但不想赌底色"的所有场景
- 一个 CTA 想要被"吸住"的时候（磁吸只用在单个元素上，绝不用在整排按钮上）

## 使用边界

- 每一处 `mousemove` 都新建 tween 且没有节流/`overwrite`，同屏元素多时会掉帧；自己实现时要改成 rAF 里统一插值。
- 光标、磁吸、媒体镜头三项同时开等于三种互相矛盾的"指针隐喻"，一个页面只留一个主叙事。
- 触屏设备必须整体降级为静态：没有 hover 的世界，这些效果一个都不会触发。
- `textAnimate` 破坏文本语义，禁止用在正文/长段落；`aria-hidden` 与可读文本要另留一份。
- 原始库 MIT 可参考改写；`Shery.css` 中的 ControlKit 皮肤（`#181c20 / #292d39 / #383c4a / #8c92a4`，7px 圆角，hover `#007bff`）属于工具面板样式，不是品牌样式，不要当成设计变量抄。
