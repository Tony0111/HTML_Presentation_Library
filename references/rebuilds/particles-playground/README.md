# Particles Playground — Offline Rebuild

来自 `github_res/particles-playground` 的本地离线复刻版本。

## 直接打开

双击 `index.html` 即可运行,不需要安装 Node.js、npm 或任何依赖,断网也可以使用。

支持:

- 鼠标移动:粒子产生扰动,并拖出交互尾迹
- 鼠标点击:当前粒子图像产生纵深爆发
- 左右箭头或键盘方向键:切换四个粒子场景
- 首次加载时的粒子聚合动画

## 文件说明

- `index.html`:可直接打开的入口
- `app.bundle.js`:已打包的 Three.js、GSAP、着色器和四张图片数据
- `style.css`:从原项目 SCSS 编译出的普通 CSS
- `assets/departureMono-Regular.woff2`:本地字体
- `effect.js`、`main.js`:保留的可读源代码参考
- `LICENSE.txt`:原项目 MIT 许可

原始仓库:

- https://github.com/isladjan/particles-playground
- 在线示例: https://isladjan.com/work/3/quotes

本目录只做本地学习和演示用途,保留原作者署名和许可信息。
