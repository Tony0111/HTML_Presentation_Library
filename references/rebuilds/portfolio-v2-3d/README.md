# Portfolio V2 · 3D Material Study

从 `github_res/Portfolio_V2` 提取的三个可复用视觉素材，并重做为离线独立展示页。

## 直接打开

双击 `index.html` 即可运行，不需要 Node.js、npm、网络或本地服务器。

页面包含三个模块：

1. **Gradient field**：紫色渐变、漂移光晕和细线网格，参考原项目首页背景。
2. **Computer model**：原项目 Hero 使用的 Gaming Desktop PC glTF 模型，可拖动旋转、滚轮缩放。
3. **Stars + Earth**：星星粒子背景和原项目 Contact 页面使用的 Stylized Planet 模型，可拖动旋转、滚轮缩放。

## 文件说明

- `index.html`：直接打开的入口
- `app.bundle.js`：已打包 Three.js、GLTFLoader、OrbitControls，并内嵌电脑和地球模型及全部贴图
- `style.css`：独立页面样式
- `licenses/`：模型原始 CC-BY-4.0 授权和作者信息

电脑模型和所有贴图已内嵌到 `app.bundle.js`，因此单独复制本目录也能离线运行。文件体积约 36MB，这是完整保留模型材质所需的体积。

原始项目：

- https://github.com/Nour-Sherif-Ali/Portfolio_V2
- https://portfolio-v2-nine-jade.vercel.app

模型来源和授权：

- Gaming Desktop PC — Yolala1232 — CC-BY-4.0
- Stylized planet — cmzw — CC-BY-4.0

详见 `licenses/`。
