# HOLO.SYS Corner Widget

透明背景的离线全息角标组件，适合嵌入 HTML 演示页面的一角。

## 直接预览

双击 `index.html` 即可打开。文件内嵌 Three.js 和 GLSL Shader，不需要 Node.js、npm、服务器或网络。

## 嵌入其他 HTML

```html
<iframe
  src="references/rebuilds/hologram-corner-widget/index.html"
  class="hologram-corner"
  aria-label="Holographic corner decoration"
></iframe>
```

```css
.hologram-corner {
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 220px;
  height: 220px;
  border: 0;
  background: transparent;
  pointer-events: none;
  z-index: 20;
}
```

组件只显示青蓝色全息几何体和浅色圆台，背景透明；几何体会自动旋转并循环切换形状。需要现代浏览器支持 WebGL，实时渲染会使用 GPU。
