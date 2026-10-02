# Particle Morph — Offline Rebuild

`github_res/sphere_particle` 的离线复现版本。

## 直接打开

双击 `index.html` 即可运行，不需要 Node.js、npm、网络或本地服务器。

输入最多 20 个字符，点击 `CREATE` 或按 Enter：

1. 粒子球变成输入文字
2. 文字保持约 4 秒
3. 粒子自动恢复成旋转球体

## 目录

- `index.html`：入口
- `app.js`：优化后的粒子和变形逻辑
- `styles.css`：页面样式
- `vendor/three.min.js`：本地 Three.js
- `vendor/gsap.min.js`：本地 GSAP

相较原版，复现版本使用一个 GSAP 进度动画统一插值全部粒子位置，避免为每个粒子建立单独 tween，性能更稳定。

原仓库：

- https://github.com/develper21/sphere_particle

本目录保留原项目许可证信息。
