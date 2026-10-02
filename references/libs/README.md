# Local libraries

这里存放**可以直接带走的成品库文件**，用来给自己的便携版 HTML 演示提供能力。

它们不是需要安装的软件，只是普通 `.js` 文件。使用方式有两种：

## 方式一：跟随文件夹一起复制

```text
my-demo/
├── index.html
└── anime.umd.min.js
```

```html
<script src="anime.umd.min.js"></script>
```

复制整个文件夹到任何电脑，双击 `index.html` 即可运行，无需安装、无需联网。

## 方式二：内嵌进单个 HTML 文件

把库文件内容直接粘贴进 `<script>` 标签内，最终只有一个 `index.html`。

`references/rebuilds/` 里的便携演示都采用这种方式，所以每个演示都是单文件。

---

## anime — Anime.js

- 文件：`anime/anime.umd.min.js`（116 KB）
- 版本：v4.5.0
- 许可：MIT，版权归 Julian Garnier，见 `anime/LICENSE.md`
- 来源：https://github.com/juliangarnier/anime
- 全局变量：`anime`
- 主要 API：`anime.animate`、`anime.stagger`、`anime.createTimeline`、`anime.svg`、`anime.text`、`anime.utils`

示例用法：

```html
<script src="../../libs/anime/anime.umd.min.js"></script>
<script>
  anime.animate('.box', {
    x: 320,
    rotate: { from: -180 },
    duration: 1250,
    delay: anime.stagger(65, { from: 'center' }),
    ease: 'inOutQuint',
    loop: true,
    alternate: true
  });
</script>
```

> 注意：使用 UMD 打包版时，所有 API 都挂在全局 `anime` 对象下（例如 `anime.animate`），而不是像官方 ESM 示例那样直接 `import { animate }`。
