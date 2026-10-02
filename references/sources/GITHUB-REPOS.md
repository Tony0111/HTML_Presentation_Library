# 开源仓库地址记录

这里记录曾经在本机 `github_res/` 里研读过的第三方仓库。

这些仓库体积很大（主要是 `node_modules`），不适合长期放在本地。研读完成后，只保留地址，方便日后按需重新 clone。

保留在本地的是 `github_res/anime/`（Anime.js 官方库与示例）。

## 已移除（2026-10）

| 仓库 | 地址 | 当时体积 | 说明与产出 |
| --- | --- | --- | --- |
| Portfolio_V2 | https://github.com/Nour-Sherif-Ali/Portfolio_V2 | 11 GB | 3D 开发者作品集（React + Three.js + GSAP）。已提取紫色线场、电脑模型、星空与地球 → `references/rebuilds/portfolio-v2-3d/` |
| holographic-shader-visualizer-three.Js | https://github.com/YasirAwan4831/holographic-shader-visualizer-three.Js | 38 GB | React + Three.js + GLSL 赛博朋克全息几何体。已复刻 → `references/rebuilds/hologram-shader-portable/`、`hologram-corner-widget/` |
| sheryjs | https://github.com/sheryianscodingschool/sheryjs | 231 MB | Shery.js 效果库（MIT）。已拆解成多篇笔记 → `references/patterns/webgl/sheryjs-*.md`、`references/patterns/cursor/sheryjs-cursor-playfulness.md`，并复刻 → `references/rebuilds/sheryjs-liquid-lens/` |
| stlshaper | https://github.com/ToledoEM/stlshaper | 221 MB | 浏览器端 STL 形体变形工具（MIT）。11 种变形算法已移植 → `references/rebuilds/stlshaper-forms/`，含三套循环背景 |
| webcam-particles | https://github.com/tuqire/webcam-particles | 60 MB | 摄像头驱动的 GPGPU 粒子。暂时搁置，待学习“摄像头 → 纹理 → 粒子交互”路线 |
| particles-playground | https://github.com/isladjan/particles-playground | 43 MB | 图片粒子 + 鼠标尾迹。已打包成离线版 → `references/rebuilds/particles-playground/` |
| sphere_particle | https://github.com/develper21/sphere_particle | 33 MB | 粒子球与输入文字之间变形。已优化复刻 → `references/rebuilds/sphere-particle/` |
| movie_card_hover | https://github.com/suyXcode/movie_card_hover | 32 MB | 纯 HTML/CSS 卡片悬停效果。已扩展成整行卡片 → `references/rebuilds/hover-card-row/` |

体积合计约 49.5 GB，其中绝大部分是安装依赖产生的 `node_modules`。

## 更早就已移除

| 仓库 | 地址 | 原因 |
| --- | --- | --- |
| macbook_gsap_landing | https://github.com/aswazone/macbook_gsap_landing | Apple 风格产品页，依赖 React + Vite，观感一般 |
| VoidTech | https://github.com/Keninjavelas/VoidTech | 赛博朋克 3D 展示，仓库缺少 `.glb` 模型，无法还原截图效果 |
| 3d-web | https://github.com/udithavithanage/3d-web | 3D 作品集，角色模型为加密文件（Git LFS 指针），无法离线复现 |
| simple-sketches | https://github.com/simpleSketche/simple-sketches | 建筑草图集合，主要是 Grasshopper 文件，需要 Rhino 才能打开 |

## 保留在本地

| 仓库 | 地址 | 说明 |
| --- | --- | --- |
| anime | https://github.com/juliangarnier/anime | Anime.js v4 官方库与 26 个示例（MIT）。可直接取用 |

## 重新获取

```bash
cd github_res
git clone https://github.com/<owner>/<repo>.git
```

需要依赖时再执行 `npm install`。用完之后可以直接删除整个目录，不会影响本项目的其他部分——所有复刻版本都已把所需资源内嵌或复制到自己的文件夹内。
