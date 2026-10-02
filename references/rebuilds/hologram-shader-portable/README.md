# HOLO.SYS Portable

离线、单文件的全息 Shader 演示，改编自 `github_res/holographic-shader-visualizer-three.Js` 的视觉方向。

## 使用

直接双击 `index.html`，使用现代浏览器打开即可。无需 Node.js、npm、服务器、网络或外部字体。

- 鼠标拖动：旋转视角
- 滚轮：缩放
- 按 `1`：Torus Knot
- 按 `2`：Icosahedron
- 按 `3`：Torus

## 说明

- `index.html` 内嵌了 Three.js 和 GLSL Shader，是自包含文件。
- `hologram-background.mp4` 是 1280×720、30 fps、4 秒循环视频，可直接插入 PPT。
- 仍然需要浏览器支持 WebGL；实时效果会使用电脑 GPU。
- 这是为 PPT 素材库制作的便携复刻版，不是原仓库的构建产物。
- Three.js 版权和原项目许可证请以原仓库及其依赖的许可证为准。
