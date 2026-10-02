# STLShaper Forms — 形体变形演示

从 `github_res/stlshaper` 提取的**参数化形体变形**效果，重做成一个离线、可双击打开的独立演示。

原项目是一个浏览器里的 STL 编辑器，需要上传模型、联网加载 Three.js。这里把它的变形算法原样移植到一个**程序化生成**的网格上，因此不需要 STL 文件、不需要 Web Worker、不需要网络。

## 直接打开

双击 `index.html` 即可运行。不需要 Node.js、npm、本地服务器或网络。

## 操作

| 操作 | 说明 |
| --- | --- |
| 拖动 | 旋转模型 |
| 滚轮 | 缩放 |
| 空格 | 暂停 / 继续自动轮播 |
| ← → | 上一个 / 下一个变形 |
| H | 隐藏界面，只看模型 |
| R | 复位视角 |

左侧面板可以切换基础形体、选择变形方式、调节强度，以及开关线框和顶点显示。

## 11 种变形

| 变形 | 中文 | 效果 |
| --- | --- | --- |
| Noise | 噪声 | Perlin 噪声沿法向推挤表面，形成有机隆起 |
| Sine Wave | 正弦波 | 沿轴采样正弦，把模型推成规律波纹 |
| Ripple | 同心波纹 | 以模型轴为中心向外扩散的同心波 |
| Twist | 扭曲 | 沿轴旋转，越远离中心角度越大 |
| Bend | 弯曲 | 把模型沿轴弯成弧线 |
| Inflate | 膨胀 | 离中心越远，向外扩张越多 |
| Hyperbolic | 双曲拉伸 | 用双曲函数沿轴拉伸，两端拉长 |
| Spherize | 球化 | 把形体朝球面收拢 |
| Warp | 空间扰动 | 三轴互相正弦错位，产生流动剪切感 |
| Pixelate | 像素化 | 顶点吸附到网格，得到块状外观 |
| Boundary | 边界撕裂 | 只扰动包围盒边缘附近的顶点 |

另有 4 种基础形体：球体、圆环、环结、晶体。

## 文件

```text
stlshaper-forms/
├── index.html          交互式演示入口
├── app.js              变形算法 + 场景 + 交互
├── style.css           界面样式
├── vendor/three.min.js 本地 Three.js
├── backgrounds/        三个背景页（见下）
├── LICENSE.txt         原项目 MIT 许可
└── README.md
```

## 背景页

三个可直接用作幻灯底图的循环背景。共同特征：

- 形状固定，持续自转
- 以**线框 + 顶点**形式渲染
- 每隔几秒平滑切换一种变形，永久循环
- 变形强度持续轻微呼吸，画面不会静止
- 无界面、无文字，只有画面
- 色相缓慢漂移，每个背景色调不同

| 文件 | 形状 | 变形顺序 | 主色 |
| --- | --- | --- | --- |
| `backgrounds/sphere.html` | 球体 | 噪声 → 扭曲 → 像素化 → 边界撕裂 | 紫 |
| `backgrounds/torus.html` | 圆环 | 噪声 → 扭曲 → 弯曲 → 像素化 → 边界撕裂 | 青蓝 |
| `backgrounds/knot.html` | 环结 | 噪声 → 像素化 → 边界撕裂 | 品红 |

每个文件都是独立页面，双击即可打开，同样不需要网络和服务器。三个文件共用同目录下的 `bg.js` 和 `bg.css`，因此请保持 `backgrounds/` 与 `vendor/` 的相对位置不变。

调试用参数：在网址后加 `?label=1` 会显示当前变形名称（默认不显示，适合直接当背景）。

循环节奏在各自 HTML 的 `BG_CONFIG` 里调整：

```js
window.BG_CONFIG = {
  shape: 'sphere',
  deformations: ['noise', 'twist', 'pixelate', 'boundary'],
  hue: 0.70,     // 主色相
  hold: 3.0,     // 每种变形保持多少秒
  morph: 1.2,    // 过渡时长（秒）
  spin: 0.20,    // 自转速度
  breathe: 0.15  // 强度呼吸幅度
};
```

## 实现说明

变形函数移植自原仓库的 `worker.js`，保留了相同的公式和参数语义：

- `simpleHash` / `whiteNoise` / `perlinNoise` / `perlinFractal` / `sampleNoise`
- `getAxisList`、包围盒计算
- `noiseShape`、`sineDeformShape`、`pixelateShape`、`inflateShape`、`twistShape`、`bendShape`、`rippleShape`、`warpShape`、`hyperShape`、`boundaryDisruptShape`、`spherizeShape`

与原项目的差异：

1. 输入改为程序化网格，而不是上传的 STL。
2. 去掉了 Web Worker，主线程直接计算（顶点数控制在数千以内）。
3. 每个变形作用于**原始网体**，不做多段串联。
4. 变形之间用缓动插值过渡，方便当作演示/转场素材。
5. 参数经过重新取值，以适配归一化到单位尺寸的形体。

原仓库：

- https://github.com/ToledoEM/stlshaper
- https://toledoem.github.io/stlshaper/

MIT License。原项目许可证见 `LICENSE.txt`。
