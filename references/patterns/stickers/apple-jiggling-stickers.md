# 夸张剪切贴纸与左右晃动

## 类型

贴纸视觉模式 / Sprite animation / CSS motion

## 来源观察

- 参考页面：[College Student Offer 2026 - Education - Apple](../../sources/apple-education-offer/College%20Student%20Offer%202026%20-%20Education%20-%20Apple.html)
- 官方页面：[Apple Education Store](https://www.apple.com/us-edu/store/)
- 顶部结构是一个横向背景，再叠加多张绝对定位的贴纸图片。
- 原页面的贴纸资源是超宽 PNG Sprite，例如背景约 `3008 x 300`，单个贴纸 Sprite 高度约 `540`。
- 每个贴纸通过固定容器尺寸、`object-fit: cover` 和 `object-position` 裁出当前帧。
- 动画使用 `steps(1)`，配合不同的延迟、旋转角度和播放次数，让贴纸像逐帧跳动，而不是平滑的机械旋转。

## 视觉规律

1. **白色剪切边**：贴纸和背景之间使用厚白边，产生手工剪下来的感觉。
2. **故意失衡**：每张贴纸拥有不同的尺寸、旋转角度和上下位置，避免排列像图标墙。
3. **大面积留白**：贴纸数量可以多，但每一个都应有自己的呼吸区。
4. **短促运动**：进入页面时先完成一轮轻微摆动，停下来后保留静态构图。
5. **颜色分组**：使用两到三个高饱和色作为主角，文字和底色保持简单。

## 自有 HTML / CSS 重建

下面的结构使用自有文字和 CSS 形状，可以替换成经过授权的 PNG、SVG 或你自己制作的 Sprite：

```html
<div class="sticker-stage">
  <span class="cutout cutout--burst">WOW!</span>
  <span class="cutout cutout--eyes">LOOK</span>
  <span class="cutout cutout--cap">MAKE<br>IT</span>
</div>
```

```css
.sticker-stage {
  position: relative;
  min-height: 320px;
  overflow: hidden;
  background: #f7c84b;
}

.cutout {
  position: absolute;
  display: grid;
  place-items: center;
  border: 10px solid #fff;
  box-shadow: 0 8px 0 #111;
  transform-origin: 50% 0;
  animation: sticker-sway 1.8s ease-in-out infinite alternate;
}

@keyframes sticker-sway {
  from { transform: rotate(-8deg) translateY(0); }
  to { transform: rotate(8deg) translateY(-4px); }
}

@media (prefers-reduced-motion: reduce) {
  .cutout { animation: none; }
}
```

## Sprite 换帧

当贴纸图像是一条横向 Sprite 时，可以把它当成一个固定大小的窗口：

```css
.sprite-sticker {
  width: 132px;
  height: 132px;
  object-fit: cover;
  object-position: 0 0;
  animation: sprite-step 1.8s steps(1) 2;
}

@keyframes sprite-step {
  0% { object-position: 0 0; }
  25% { object-position: 25% 0; }
  50% { object-position: 50% 0; }
  75% { object-position: 75% 0; }
  100% { object-position: 100% 0; }
}
```

如果需要更稳定的跨浏览器换帧，可以用 `background-image` 加 `background-position`，或者把每一帧导出成独立图片，由 JavaScript 切换 `data-frame`。

## 适合使用

- 活动页、校园主题、周年庆、发布会和节日页面
- 品牌首页的开场区域或角落装饰
- 需要制造年轻、乐观、非严肃气质的 HTML 演示
- 用一个夸张元素打破极简布局的场景

## 使用边界

- 这里只借鉴构图、剪切边、运动节奏和 Sprite 方法，不复制 Apple 的贴纸图片、Logo、文案或原页面代码。
- 贴纸要服务于主标题或 CTA，不能让所有元素都在同时运动。
- 提供静态首帧，并在 `prefers-reduced-motion: reduce` 下关闭摆动。
