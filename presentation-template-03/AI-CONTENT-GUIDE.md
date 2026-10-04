# Presentation Template 03 · AI 内容制作指南

> 给负责生成、修改和审阅演示内容的 AI 使用。
>
> 本文件是内容层契约，不是视觉重构指南。除非用户明确要求开发新页型或修改交互，不要修改 `js/`、`styles/`、`vendor/` 和渲染逻辑。

## 0. 你的任务

你要把用户提供的研究材料、学习资料或组会进展，整理成：

```text
一份 content/sample.md 主稿
→ 一份 data/presentation.config.js 运行快照
→ 一场可键盘播放、可离线复制的演示
```

用户只应该需要审核内容并用自然语言提出修改意见。不要让用户手动编辑运行快照，也不要让用户修改 JavaScript。

当前模板的固定能力：

- 主题：`cubist-spatial`
- 设计画布：1920 × 1080，运行时等比适配
- 正文：暖白阅读页；左下角保留 Library 地球模型
- 开场：像素 / 代码字体、Library 地球与空间化目录
- 结尾：最后一页只能是 `closing`，默认内容为 `THANKS`
- 章节：当前支持 **3–8 章**；示例是 4 章，但 4 不是契约
- 内容页：可按材料需要增删、重排，不要求凑齐所有页型
- 运行：本地 `file://`，不联网、不请求运行时 AI

## 1. 工作前先读什么

按以下顺序读取：

1. 本文件 `AI-CONTENT-GUIDE.md`
2. `content/sample.md`：当前语法和完整示例
3. `review.html`：生成后用于内容审阅
4. `js/slide-renderer.js`：只在需要确认字段时阅读，不要随意修改

如果用户只提供零散材料，先建立内容提纲和缺口清单；不要为了填满页面编造数据、文献、研究结论或时间线。

## 1.1 场景与内容底线

这套模板面向两类场景，共用同一套页型和导航，不开发两套模板：

- **组会进展**：本阶段目标、已完成工作、阶段证据、问题与限制、下一步与需要的反馈。
- **学科学习汇报**：学习问题与范围、核心概念、方法或案例、比较与自己的理解、尚未解决的问题。

使用边界：

- 单场约 10–20 分钟，通常 20–30 页；页数不是硬性目标。
- 章节扉页可选，不为凑页数添加。
- 内容要区分文献观点、自己的分析与待验证假设。
- 图表、表格、流程与引用必须能核对：单位、坐标、样本、来源和示意边界写清楚。
- 缺失数据或来源标记待补，不编造统计量、文献或研究结论。
- 论文原图可以放进图文页，但必须注明出处；不能用一张截图替代结构化流程、表格或统计图。
- 动画、粒子与转场只是节奏工具，不改变数据和判断。

## 2. 章节如何组织

### 2.1 章节不是固定四章

章节由正文页面上的元数据自动生成：某个页面第一次出现 `@chapter: xxx` 时，编译器会创建一个章节；该页面成为章节的第一页。

例如：

```markdown
## S04 | headline-points
@chapter: question
@chapterTitle: 问题
@chapterEnglish: THE QUESTION
# 研究从一个可被复述的问题开始。
```

这会创建：

```text
chapter id: question
chapter title: 问题
chapter English: THE QUESTION
first slide: S04
```

同一章节后续页面继续使用同一个 `@chapter`，不要重复创建新的 ID。

### 2.2 章节数量规则

- 推荐：3–6 章。
- 当前正式验证范围：3–8 章。
- 章节 ID 必须稳定、简短、使用英文小写和连字符，例如 `question`、`method`、`evidence-review`。
- 章节编号默认按首次出现顺序自动生成 `01`、`02`、`03`……
- 如确实需要固定编号，可以在章节第一页写 `@chapterNumber: 02`；除非用户明确要求，不要手工编号。
- 章节标题应是问题、阶段或叙事动作，不要只写“其他”“补充”。
- 不要创建没有正文页的空章节。
- 章节顺序由页面首次出现顺序决定。要调整章节顺序，重排页面或修改页面的 `@chapter`。

