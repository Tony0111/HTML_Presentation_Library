# Presentation Template 02

青橙色空间演示模板，基于 `presentation-template/` 的内容模型与键盘导航制作。入口是 [index.html](index.html)，双击即可离线打开。

## 视觉方向

- 封面使用本地生成的青橙线条纹理，并以 Library 中 liquid lens 的 UV 收拢公式做鼠标位置折射。
- 目录使用四块无边框的 Three.js 立体屏风，方向键可选章，Enter 进入。
- 第 1、3 章青色为主、橙色为辅；第 2、4 章橙色为主、青色为辅。目录屏风与对应正文共用青橙渐变配色。
- 封面的流畅线条贯穿目录、屏风与正文。背景左上接近白色，向右下逐渐显出章节主色，辅色仅在局部和强调信息中出现；正文纹理静态生成，不增加持续动画。
- 保留原有 19 页并新增第 20 页 Thanks 粒子结尾；背景、卡片、表格、时间线与强调色跟随章节主题，原始图表和视频素材保持不变。
- Thanks 复用 Library 的 Particle Morph 粒子球与文字采样逻辑，12,000 个粒子聚合成文字，支持轻微鼠标响应。沿用单个 Three.js 渲染器，减弱动画时静态显示，无 WebGL 时显示文字。原作者 develper21 的 MIT 许可见 LICENSES/sphere-particle-LICENSE.txt。
- 所有资源随文件夹携带，不依赖 CDN、外部字体或网络 API。

## 内容制作

编辑 [content/sample.md](content/sample.md)，然后在项目根目录运行：

```text
python tools/build_content.py
```

它会生成 [data/presentation.config.js](data/presentation.config.js)。

## 操作

`Enter` / `Space` / `→` 翻页，目录页用 `←` / `→` 选章，`Enter` 进入；`↑` / `Backspace` 返回目录；`F` 全屏；视频页 `P` 播放或暂停、`M` 静音。

## 结构

```text
presentation-template-02/
  index.html
  content/sample.md
  data/presentation.config.js
  js/spatial-stage.js       封面液体镜头 + 目录立体屏风
  js/slide-renderer.js      正文页渲染
  styles/opening.css        封面与目录界面
  styles/theme.css          青橙渐变与立体卡片主题
  assets/                   字体、图表、视频
  vendor/three.min.js
```
