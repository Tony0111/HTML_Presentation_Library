# Motion Intro — Anime.js

用 Anime.js v4 做的一段 PPT 开场动效，**单文件、完全离线**。

## 使用

双击 `index.html` 即可。不需要安装、不需要服务器、不需要网络。

- 文字逐字入场
- 卡片错峰浮现
- 数字滚动
- 折线自行绘制，节点依次弹出
- 右上角 `Replay` 按钮可重播

## 这个文件说明了什么

它演示了「库」该怎么用：

```text
anime-motion-intro/
└── index.html     ← 库的代码已经内嵌在这个文件里
```

Anime.js 的库文件（116 KB）被直接粘贴进了 `<script>` 标签内。所以这一个 HTML 就是全部内容，复制它到任何电脑都能运行。

同目录下不需要额外的 `.js` 文件。

## 用到的 API

```js
anime.createTimeline({ defaults: { ease: 'out(3)', duration: 720 } })
  .add('.letter', { opacity: [0, 1], y: [30, 0], delay: anime.stagger(26) })
  .add('.card',   { opacity: [0, 1], y: [24, 0], delay: anime.stagger(120) });

anime.animate('.live', { scale: [1, 1.9], loop: true, alternate: true });

// SVG 路径描边
const drawable = anime.svg.createDrawable('#line')[0];
timeline.add(drawable, { draw: ['0 0', '0 1'] });
```

注意 UMD 版本把 API 挂在全局 `anime` 对象上，所以要写 `anime.animate`、`anime.stagger`，而不是官方的 `import { animate }`。

## 许可

Anime.js 为 MIT 许可，版权归 Julian Garnier。库文件与许可原文见 `references/libs/anime/`。