### 2.3 章节的推荐叙事

根据用户场景选择，不要机械套用：

**组会进展**

```text
问题与目标 → 已完成工作 / 方法 → 阶段证据 → 问题与限制 → 下一步 / 需要反馈
```

**学科学习汇报**

```text
学习问题 → 核心概念 → 方法 / 案例 → 比较与理解 → 尚未解决的问题
```

章节之间直接连续翻页。不要为了每个章节都返回目录，也不要强制添加章节扉页；只有确实需要换气时才使用 `section-divider`。

## 3. 页面顺序契约

一个完整主稿通常按以下顺序：

```text
S01 cover
S02 contents
正文页面，按章节排列
references（可选但学术汇报建议有）
closing（必须是最后一页）
```

要求：

- 第一页必须是 `cover`。
- 第二页必须是 `contents`。
- 正文页面 ID 稳定且唯一。
- `references` 可以有一页或多页，放在内容结束处。
- `closing` 必须是最后一页；当前默认只显示粒子 THANKS。
- 不要把 `closing` 放在参考资料前面。
- 不要使用连续数字作为唯一语义，例如可以跳过 `S03`，但不能重复 ID。
- 推荐使用 `S01`、`S02`、`S04` 这样的稳定 ID；修改内容时尽量不要整体重编号，否则审阅意见会失效。

## 4. Markdown 主稿格式

主稿位置固定为：

```text
content/sample.md
```

### 4.1 Deck 配置

文件开头只有一个 `~~~deck` JSON 块：

```markdown
~~~deck
{
  "title": "演示主标题",
  "display": "ENGLISH / PIXEL LABEL",
  "theme": "cubist-spatial",
  "kicker": "PERSPECTIVES / IN COLOUR",
  "author": "汇报人 · 单位",
  "meta": "2026 / OFFLINE DECK",
  "subtitle": "一句清楚的副标题"
}
~~~
```

不要修改 `theme`。当前模板只接受 `cubist-spatial`。

### 4.2 页面头

每页使用：

```markdown
## S04 | headline-points
@chapter: question
@chapterTitle: 问题
@chapterEnglish: THE QUESTION
@eyebrow: A CLEAR STARTING POINT
# 页面标题第一行
# 页面标题第二行
```

规则：

- `##` 后面是页面 ID和页型，中间使用 ` | `。
- 元数据使用 `@key: value`，不要写任意 HTML 或 JavaScript。
- `#` 是标题行；多行标题会按模板排版。
- `>` 是引用、导语或限制条件。
- `-` 是要点。
- `~~~flow`、`~~~table`、`~~~bars`、`~~~timeline`、`~~~references` 是受限 JSON 数据块。

## 5. 页型选择指南

### `cover`

用途：说明整场演示是什么。

字段：deck 配置中的 `title`、`display`、`kicker`、`author`、`meta`、`subtitle`。

规则：

- 只保留一个主命题，不塞正文要点。
- 不修改封面 DOM 或地球舞台来适应过长标题；标题太长时先精炼或拆成副标题。

### `contents`

用途：章节导航。

字段：通常只需要标题；章节由正文 `@chapter` 自动生成。

规则：

- 不在这里手写章节列表。
- 不在这里重复章节内容。
- 3–8 章由运行时自动渲染，章节越多越要保持标题短。

### `headline-points`

用途：最常用的判断 + 要点页。

容量：1 个主判断，建议 3–5 个要点；每条尽量 1–2 行。

```markdown
## S04 | headline-points
@chapter: question
@chapterTitle: 问题
@chapterEnglish: THE QUESTION
@eyebrow: A CLEAR STARTING POINT
# 一个可以被复述的判断
> 一句导语，说明判断与后续证据的关系。
- **观察**：发生了什么？
- **张力**：为什么值得解释？
- **边界**：这次不讨论什么？
```

### `statement`

用途：突出一个核心结论、限制或下一步。

```markdown
## S05 | statement
@chapter: question
@eyebrow: THE CENTRAL PROMPT
# 复杂，不应该成为无法开始的理由。
@subtitle: 一句说明条件、限制或证据边界的话。
```

