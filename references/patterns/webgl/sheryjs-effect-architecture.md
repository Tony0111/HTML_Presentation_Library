# Shery.js 图像特效的体系结构

## 来源观察

- 本地源码：`github_res/sheryjs/`（gitignore，仅作本地研读；MIT License，© 2023 Harsh Vandana Sharma / Aayush Chouhan）
- 入口：`src/Effects.js`（对外 API + 7 种 style 的参数面板）、`src/Utils.js`（`init()` 真正的引擎，766 行）
- 依赖：three.js r155（ShaderMaterial，GLSL ES 1.0，`texture2D`/`varying`，不是 WebGL2）、GSAP 3.12、ControlKit（调试面板）
- 发布形态：`dist/Shery.js` 只有 100 KB，把 `THREE / gsap / ControlKit` 作为 externals，所以必须先用 CDN 挂全局变量
- 官方示例：`examples/Image Effects/*.html`，每个文件只改一个数字 `style: n`，其余全靠库内部换 shader

一句话总结：它不是"一堆特效"，而是**一个把 DOM 元素映射成 WebGL 平面的引擎 + 7 个可插拔 shader + 一个把 shader 参数变成 JSON 设计变量的工作流**。值得偷的是后两者，尤其第三个。

## 核心机制一：1 world unit = 1 CSS pixel

`Effects.js:370`：

```js
camera = new THREE.PerspectiveCamera(70, width / height, .01, 1000)
camera.fov = 2 * Math.atan(height / 2 / 10) * (180 / Math.PI)
camera.position.set(0, 0, 10)
```

先给个占位 fov，立刻用 `2*atan(h/2/10)` 反解出"在 z=10 处，视锥垂直高度正好等于 window.innerHeight"。于是 `PlaneGeometry(1,1)` 缩放 `elemWidth × elemHeight` 就是精确的 CSS 像素尺寸，`resize` 时只要重算 fov 和 scale，不需要任何正交投影或单位换算。

这是所有"把 WebGL 贴在 DOM 上"的做法里最省心的版本，值得单独记成一个片段。

## 核心机制二：一个全局 scene，每帧跟 DOM 对齐

- 第一次调用 `imageEffect()` 时创建 `scene / camera / renderer`，并往 `document.body` 追加一个 `div._canvas_container`：`position: fixed; inset: 0; width: 100vw; height: 100vh; pointer-events: none; z-index: 0`（`Shery.css` 末尾）。之后所有元素的 mesh 都塞进同一个 scene，只有一个 canvas 覆盖全屏。
- 目标 `<img>` 被 `elem.style.opacity = "0"` 藏起来，GL 平面顶替它。
- `animate()`（`Utils.js:707`）每帧做的位置对齐，就是全部"DOM 同步"逻辑：

```js
elemMesh.position.y = -rect.top + height / 2 - rect.height / 2
elemMesh.position.x = rect.left - width / 2 + rect.width / 2
elemMesh.scale.set(rect.width, rect.height)
```

滚动、布局变化、元素位移都不需要额外监听——每帧重新读 rect 就自动跟着走。代价见"缺陷"一节。

- mesh 初始 `visible = false`，等 `createCroppedTexture()` 的 Promise Resolve 后才设成 true，所以不会出现"先闪一下原始图片/黑块"的过程。这是一个很小的、但决定质感的细节。

## 核心机制三：贴图不是"加载"，是"按元素比例重切"

`createCroppedTexture()`（`Utils.js:631`）：

1. 用 `new Image()` / `document.createElement('video')`（`crossOrigin = 'anonymous'`，muted/loop/preload）重新拿一份源；
2. 按 mesh 的宽高比做 **center cover crop**：`imgAspect > newAspect` 就按比例算 `newWidth`、`xOffset`，否则算 `newHeight`、`yOffset`；
3. `canvas.drawImage(source, sx, sy, sw, sh, 0, 0, w, h)`；
4. `new THREE.Texture(canvas)` + `needsUpdate = true`，video 走 `THREE.VideoTexture`；
5. 覆盖纹理前 `oldTextures[i].dispose()`，线性过滤 `LinearFilter` 防止 mipmap 边缘问题。

所以 shader 里的 `uv` 可以直接当"元素本身的构图"用，不必在 GLSL 里做 object-fit。要做"图片 hover 变形"这一类效果，这一步是脏活，但做完后面全都轻松。

`fit()` 里还有一句值得注意：`setTimeout(window.dispatchEvent(new Event('resize')), 0)` —— 初始化后强制补一次 resize，避免首个 rect 尺寸是布局未稳定时的值。

## 核心机制四：一个 lerped gate，把任何特效变成 hover 特效

