# Shery.js 的 7 种图像 shader 语言（逐个拆解）

## 来源观察

- 源码：`github_res/sheryjs/src/shaders/effect1..7/{vertex,fragment}.glsl`，全部 GLSL ES 1.0（`varying` / `texture2D` / `gl_FragColor`）
- 调用面只有一个：`Shery.imageEffect(".img", { style: 1..7, debug: true })`
- 所有 fragment 共享同一段开头，这一段就是整套库的"视觉语法基线"：

```glsl
vec2 uv = vuv;
uv = uv * 2. - 1.;
uv = masker ? mix(uv, uv / max(1., maskVal), uIntercept) : uv / max(1., maskVal);
uv = uv * .5 + .5;              // 归一化回 0..1
gl_FragColor = texture2D(uTexture[0], uv);
roundedBoxSDF();                // 形状裁切，白拿
```

即：**每个特效 = "如何计算 uv" 的一句差异**，其他（缩放、裁切、多图、gooey）都是同一层公共件。这就是它能把 7 个特效塞进同一个 API 的原因。

## 逐个记录

| style | 名字 | 位移手段 | 关键 uniform | 成本 | 适合 |
| --- | --- | --- | --- | --- | --- |
| 1 | Simple Liquid | `uv += refract(vec2(0.), snoise表面, b)` | `a` 速度、`b` 摇摆度 | 低（2 次 noise） | 单图"活着"，最通用 |
| 2 | Dynamic Distortion | 10 次三角迭代场 + 20 种混合模式 | `speed / frequency / angle / waveFactor / color / mode / pixelStrength / quality` | **高** | 生成艺术封面、暗色品牌氛围 |
| 3 | 3D Wave / Wobble | **vertex** 里 `sin(x) + sin(y)` 抬 z | `uFrequencyX/Y/Z`、`geoVertex` 细分 | 中（需细分网格） | 想看到"纸/胶片在空间中弯" |
| 4 | 3D Wind | **vertex** 里 `snoise(x*freq + t*speed)` 抬 z | `uSpeed / uAmplitude / uFrequency / uColor` | 中 | 人像、自然、缓慢呼吸感 |
| 5 | Multi-image Liquid | 同 1，但 noise 采样坐标被鼠标平移 | `a`、`b`、`mouse` | 低 | 多图滚动切换主力 |
| 6 | Perlin Noise | `uv += snoise(整体按时间旋转的坐标) * amount` | `scale / noiseDetail / distortionAmount / speed` | 低 | 溶解、雾化、局部扭曲底 |
| 7 | Cyber Squares | tile 距离场 + 逐格时间脉冲 | `rotation / pattern / density / clustering / gapping / smoothness / styling / circular` | 中 | 复古网格、像素化揭示、转场 |

## 三条真正可复用的 shader 技巧

### 1. 用 `refract()` 做一次"液体"（style 1/5）

```glsl
vec3 v = vec3(vuv.x + time * a / 10., vuv.y, time);
vec2 surface = vec2(snoise(v) * .08, snoise(v) * .01);   // 注意 x/y 幅度不同
uv += refract(vec2(0., 0.), surface, b);
```

- `refract(I, N, eta)`：入射光 `I` 为零向量时结果就是"沿法线的偏移"，于是 `surface` 直接充当一张位移场；`b`（0.7 左右）控制折射率 → 观感上的"稀/稠"。
- x 用 `.08`、y 用 `.01` 这个不对称很关键：横向流动强、纵向几乎不动，就得到"水面"而不是"果冻"。style 5 把 x/y 都设成 `.08` 且减去鼠标偏移，就变成"跟着指针搅动"。
- 成本只有两次 3D simplex，移动端可跑。这是整份目录里性价比最高的一条。

### 2. 用亮度做位移源（多图切换 / 视差）

```glsl
float blend  = uScroll - uSection;
float blend2 = 1. - blend;
vec4 imageA = texture2D(uTexture[0], vec2(uv.x, uv.y - texture2D(uTexture[0], uv).r * displaceAmount * blend  * 2.)) * blend2;
vec4 imageB = texture2D(uTexture[1], vec2(uv.x, uv.y + texture2D(uTexture[1], uv).r * displaceAmount * blend2 * 2.)) * blend;
gl_FragColor = imageA.bbra * blend + imageA * blend2 + imageB.bbra * blend2 + imageB * blend;
```

- 位移量取自**图自己每个像素的红色通道**。所以亮部推得远、暗部留在原地，切换过程像"图像被自己的明暗撕开"，比线性 cross-fade 高级得多。`displaceAmount` 默认 0.5。
- `bbra` 是 GLSL 的向量重排（`imageA.bbra` = `vec4(b, b, r, a)`），swizzle 本身合法且可自己造（`.grba`、`.rrra`），但这句的语义更像随手写的：它把 `blend` 乘上一个由颜色通道组成的权重，副作用是切换时带一点色彩偏移。学到的是"swizzle 可以当免费的通道权重用"，而不是"这行该照抄"。
- `scrollType == 0.` 的分支把上面整套换成 `step()` 硬切：同一个 uniform 就能在"波浪擦除"和"形态渐变"之间切。

### 3. 距离场 + 时间脉冲 = 网格揭示（style 7）

```glsl
vec2 scaled_uv = (1. - scale + 1.) * vec2(vuv.x, vuv.y / aspect);
vec2 tile      = fract(scaled_uv);
float tile_dist   = min(min(tile.x, 1. - tile.x), min(tile.y, 1. - tile.y)); // 到格边的距离
float square_dist = length(floor(scaled_uv));                                 // 第几格（到中心的序号）
float edge = sin(time - square_dist * pattern);   // 从中心向外扩散的行波
float value = mix(tile_dist, 1. - tile_dist, step(density, edge));
edge  = pow(abs(1. - edge * m), clustering * m) * gapping;
value = smoothstep(edge - smoothness * m, edge, styling * value);
value += square_dist * circular;                  // 整体加一层径向明暗
```