规则：不能只有空泛口号；必须在前后页有证据、方法或限制关联。

### `split-media`

用途：图片、研究图示、预制 SVG 与解释文字。

字段：

```markdown
@asset: assets/charts/method.svg
@caption: 图注，说明示意边界。
```

规则：

- 资源必须在 `presentation-template-03/` 内。
- 说明图片是原图、改绘、合成示例还是占位材料。
- 需要完整阅读的图不要随意裁切。
- 图片不能替代必须结构化的流程、表格或统计图。

### `chart-focus`

用途：展示预制统计图或图表材料。

支持：折线、柱状、散点等已经制作好的本地材料。

字段示例：

```markdown
## S11 | chart-focus
@chapter: method
@eyebrow: ILLUSTRATIVE DATA / LINE
# 一个主要读数
@asset: assets/charts/trend.svg
@caption: 合成示例数据；横轴为阶段，纵轴为任意单位（a.u.）。
@metric: 0.88
@metricLabel: READOUT / ILLUSTRATIVE
- 坐标、单位和系列关系在静止状态可见。
- 结论不能超过材料真正支持的范围。
```

规则：播放阶段不计算统计量，不临时生成图表；缺失值不能自动当零；合成数据必须标明示意。

### `process-flow`

用途：方法步骤、概念关系和工作流程。

容量：每页 3–7 个节点。

```markdown
~~~flow
{
  "layout": "linear",
  "nodes": [
    {"id":"frame", "title":"定义范围", "detail":"FRAME"},
    {"id":"read", "title":"形成判断", "detail":"READ"}
  ],
  "edges": [
    {"from":"frame", "to":"read"}
  ]
}
~~~
```

规则：

- 节点 ID 唯一。
- `edges.from` 和 `edges.to` 必须引用存在的节点。
- 只使用 `linear` 或已经支持的简单 `branch` 布局。
- 复杂流程拆页，不缩成密集小字。

### `table-focus`

用途：需要精确阅读的数据表。

建议容量：6–8 行、约 5 列以内。

```markdown
~~~table
{
  "columns": ["条件", "稳定性", "时延"],
  "units": ["", "%", "ms"],
  "rows": [
    ["条件 A", "62", "42"],
    ["条件 B", "74", "35"]
  ],
  "note": "合成示例数据，不代表实验结果。",
  "source": "source-01"
}
~~~
```

规则：表头、单位、精度、来源必须能核对；不要使用 3D 透视影响数字判断。

### `comparison`

用途：少量对象的并列比较。

```markdown
~~~bars
{
  "unit": "a.u.",
  "series": [
    {"label":"方法 A", "value":62, "note":"基线"},
    {"label":"方法 B", "value":74, "note":"改善"}
  ],
  "note":"合成示例数据，仅用于模板验证。"
}
~~~
```

不要把不同单位或不可比指标放在同一组条形中。

### `timeline`

用途：真实时间或概念阶段。

```markdown
~~~timeline
{
  "kind": "phase",
  "nodes": [
    {"when":"阶段 01", "label":"问题定义", "detail":"范围与边界"},
    {"when":"阶段 02", "label":"证据形成", "detail":"比较与读数"}
  ],
  "note":"概念阶段，不按真实时间比例排布。"
}
~~~
```

如果不是实际日期，不要让版面暗示真实时间比例；使用 `kind: phase` 并写清楚。

### `video-focus`

用途：本地短视频。

字段：

```markdown
@asset: assets/media/sample.webm
@poster: assets/media/sample-poster.svg
@caption: 本地视频说明。
```

规则：不自动播放、不自动发声；`P` 播放 / 暂停，`M` 静音；离开页面会暂停并重置。缺失或解码失败时仍要有可读说明。

### `references`

用途：来源列表。

```markdown
~~~references
[
  {
    "id":"source-01",
    "short":"作者 / 机构 · 年份",
    "text":"完整来源信息",
    "note":"图表、改绘或观点的使用说明。"
  },
  {
    "id":"source-02",
    "short":"待补来源",
    "text":"",
    "note":"请用户补齐。",
    "pending":true
  }
]
~~~
```