全局统一注入的 uniform（`Utils.js:145` 之后的 `Object.assign`）里，最关键的是三个：

| uniform | 来源 | 作用 |
| --- | --- | --- |
| `uIntercept` | 每帧 `lerp(→ isMouseOverElemMesh ? 1 : 0, 0.07)` | 0→1 的悬停闸门，自带缓动 |
| `mousei` | 每帧 `lerp(→ raycast 得到的 uv, 0.07)` | 平滑后的鼠标 uv 坐标 |
| `onMouse` | 面板下拉：Always Active / Active On Hover / Deactivate On Hover | 选择 gate 的语义 |

每个 shader 都只写一行就拿到三种模式：

```glsl
surface = onMouse == 0. ? surface
        : onMouse == 1. ? mix(vec2(0.), surface, uIntercept)
        :                 mix(surface, vec2(0.), uIntercept);
```

`mouse` 本身来自一次 `Raycaster.intersectObject(elemMesh)` 的 `intersection.uv`（`Utils.js:503`），所以拿到的不是屏幕坐标，而是"落在图片纹理的哪个位置"，效果能精确贴到图上。

要学的点：**平滑交给 JS 里的固定 lerp 系数（0.07），shader 只管用一个已插值的标量。** 于是 GLSL 里没有任何时间相关的插值逻辑，参数面板也就永远一致。

## 核心机制五：多图的"虚拟滚动"，不动 DOM

目标如果是一个 `div` 而不是 `img`，就进入 multi-image 分支：子元素全部加载成 `t[]`，第 2 个起 `display: none`，shader 永远只看到 `uTexture[0]` 和 `uTexture[1]` 两张。

- `ScrollPos`（`Effects.js:964`）是一个手写惯性滚动器：`wheel` 事件只累加 `acceleration += sign(deltaY) * speed`，`update()` 里 `velocity *= dampen(0.97)`、`clamp(maxSpeed = 20)`、`scrollPos += velocity`，`snap(target, dampenThreshold, ...)` 在接近目标时额外阻尼并把差值按 `0.1` 吸过去，`project(steps)` 还能预测未来位置。
- `staticScroll()` 把 `scrollPos` 量化成"第几张图"（`scrollPos / elemHeight`）写入 `currentScroll`；
- `doAction()` 再把 `uScroll` 朝 `currentScroll` lerp，`uSection = floor(uScroll)`，`blend = uScroll - uSection` 就是切换进度，超过 `uSection + 1` 时滑动纹理窗口。
- shader 侧的位移：按上一张图自身的亮度 `texture2D(...).r * displaceAmount * blend * 2` 沿 y 推开，形成"图像被自己的亮度撕开"的波浪切换（`scrollType == 0` 时改成 `step()` 硬切，得到 morph/擦除感）。
- 外部接管：`slideStyle: (setScroll) => ...` 把 `currentScroll` 的写入权交给你，于是 GSAP ScrollTrigger 或普通 `window.scrollY` 都能驱动同一套 shader。

结论：**页面里并没有真的滚动，滚的是一个 shader uniform。** 这就是"滚动叙事 + WebGL 图片轮播"最轻的实现骨架。

## 核心机制六：用字符串替换拼装 shader（而不是写 #ifdef 矩阵）

`Utils.js:240` 之前，三处替换：

| 占位符 | 替换内容 | 出现的位置 |
| --- | --- | --- |
| `#define SNOISEHOLDER` | 一整套 Ashima `snoise(vec3)` simplex noise | vertex + fragment |
| `#define SHAPEMODIFIER` | `roundedBoxSDF()` + 相关 uniform 声明 | fragment |
| `!isMulti;` | 单图版 or 双图滑动版 GLSL 片段 | fragment |

于是 7 个 shader × {单图 / 多图 / gooey} × {形状裁切} 不需要 3 份源码，`ShaderMaterial` 编译前拼一次即可。`shapeModifier` 的巧妙之处：它把裁切写成"最后无条件调用一次的函数"，`gl_FragColor = vec4(rgb, smoothedAlpha)`，默认参数（scale 0.5、position 0、radius 0、softness 0）等价于不裁切，因此任何特效都白拿圆角 / 椭圆 / 软边。

## 核心机制七：调试面板 = 设计变量的生产工具

这条是整套库里最值得搬走的东西。

1. ControlKit 的控件**直接绑定 uniform 对象本身**：`addSlider(uniforms.frequency, "value", "range")` —— 面板改的就是运行时状态，没有中间层，不会失同步。
2. "Save To Clipboard"（`Utils.js:408`）把 uniforms 序列化，先用解构剔除运行时量：

