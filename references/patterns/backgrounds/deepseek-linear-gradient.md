# DeepSeek 线性渐变背景

## 类型

背景视觉模式 / CSS pattern

这不是需要单独下载的图片。效果由一个全宽首屏区域的 CSS `linear-gradient` 生成，适合直接改写到自己的 HTML 演示文件中。

## 来源观察

- 参考页面：[DeepSeek | Into the Unknown](../../sources/deepseek/DeepSeek%20_%20Into%20the%20Unknown.html)
- 原页面的首屏渐变方向为 `180deg`，从顶部的 `#9cc1e7` 向下淡出到透明。
- 渐变写在首屏 `section` 的内联样式中，覆盖整个首屏区域。
- 页面另有 `ds-cursor-canvas` 光标交互层；它不是背景本身，不需要为了复用渐变而引入 Canvas。

## 可复用写法

下面是根据这个视觉关系整理的自有版本。颜色可以替换为项目的品牌色：

```html
<section class="brand-gradient-hero">
  <div class="hero-content">
    <p class="eyebrow">Your project</p>
    <h1>Into the next idea</h1>
  </div>
</section>
```

```css
:root {
  --brand-sky: #9cc1e7;
  --page-surface: #fafafa;
}

.brand-gradient-hero {
  min-height: min(100svh, 1020px);
  display: grid;
  place-items: center;
  overflow: hidden;
  background:
    linear-gradient(180deg, var(--brand-sky) 0%, rgba(250, 250, 250, 0) 100%),
    var(--page-surface);
}

.hero-content {
  width: min(100% - 3rem, 72rem);
  padding: 6rem 0 3rem;
}
```

## 设计拆解

1. **先确定落点**：顶部的纯色区域承担品牌识别，底部透明让页面自然接入下一个内容区。
2. **渐变保持克制**：只有一个主色和透明终点，文字、插图或交互组件才是视觉重点。
3. **用首屏高度控制节奏**：`min(100svh, 1020px)` 让首屏在手机和大屏上都不会无限拉长。
4. **背景与内容分离**：内容放在独立容器中，后续可以替换渐变而不改动排版。

## 适合使用

- 品牌介绍、产品首页、研究项目开场页
- 极简的 HTML 演示文稿首屏
- 需要从“品牌色”平滑过渡到白色内容区的页面

## 变体方向

- **更柔和**：降低顶部颜色的饱和度，或把终点改成 `rgba(250, 250, 250, 0.18)`。
- **更有层次**：在同一个 `background` 中叠加一个低透明度的 `radial-gradient`，但建议不超过两层。
- **更有翻页感**：让每个章节拥有自己的渐变色变量，进入章节时只切换变量，不改变布局。
- **深色版本**：将底色换成深色，并把渐变终点改成与深色底相同的透明过渡。

## 使用边界

- 只借鉴渐变关系、空间节奏和实现方式，不复制 DeepSeek 的 Logo、文案或页面内容。
- 纯 CSS 渐变不需要放入 `assets/imagery/`；真正下载的图片仍放在 `assets/imagery/backgrounds/`。
- 如果加入动态颜色或渐变动画，应同时提供 `prefers-reduced-motion: reduce` 下的静态状态。
