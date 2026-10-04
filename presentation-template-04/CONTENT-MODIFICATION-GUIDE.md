# Presentation Template 04 内容修改说明

这份文件供后续 AI 或开发者修改模板四的具体演示内容时阅读。模板四把“内容数据”和“视觉实现”分开：一般内容修改只需要编辑 `content/sample.md`，再运行编译脚本；不要直接手动修改运行快照。

## 文件关系

```text
presentation-template-04/
  content/sample.md                 人工编辑的唯一内容主稿
  data/presentation.config.js       浏览器实际读取的运行快照
  tools/build_content.py            Markdown 主稿编译器
  js/slide-renderer.js              正文页型渲染器
  js/navigation.js                  键盘导航规则
  js/editorial-opening.js           封面、目录、Thanks 粒子页
  styles/slides.css                 正文页视觉样式
  test/tools/check_formal.py        页面和资源回归检查
  test/tools/check_keyboard.py      键盘、章节和媒体回归检查
  tools/check_template04.py         模板四开场和 Thanks 页面检查
```

修改内容的标准流程：

```text
编辑 content/sample.md
→ 运行 python tools/build_content.py
→ 检查 data/presentation.config.js 的页数、章节和首屏
→ 运行三个检查脚本
→ 打开 index.html 检查视觉效果
```

`data/presentation.config.js` 是生成文件。直接修改它只能暂时影响浏览器，下一次运行 `build_content.py` 就会被覆盖。

## 主稿的基本格式

文件使用一个受限 Markdown 方言：

```md
~~~deck
{
  "title": "演示标题",
  "display": "DISPLAY TITLE",
  "theme": "editorial-spatial",
  "kicker": "PASTEL ROUTE / STUDY 04",
  "author": "作者",
  "meta": "TEMPLATE 04 · 2026",
  "subtitle": "副标题"
}
~~~

## S01 | cover
@kicker: PASTEL ROUTE / STUDY 04
# 第一行标题
# 第二行标题
@subtitle: 封面副标题
@meta: 日期或版本

## S02 | contents
# 阅读路径
```

规则如下：

- `## ID | type` 开始一张页面。ID 必须唯一，只允许字母、数字、下划线和连字符。
- `# ` 是页面标题，可以写多行。大多数正文页会把多行标题用换行显示。
- `@key: value` 是页面元数据。常用字段见后文的页面类型表。
- `> ` 是引用或说明文字。
- `- ` 是列表项。列表内容可以使用 `**加粗**`。
- `~~~name` 到下一个 `~~~` 是 JSON 数据块，例如 `flow`、`table`、`bars`、`timeline`、`references`。
- 空行只用于排版，不会生成内容。
- 每张页面必须至少有一个标题，即至少一行 `# `。

## 章节数量可以变化

章节不是写死在 JavaScript 里的。编译器会按照页面第一次出现 `@chapter` 的顺序自动生成 `config.chapters`。

### 三个章节

只需要让内容主稿里出现三个章节 ID，例如：

```md
## S04 | headline-points
@chapter: ch1
@chapterTitle: 问题
@chapterEnglish: THE QUESTION
# 第一个章节的第一张页面

## S08 | headline-points
@chapter: ch2
@chapterTitle: 方法
@chapterEnglish: THE METHOD
# 第二个章节的第一张页面

## S13 | headline-points
@chapter: ch3
@chapterTitle: 结论
@chapterEnglish: THE CONCLUSION
# 第三个章节的第一张页面
```

删除一个章节时，要同时删除或改写该章节下的所有页面，并确认没有页面继续使用被删除的 `@chapter` ID。

### 增加章节

增加章节时，在新章节的第一张页面上使用一个新的 `@chapter` ID，并提供：

```md
@chapter: ch5
@chapterTitle: 新章节
@chapterEnglish: NEW CHAPTER
```

目录会自动显示新章节，章节节点和路线会自动重新计算。不要手动给 `config.chapters` 添加记录。

章节首张页面的 `id` 会自动成为该章节的 `firstSlideId`。这张页面必须是真实正文页，不能使用 `cover`、`contents` 或 `closing`。

当前键盘数字键只直接支持 `1`–`8`。如果章节超过 8 个，目录仍可用左右方向键、Home、End 和鼠标选择；如果产品要求每个章节都能用数字键直接选择，需要同步修改 `js/navigation.js` 中的数字键范围和对应测试。

### 章节页的注意事项

- 一个章节的所有页面都要使用同一个 `@chapter` ID。
- 只有章节第一张页面需要设置 `@chapterTitle` 和 `@chapterEnglish`；为了让主稿自解释，建议每个章节第一张页面都保留这两个字段。
- `@chapterTitle` 是目录中文标题，`@chapterEnglish` 是目录英文副标题。
- 参考资料页或结尾页需要明确保留 `@chapter: ch4` 之类的章节归属，这样章节末尾返回目录时能选中正确章节。
- `closing` 当前应保持为最后一张页面。它是独立的粒子舞台，不属于普通阅读页。