```js
const { uScroll, isMulti, uSection, time, resolution, uTexture,
        mouse, mousem, mousei, uIntercept, ...rest } = uniforms
navigator.clipboard.writeText(stringify(rest))   // stringify 带循环引用保护
```

3. 回到代码就是 `config: { ...粘贴的 JSON }`，或 `preset: "./presets/wigglewobble.json"`（内部 `fetch` + `config()`）。`config()` 会 `JSON.parse(JSON.stringify(c))` 深拷贝、把 `color` 还原成 `THREE.Color`，并顺手把 `zindex` 写到容器上。
4. 结果：**调参 → 复制 → 存档 → 复用/分享** 形成闭环，presets 就是这套视觉的"设计令牌文件"。仓库里那个 `presets/wigglewobble.json` 就是这么来的，字段名和 shader uniform 名一模一样。

反面教材也要记：JSON 里混进了 `"color": { "value": 5548287 }`（十进制整数色）和 GSAP 注入的 `"_gsap": { "id": 1 }` 脏字段（见 `examples/nodeExample/src/index.js` 里的 config）。序列化前应该做一次字段白名单清洗。

## 已知缺陷（自己写的时候不要复制这些）

- `animate()` 每帧对每个 mesh 调 6+ 次 `getBoundingClientRect()`，还每帧 `scale.set()`、`position`，多个元素时会强制重排，是最先要优化的点（缓存 rect + ResizeObserver + 只在变化时更新）。
- `isdebug[effect]` 让同一种 effect 的第一个元素才拿到面板；`addEventListener` 全部挂在 window/document 上且从不解绑，也没有 dispose/stop API，页面内多次初始化会叠加监听。
- style 2 的主循环固定 `for (float i = 1.; i <= 10.; i++)` 再 `if (i > quality) break;`，`quality` 是强度而不是分辨率上限，低配机上一卡就是全卡。
- GLSL 里有一行 `p,n*=angle;` —— 逗号表达式让 `p` 根本没被赋值，属于"语法能过、语义不是本意"的经典坑。同类还有 `edge = mod(edge*edge, edge/edge)`（其实是 `mod(x²,1)`）。写完 shader 要盯着"这行真的改到我想要的变量吗"。
- 触屏路径基本没考虑：`mousei` 靠 `mousemove` + raycast，移动端只有 `ScrollPos` 里的 touch 事件有兜底。
- `imageMasker` 在 `mousemove` 里反复 `mask.appendChild(circle)`；`mouseFollower`/`makeMagnet` 每次 mousemove 都 `gsap.to(...)` 新建 tween，没有节流。作为"效果演示"没问题，作为工程不合适。

## 本地复刻方式

- `references/rebuilds/sheryjs-liquid-lens/index.html`：不依赖 three.js / GSAP / ControlKit，用原生 WebGL1 + 自己实现的 snoise，复刻"一个元素 → 一个平面 → 折射噪声 + hover 闸门 + 指针 metaball + 圆角 SDF 裁切 + 悬停放大"，并保留了最重要的工作流：**滑杆直接改 uniform，按钮导出 JSON**。
- `DESIGN-ASSET-LIBRARY.html` 01 区块里的 "Liquid lens" 卡片是同一套 shader 的精简版，纯程序化贴图，不需要外部图片，离线可跑。

## 适合使用

- 首屏单张主图需要"活着"而不是"淡入"的时候（style 1 / 5 的液体折射，成本最低）
- 作品集合、案例墙：hover 才启动变形（`onMouse: 1`），静止时保持可读
- 多图滚动叙事：`div` + 多 `<img>` + `ScrollPos` 虚拟滚动，DOM 完全不滚动
- 需要"圆角 / 椭圆 / 软边"裁切一张 WebGL 图，而不想让 `border-radius` 影响布局
- 需要一套"调参 → JSON → 复用"的视觉参数管理方式（这条与 WebGL 无关，任何项目都能搬）

## 使用边界

- 一个 WebGL 上下文只能有一个全屏 canvas 覆盖层，`z-index` 要靠 `uniforms.zindex` 手动协调，页面层级复杂时会很难管。
- 图片必须是同域或允许 CORS（内部用 `crossOrigin = 'anonymous'` 重新加载），本地 `file://` 直接打开会拿到脏纹理——复刻版改用程序化贴图 / 拖拽 blob 绕开。
- 视差、变形、metaball 都属于"前庭敏感"高风险动效，必须提供 `prefers-reduced-motion` 降级和暂停开关。
- 移动端默认关。真要开，就只留 style 1 或 6 这类低循环成本的效果，并降 `pixelRatio`。
- 原文库代码为 MIT，可参考与改写；仓库 `media/*.gif` 是演示录屏（单个 6–15 MB），只在本地引用，不复制进 `assets/`，也不上传。