- 关键手法：`fract` 拿"格内坐标"，`floor` 拿"格序号"，用序号做相位差 `time - dist * pattern` → 天然的波浪推进；再用 `smoothstep(edge - soft, edge, value)` 做带软边的阈值，就得到"格子逐个亮/灭"。
- `m = mouseMove ? smoothstep(ewx, ehy, length(uv - mousei)) : 1.`：把鼠标距离变成 0..1 的衰减，然后**把所有参数都乘上 `m`**，于是"距离鼠标越远，格子越接近不透明度基线"。一个标量同时调制好几个参数，这种写法很适合做"指针影响的区域"。
- `circular` 用 `+= square_dist * circular` 给整片网格叠一层径向亮度，是很便宜的"镜头感"。

## 四个正交的可插拔层（都是白拿的）

- **Zoomer（悬停放大）**：`masker` 开、`maskVal` 1..5。做法是在齐次空间里 `mix(uv, uv / maskVal, uIntercept)`，因为 `uIntercept` 已经被 lerp 过，所以放大自带缓动，无需 JS 参与。
- **Gooey / metaball**：`snoise(pos * noise_scale, time * noise_speed)` 与"到鼠标的距离"两者相加，再 `smoothstep(discard_threshold - antialias_threshold, discard_threshold, val)` 生成 alpha，用它 `mix` 进下一张图。
  - `antialias_threshold` 是唯一的技巧点：阈值切边一定会锯齿，把 `smoothstep` 的下界设为 `threshold - aa` 就把锯齿换成了可控软边。凡是做 SDF/阈值裁剪的，都该留一个这样的 uniform。
  - `infiniteGooey` + 点击：`gsap.to(uniforms.metaball, { value: growSize })` 让 blob 长大，`onComplete` 里推进纹理索引再回落到基线 → 一次"blob 爆裂换下一张图"，`durationOut/durationIn` 分别控制两次。这是"点击=换图"最有质感的一种做法。
- **Shape Control（形状裁切）**：

```glsl
float distance = length(max(abs(vuv2) - vec2(shapeScale) - shapeRadius, 0.)) - shapeRadius;
gl_FragColor = vec4(gl_FragColor.xyz, 1. - smoothstep(0., shapeEdgeSoftness / 10., distance));
```

  标准 rounded-box SDF。注意两处细节：`ignoreShapeAspect` 决定要不要按 `aspect` 修正 Y（不修正会随元素宽高比变形）；`shapeRadius` 同时从盒子里减掉又加回距离，这才是"圆角"而不是"缩小"。
- **`onMouse` 三态**：见架构笔记，7 种 style 里 6 种都带。

## 效果 2 的"混合模式"清单值得单拎出来

`mode` 用 `-10..11` 的整数分支实现了 20 种 Photoshop 式混合（Reflect/Glow、Exclusion、Difference、Darken、ColorBurn、ColorDodge、SoftLight、Overlay、Phoenix、Add、Multiply、Screen、Negative、Divide、Subtract、Neon、Natural、Mod、Dark、Average），全是纯代数：

```glsl
Multiply   : final = base * blend
Screen     : final = 1. - (1. - base) * (1. - blend)
Overlay    : final = maxa(base) < .5 ? 2.*base*blend : 1. - 2.*(1.-base)*(1.-blend)
Exclusion  : final = base + blend - 2.*base*blend
Difference : final = abs(base - blend)
ColorBurn  : final = (maxa(blend)==1.) ? blend : minn(base*base/(1.-blend), vec4(1.))
```

这套公式表可以抽成自己项目的"生成图层叠加"参考。它的另一个启示：**先让程序生成的场 `col` 成为一层，再让"它和图怎么混"变成一个可选枚举**，同一个 shader 就能出几十种完全不同的观感，而不需要写几十个 shader。

## 本地复刻方式

`references/rebuilds/sheryjs-liquid-lens/index.html` 用原生 WebGL1 复刻了：`refract` 液体位移（style 1/5 的做法）、指针 metaball、SDF 圆角、悬停放大、`uIntercept` 闸门，并把"滑杆 → uniform → 导出 JSON"的工作流保留下来。style 2 的迭代场和 20 种混合模式没有全部搬进来（成本太高，且它的价值在公式表而不是在整段代码）。

## 适合使用

- 品牌首屏的一张主图：style 1（`onMouse: 1`，只在悬停时启动）
- 暗色/科技调性想要"有颜色的噪声"：style 2，`mode` 用 Reflect 或 ColorDodge，`exposer` 调低
- 想要空间感而不是平面扭曲：style 3 / 4，记得把 `geoVertex` 提到 32 以上
- 转场或网格化揭示：style 7 的 `pattern`（波速）+ `gapping`（格间隙）+ `density`（占空比）
- 需要"看起来像液体玻璃"的卡片背景：只取 style 1 的 `refract` 那 4 行

## 使用边界

- `quality / geoVertex / 迭代次数` 这三个旋钮直接决定帧率，低端机上要么关掉，要么降到 1。
- 位移幅度一旦超过 `~0.1 uv`，图里的文字/人脸就会明显变形，可读性立刻崩掉。凡是页面里图片承担信息（有文字、有产品）的，位移上限控制在 0.02–0.06。
- 混合模式的枚举分支在移动端 GPU 上不是免费的：全分支展开，代价比看起来大。真正上线时只保留你选中的那一两种。
- 任何"贴图"路线都要注意 CORS 与本地 `file://` 的取图限制；演示时程序化生成贴图更稳。