## 页面类型和修改方法

### `cover`

封面是第一张页面，当前 ID 为 `S01`。它负责提供标题数据，实际视觉由 `js/editorial-opening.js` 绘制。

```md
## S01 | cover
@kicker: PASTEL ROUTE / STUDY 04
# 让判断
# 可见。
@subtitle: 封面副标题
@meta: TEMPLATE 04 · 2026
```

修改封面文案可以编辑主稿；修改笔触位置、颜色、数量或封面动画需要编辑 `js/editorial-opening.js`。

### `contents`

目录通常是第二张页面，当前 ID 为 `S02`。标题来自主稿，但章节节点来自自动生成的 `config.chapters`。

```md
## S02 | contents
# 阅读路径
```

不要在这里手写章节列表。章节列表由章节元数据生成。

### `headline-points`

适合标题、引用和三到五条要点。

```md
## S04 | headline-points
@chapter: ch1
@eyebrow: A CLEAR STARTING POINT
# 研究从一个
# 可被复述的问题开始。
> 一句可以带走的解释。
- **观察**：发生了什么？
- **张力**：为什么值得解释？
- **边界**：这次不讨论什么？
```

### `statement`

适合单个大判断。它不渲染普通 `h1`，而是使用 statement 专用的大字样式。

```md
## S05 | statement
@chapter: ch1
@eyebrow: THE CENTRAL PROMPT
# 复杂，不应该成为无法开始的理由。
@subtitle: 对这句话的补充说明。
```

### `split-media`

左侧显示本地图片，右侧显示引用和要点。

```md
## S06 | split-media
@chapter: ch1
@eyebrow: FRAMING THE QUESTION
# 让范围
# 有清楚的边界。
@asset: assets/charts/method.svg
@caption: 图片说明
> 图片旁边的引用文字。
- 图片旁边的说明一
- 图片旁边的说明二
```

`@asset` 必须是模板目录内的相对路径。不要使用 CDN、远程图片或远程字体。

### `chart-focus`

用于预制图表和右侧指标。

```md
## S10 | chart-focus
@chapter: ch2
@eyebrow: SIGNAL / NOISE
# 让差异先被看见。
@asset: assets/charts/trend.svg
@caption: 图表说明
@metric: 2.4×
@metricLabel: 可见差异
> 图表旁边的解释。
- 图表要点一
- 图表要点二
```

页面不会在浏览器里重新计算图表。需要新图表时，先生成或替换 `assets/charts/` 下的本地 SVG，再更新 `@asset`。

### `process-flow`

使用 `~~~flow` JSON 块生成流程图。

```md
## S09 | process-flow
@chapter: ch2
@eyebrow: FROM QUESTION TO READING
# 一条线性的路径
> 流程图说明。
~~~flow
{
  "layout": "linear",
  "nodes": [
    {"id":"frame", "title":"定义范围", "detail":"FRAME"},
    {"id":"compare", "title":"比较差异", "detail":"COMPARE"},
    {"id":"read", "title":"形成判断", "detail":"READ"}
  ],
  "edges": [
    {"from":"frame", "to":"compare"},
    {"from":"compare", "to":"read"}
  ]
}
~~~
```

当前渲染器适合 3–7 个节点。正式内容应保持 3–7 个节点，并保证每条 edge 的 `from` 和 `to` 都存在。

### `table-focus`

使用 `~~~table` JSON 块。

```md
## S11 | table-focus
@chapter: ch2
@eyebrow: SAME SCALE
# 同一组材料，可以得出不同的阅读。
@note: 表格注释
~~~table
{
  "columns": ["维度", "方案 A", "方案 B"],
  "units": ["", "均值", "均值"],
  "rows": [
    ["速度", "0.82", "0.64"],
    ["稳定性", "0.76", "0.88"]
  ],
  "source": "source-01",
  "note": "表格说明。"
}
~~~
```

每一行的单元格数量应该与 `columns` 数量一致。`source` 必须引用已经在 `references` 块中声明的来源。

### `comparison`

使用 `~~~bars` JSON 块生成比较条形图。

```md
## S14 | comparison
@chapter: ch3
@eyebrow: COMPARE
# 比较不同方案。
~~~bars
{
  "unit": "分",
  "series": [
    {"label":"方案 A", "value":82, "note":"稳定"},
    {"label":"方案 B", "value":64, "note":"波动"}
  ],
  "note": "合成数据说明。"
}
~~~
```

### `timeline`

使用 `~~~timeline` JSON 块。`kind` 可以是 `phase` 或其他简短字符串。