正文中使用 `[@source-01]`，编译器会按首次引用顺序自动编号；同一来源多次引用时复用编号。

规则：

- 不能伪造作者、标题、年份、DOI 或 URL。
- 缺失来源必须明确写 `pending: true`。
- 图注、正文短引和参考页使用同一个 source ID。
- 参考页可以拆成多页，但当前主稿通常使用一个 `references` 页。

### `closing`

用途：结束页。

当前模板的固定结尾：

```markdown
## S24 | closing
@chapter: final
# THANKS
```

规则：

- 必须是主稿最后一页。
- 只保留一个标题 `THANKS`。
- 不添加副标题、句号、页码、联系方式或额外要点；粒子效果由运行时自动处理。
- 章节可使用最后一个真实章节，也可以使用专门的 `final` 章节，但不要因此在目录中制造空章节。

## 6. 素材规则

目录建议：

```text
assets/
  charts/     预制 SVG / PNG 图表
  media/      视频、poster
  imagery/    图片或研究图
```

所有 `@asset` 和 `@poster` 必须满足：

- 使用相对于 `presentation-template-03/` 的路径；
- 文件确实存在；
- 不使用 `../`、绝对路径、CDN、在线图片或运行时 API；
- 有图注、替代说明或来源信息；
- 版权和许可信息写入 `LICENSES/` 或主稿说明。

AI 不应自动把上级 `assets/` 目录的素材复制进来。只有确认要放进演示的资源才复制到模板目录。

## 7. 修改流程

每次修改都遵循：

```text
1. 读取 content/sample.md
2. 读取本指南并确认页型容量
3. 用稳定页面 ID定位修改页
4. 只修改 content/sample.md 和必要的本地素材
5. 运行 python tools/build_content.py
6. 打开 review.html 检查页序、章节、来源、资源
7. 运行对应测试
8. 报告修改页 ID、页型、章节变化和测试结果
```

常用命令：

```bash
python tools/build_content.py
python test/tools/check_formal.py
python test/tools/check_keyboard.py
python test/tools/check_planet.py
python test/tools/check_content_closing.py
python test/tools/check_planet_continuity.py
```

如果只改普通文本，至少运行 `check_formal.py` 和 `check_keyboard.py`；如果改章节或页序，再运行 `check_cubist.py`；如果改正文页脚、地球或结尾，再运行 `check_content_closing.py` 和 `check_planet_continuity.py`。测试脚本位于 `test/tools/`，测试截图只写入系统临时目录。

## 8. 给 AI 的交付报告格式

完成后用下面格式报告：

```text
内容修改完成

章节：5 章（question / method / evidence / discussion / next-step）
页面：22 页；新增 S24、S25；删除 S17
修改：S08 headline-points、S14 chart-focus、S21 references
素材：新增 assets/charts/result.svg；已确认本地路径
引用：新增 source-03；正文短引与参考页已关联
结尾：最后一页为 THANKS
验证：build_content.py、check_formal.py、check_keyboard.py 通过
未解决：S14 缺少样本量，已标记待补
```

不要报告“看起来不错”作为验收；要报告稳定 ID、实际页型、章节数量、素材路径和测试结果。

## 9. 严禁事项

- 不要把四章写死在内容主稿、AI 提示词或新页面中。
- 不要直接编辑 `data/presentation.config.js`，它是生成文件。
- 不要为文字过多临时增加不可复用页型。
- 不要把整页截图作为唯一内容来源。
- 不要编造数据、统计结论、引用、日期或来源。
- 不要把所有内容塞到一页；超出容量就拆页。
- 不要为了视觉效果修改图表数字、坐标轴、单位或比例。
- 不要在内容任务中修改导航、地球模型、粒子引擎或主题 CSS。
- 不要添加远程资源、CDN、外部字体或运行时服务。
- 不要删除 `LICENSES/` 中与新增资源对应的许可证。
