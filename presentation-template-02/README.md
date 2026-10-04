# Presentation Template 02

青橙色空间演示模板，基于 `presentation-template/` 的内容模型与键盘导航制作。入口是 [index.html](index.html)，双击即可离线打开。

## 视觉方向

- 封面使用本地生成的青橙线条纹理，并以 Library 中 liquid lens 的 UV 收拢公式做鼠标位置折射。
- 目录切换为四块带边框、铰链、支脚、材质与投影的 Three.js 立体屏风，方向键可选章，Enter 进入。
- 内容页保留模板 1 的 19 页结构与页型；背景改为青橙渐变，重复信息改成圆角立体卡片。
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