```md
## S15 | timeline
@chapter: ch3
@eyebrow: TIME / PHASE
# 让变化拥有时间尺度。
~~~timeline
{
  "kind": "phase",
  "nodes": [
    {"when":"01", "label":"观察", "detail":"记录材料"},
    {"when":"02", "label":"判断", "detail":"形成结论"}
  ],
  "note": "时间线说明。"
}
~~~
```

### `video-focus`

使用本地视频，不自动播放。`P` 播放或暂停，`M` 静音；离开页面会暂停并重置。

```md
## S16 | video-focus
@chapter: ch3
@eyebrow: MOVING EVIDENCE
# 让过程保留运动。
@asset: assets/media/sample.webm
@poster: assets/media/sample-poster.svg
@caption: 视频说明
> 视频旁边的说明。
- 播放操作说明
```

### `references`

参考页可以在页面中使用 `~~~references` JSON 块声明来源。来源会被汇总到 `config.references`，并用于正文中的 `[@source-id]` 引用。

```md
## S23 | references
@chapter: ch4
@eyebrow: SOURCES / REPRODUCIBILITY
# 让来源可追溯。
> 参考资料说明。
~~~references
[
  {"id":"source-01", "short":"来源简称", "text":"完整来源", "note":"来源备注"},
  {"id":"source-02", "short":"待补来源", "text":"", "note":"", "pending": true}
]
~~~
```

不要重复声明同一个来源 ID 的不同文本。编译器会拒绝冲突定义。

### `closing`

结尾页当前应放在主稿最后：

```md
## S24 | closing
@chapter: ch4
@eyebrow: END / THANKS
# THANKS
@subtitle: KEEP THE QUESTION MOVING
@note: TEMPLATE 04 · PASTEL ROUTE
```

当前运行时只使用它的页面类型和导航位置，页面文字由粒子 Canvas 绘制。修改 Thanks 的粒子数量、颜色、采样密度、聚合时间或背景，需要编辑 `js/editorial-opening.js` 的 `makeClosingParticles()` 和 `updateClosing()`。

## 页面增删和编号

页面 ID 只是内容定位标识，不要求连续。可以保留 `S04`、`S08` 这样的编号，也可以使用新的 ID，只要唯一即可。

增加页面：

1. 在合适章节的页面后添加新的 `## ID | type` 区块。
2. 设置正确的 `@chapter`。
3. 添加该页面类型需要的字段或 JSON 块。
4. 运行编译器。
5. 检查目录页码、章节首张页面和总页数。

删除页面：

1. 删除完整的页面区块，包括它的 JSON 块。
2. 如果删掉的是章节第一张页面，要确认该章节仍有下一张页面带相同 `@chapter`；否则该章节会从目录中消失。
3. 如果删除的是最后一张正文页，要确认 `closing` 仍然是最后一张页面。
4. 重新编译并检查总页数。

不要只删除标题，留下孤立的 JSON 块；也不要把 `closing` 放到普通正文页中间。

## 引用和本地资源

正文文字中可以这样引用：

```md
- 这个判断需要回到来源。[@source-01]
```

对应来源必须在任意一个 `references` 块中声明。编译器会给被正文实际引用的来源自动编号。

所有资源应放在模板目录内：

- 图片和 SVG：`assets/charts/` 或其他 `assets/` 子目录；
- 视频：`assets/media/`；
- 字体：`assets/fonts/`；
- 不要在内容主稿中写 `http://` 或 `https://` 资源地址。

## 需要修改代码的情况

以下修改不能只编辑 Markdown：

- 新增页面类型；
- 改变页面布局或文字层级；
- 改变封面笔触、目录路线或 Thanks 粒子舞台；
- 修改章节选择规则、数字键范围或返回目录逻辑；
- 改变视频、图表或全屏行为。

对应入口分别是：

- 页面结构：`js/slide-renderer.js`；
- 键盘行为：`js/navigation.js` 和 `js/app.js`；
- 封面、目录、Thanks：`js/editorial-opening.js`、`js/spatial-stage.js`、`styles/opening.css`；
- 正文视觉：`styles/slides.css`、`styles/tokens.css`。

修改这些文件后，必须运行相应的浏览器检查；不要只凭静态代码判断页面没有回归。

## 验证命令

从 `presentation-template-04/` 目录运行：

```text
python tools/build_content.py
python tools/check_template04.py
python test/tools/check_formal.py
python test/tools/check_keyboard.py
```

检查重点：

- 编译器输出的页面总数和章节总数正确；
- 每个章节都能从目录进入第一张正文页；
- 最后一张页面是 `closing`，并能显示粒子 Thanks；
- 正文 footer 在底部，页码没有跑到内容中间；
- 图片、视频、字体都能离线加载；
- 各种窗口尺寸和减少动态模式都能运行；
- 浏览器控制台没有 JavaScript 错误，页面没有远程请求。

如果只修改内容主稿，至少运行 `build_content.py` 和 `check_formal.py`；如果修改章节、页面顺序或导航，四个命令都要运行。
