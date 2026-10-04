# Template 02 内容制作说明

这是可离线打开的 HTML 演示模板，不是 PowerPoint 的 `.pptx` 文件。修改内容后，用 Python 生成浏览器读取的数据；观看演示不需要 Python、网络或服务器。

## 1. 制作流程与文件分工

制作新演示时，复制整个 `presentation-template-02/` 文件夹，保留字体、脚本、样式、vendor 和 LICENSES。不要只复制 `index.html`。

| 文件或目录 | 用途 | 何时修改 |
| --- | --- | --- |
| `content/sample.md` | 内容源文件，定义演示信息、章节与页面 | 制作内容主要修改这里 |
| `data/presentation.config.js` | 自动生成的浏览器运行数据 | 不手动改，下次生成会覆盖 |
| `assets/charts/`、`assets/media/` | 本地图片、图表、视频与视频封面 | 添加自己的素材 |
| `styles/theme.css` | 正文布局、字号和章节配色 | 内容确实无法适配时调整 |
| `styles/opening.css` | 封面、目录、结尾布局 | 调整空间页面时修改 |
| `js/slide-renderer.js` | 正文页型渲染器 | 新增页型才需要修改 |
| `js/spatial-stage.js` | 封面与目录场景 | 调整屏风尺寸、间距与位置时修改 |
| `js/thanks-particles.js` | Thanks 粒子文字 | 更换结尾粒子文字或效果时修改 |

在模板文件夹内运行：

```powershell
cd E:/Design-agent-template-02/presentation-template-02
python tools/build_content.py
```

若在仓库根目录运行，命令为 `python presentation-template-02/tools/build_content.py`。复制模板后，`cd` 应改成你的新文件夹。脚本读取它所属模板的 `content/sample.md`；如果重命名源文件，需修改脚本中的 `SOURCE`。

成功后打开或刷新 `index.html`。只改 Markdown 而不生成，浏览器仍显示旧内容。源文件、生成文件、新增素材应一起保留或提交 Git。

## 2. 封面与演示信息

文件开头的 `~~~deck` 块使用合法 JSON：双引号、无注释、无末尾多余逗号。例如替换其中的数据：

```json
{
  "title": "你的演示名称",
  "display": "YOUR PRESENTATION",
  "theme": "cyan-orange-spatial",
  "kicker": "RESEARCH / REPORT",
  "author": "姓名或团队",
  "meta": "2026",
  "subtitle": "演示副标题"
}
```

保留 `theme` 为 `cyan-orange-spatial`，否则模板会拒绝加载。封面 kicker、subtitle、author 来自 deck；封面大标题来自 `cover` 页的 `#` 行。`display` 和 `meta` 目前没有独立可见栏位，不要把关键信息只填在这里。

封面可用两个 `#` 行明确换行。目录名称来自 `contents` 页的标题。

## 3. 增减章节

### 章节由内容自动建立

章节不是固定四个。生成器按 `@chapter` 首次出现建立章节；顺序按页面在文件中的顺序，不按 ID 或章号排序。不需要手动编辑 `chapters`、`firstSlideId` 或屏风数量。

一章的第一页应写全章名与英文名：

```markdown
## Results_Start | headline-points
@chapter: results
@chapterTitle: 结果
@chapterEnglish: RESULTS
@eyebrow: MAIN FINDINGS
# 核心结果是什么？
> 用一句话概括这一章。
- **发现一**：第一条结果。
- **发现二**：第二条结果。
```

后续页都写相同的 `@chapter: results`。`@chapterTitle` 和 `@chapterEnglish` 只有该 ID 第一次出现时用于建立目录，所以必须放在真正的章首页。缺少章名会显示章节 ID。

- 新增章节：在上一章全部页面之后、结尾之前插入上述结构，使用新章节 ID。
- 删除章节：删除属于该章的全部页。只要残留一页带该 ID，它仍会生成一章。
- 调整顺序：整体移动一章全部页面，不只移动首页。
- 合并章节：统一其所有页的 `@chapter`，在合并后的第一页设置章名与英文名。
- 删除章首页但保留后续页：把章名、英文名移到新的第一页。
- 删除页面时保留仍被使用的引用定义，必要时移到参考来源页。

同一章的页面必须连续，不要排列成 A 章、B 章、再 A 章。目录入口、页码区间与章节结束返回目录的逻辑按连续章节设计。

默认章号自动生成 `01`、`02` 等。可在章首页加 `@chapterNumber: 05` 自定义显示，但快捷键和配色仍按实际章节顺序，而不是显示编号。

### 数量与视觉边界

至少保留一章正文。运行代码根据章节数组生成目录，没有编译器层面的四章限制，但不代表任意数量都已视觉验证。

- 1 至 4 章保持当前缩放；超过 4 章，屏风环按 `4 / 章节数` 缩小，文字也会变小。
- 当前完整视觉回归针对四章示例。减少到一、两章或增加到五、六章后，需逐章检查遮挡、正反面、标题和点击区域。
- 左右键可选全部章节；目录 Home / End 选首章 / 末章。数字快捷键仅支持 `1` 至 `8`，更多章节用方向键，不支持输入两位章号。
- 无 WebGL 的降级目录把所有章节放在一行，数量多会挤压文字；需调整 `opening.css` 的降级布局为多行，并检查页脚间距。
- 章节很多时建议先合并成较少的大章；若要保持大字号，应调整目录布局，而非不断增加屏风。

例如把当前四章改成三章：删除原第 2 章的全部页，将仍被使用的来源定义保留在参考页，重新生成。剩余章节会按出现顺序重新编号；无需把所有 `ch3` 改成 `ch2`。添加第五章时，在参考来源页之前插入新章首页和后续页，并将参考页的 `@chapter` 改为最后一章，避免旧章再次出现在新章之后。

配色按位置交替：第 1、3、5 等章青色主导，第 2、4、6 等章橙色主导。章节改名不影响颜色，换顺序会改变颜色。当前没有 `@color`、`@palette` 内容字段用于覆盖配色。

## 4. 增删页面与内容语法

每页从 `## 唯一ID | 页型` 开始，到下一页开始之前结束：

```markdown
## Results_Detail | headline-points
@chapter: results
@eyebrow: DETAILS
# 这一页的标题
> 核心论述。
- 第一条内容。
- 第二条内容。
```

ID 仅用英文字母、数字、下划线或连字符，整个演示不能重复。不必连续，也不等于显示页码；显示页码与页数按排列自动计算。

整体顺序必须保持：第 1 页 `cover`、第 2 页 `contents`、各章正文、参考来源页、最后一页 `closing`。导航把目录固定为索引 1，因此不要在封面与目录之间插页，也不要移动或删除它们。空间页每种保留一个即可。

复制页时改 ID、章节与内容；删除页时删除整段；调整顺序时移动整段，包括附带的 JSON 块。参考页可以属于最后一章；Thanks 不写 `@chapter`，避免建立只有结尾的新章。

本文件是有限的内容语法，不是完整 Markdown 渲染器：

| 写法 | 含义 |
| --- | --- |
| `# 标题` | 页标题；普通正文页多个标题行显示为多行 |
| `@key: value` | 单行元数据，字段名大小写与示例一致 |
| `> 内容` | 核心引文或图注，多行直接拼接，不自动加空格 |
| `- 内容` | 列表要点 |
| `**内容**` | 受支持文本区域内加粗 |
| `[@source-id]` | 受支持文本区域内引用来源 |
| `~~~flow` 等 | 页型所需 JSON 块，用单独一行 `~~~` 结束 |

普通段落、反引号、Markdown 链接、图片语法与嵌套列表不会按完整 Markdown 规则渲染；HTML 会被转义。现有页型通常忽略普通段落，应将正文放入该页支持的引文、列表或数据块。

`statement` 将多个 `#` 行拼成一句，不保留手动换行；其副标题用 `@subtitle`。表格、比较条和时间线主要由 JSON 生成，不能仅写列表代替数据块。

## 5. 页型速查

| 页型 | 使用字段或数据块 | 适合用途 |
| --- | --- | --- |
| `headline-points` | 标题、引文、列表 | 要点总览 |
| `statement` | 标题、`@subtitle` | 单句结论 |
| `split-media` | `@asset`、`@caption`、引文、列表 | 图片与说明 |
| `chart-focus` | `@asset`、`@caption`、`@metric`、`@metricLabel`、列表 | 图表与关键指标 |
| `process-flow` | `~~~flow`、可选引文 | 流程与分支 |
| `table-focus` | `~~~table` | 表格 |
| `comparison` | `~~~bars` | 数值比较条 |
| `timeline` | `~~~timeline` | 阶段或时间线 |
| `video-focus` | `@asset`、`@poster`、`@caption`、引文、列表 | 本地视频 |
| `references` | 全局已引用来源 | 参考来源列表 |

`cover`、`contents`、`closing` 是空间页。生成器虽接受 `section-divider`，第二模板目前没有独立章节分隔场景，会落到目录场景，不要作为新正文页使用。

## 6. 图片、图表与视频

素材路径相对于模板的 `index.html`，不是相对于 Markdown 所在目录。建议使用无空格的英文文件名，不写磁盘绝对路径或远程 URL。

```markdown
## Result_Chart | chart-focus
@chapter: results
@eyebrow: RESULTS / MEASUREMENT
# 关键读数如何变化？
@asset: assets/charts/my-chart.png
@caption: 图表说明、单位与来源。
@metric: +24%
@metricLabel: CHANGE
- 坐标、图例与单位应在图片内清楚可见。
- 解释最重要的差异。[@study-01]
```

图表页显示预先制作的本地图片，修改 Markdown 中的指标不会重绘 `trend.svg` 等素材。请导出自己的 SVG、PNG、JPEG 或 WebP，再更新 `@asset`。`split-media` 同样用本地图片，但不显示 metric。

视频页示例：

```markdown
## Demo_Video | video-focus
@chapter: results
# 观察实际过程。
@asset: assets/media/demo.mp4
@poster: assets/media/demo-poster.png
@caption: 视频描述与来源。
> 解释观众应关注的部分。
- 这一段展示了什么。
```

使用浏览器支持的 MP4/H.264 或 WebM；观看时手动播放，不自动发声。素材应实际存在并随文件夹携带。离开视频页会暂停并重置。

## 7. 结构化页面数据

把以下数据块放在对应页的标题和 `@chapter` 后面。JSON 不支持注释、单引号或尾随逗号。缺少对应数据块时有些页只显示标题，生成成功不等于页面完整。

### 流程 `process-flow`

```text
~~~flow
{
  "layout": "linear",
  "nodes": [
    {"id": "input", "title": "输入", "detail": "INPUT"},
    {"id": "review", "title": "检查", "detail": "REVIEW"},
    {"id": "result", "title": "输出", "detail": "OUTPUT"}
  ],
  "edges": [
    {"from": "input", "to": "review"},
    {"from": "review", "to": "result", "label": "通过"}
  ]
}
~~~
```

生成器要求 3 至 7 个节点，节点 ID 唯一，连线指向已存在的 ID。只做无环流程或简单分支，不做反馈回路；布局根据连线深度推导，`layout` 不是通用布局引擎。节点标题保持短小；复杂流程应拆页或改为本地流程图图片。

### 表格 `table-focus`

```text
~~~table
{
  "columns": ["稳定性", "时延"],
  "units": ["%", "ms"],
  "rows": [
    ["条件 A", "62", "42"],
    ["条件 B", "86", "29"]
  ],
  "note": "读数说明。",
  "source": "study-01"
}
~~~
```

每行第一格是行标题，后面才是数据；因此每行长度应为 `columns` 数量加 1，`units` 与 `columns` 一一对应。最后一行自动高亮，目前没有任意行高亮字段。多行多列表格不自动分页，应主动拆页。

### 比较条 `comparison`

```text
~~~bars
{
  "unit": "%",
  "series": [
    {"label": "方法 A", "value": 62, "note": "基线"},
    {"label": "方法 B", "value": 86, "note": "改善"}
  ],
  "note": "比较说明。"
}
~~~
```

`value` 使用非负 JSON 数字，不用带百分号的字符串；单位单独填写。长度按最大值归一化，最大值自动强调，不是统计图引擎。

### 时间线 `timeline`

```text
~~~timeline
{
  "kind": "phase",
  "nodes": [
    {"when": "阶段 01", "label": "定义问题", "detail": "范围"},
    {"when": "阶段 02", "label": "整理材料", "detail": "来源"},
    {"when": "阶段 03", "label": "形成证据", "detail": "比较"},
    {"when": "阶段 04", "label": "讨论", "detail": "限制"}
  ],
  "note": "不按实际时间比例排布。"
}
~~~
```

`kind: phase` 显示概念阶段说明；真实日期可用 `kind: date` 并在 `when` 填日期。两者都按节点等距排布，不会根据日期间隔按比例定位。当前 CSS 为四列，超过四个节点会换行但连线不自动跟随，建议每页四个节点；更复杂时拆页或调整布局。

## 8. 来源引用

在保留的任意页附上定义，参考页是集中放置它们的好位置：

```text
~~~references
[
  {"id": "study-01", "short": "作者，年份", "text": "完整出处与网址", "note": "补充说明"},
  {"id": "study-02", "short": "待确认", "text": "", "note": "", "pending": true}
]
~~~
```

在标题、引文或要点中写 `[@study-01]`，浏览器会在受支持区域生成短引。编号按源文件中第一次引用的顺序建立，而不是定义顺序。参考页仅显示真正被引用的来源，只有定义但未引用的条目不会显示。

当前生成器不扫描 JSON 数据块中的 `source` 来建立引用序号。因此表格的 `source: study-01` 之外，还应在该页的引文或其他页的要点中写 `[@study-01]`，否则表格来源可能无法编号。不要重复定义同一 ID 且使用不同的 `text`。

## 9. 一份可运行的两章最小示例

以下代码块可作为整个 `content/sample.md` 的内容。生成后会得到 2 章、6 页，默认配色依次为青、橙。扩展到更多章节时，在 Thanks 之前追加新的章首和正文页即可。

```markdown
~~~deck
{
  "title": "项目汇报",
  "theme": "cyan-orange-spatial",
  "kicker": "PROJECT / REPORT",
  "author": "你的团队",
  "subtitle": "本次汇报的主题。"
}
~~~

## Cover | cover
# 项目汇报

## Contents | contents
# 阅读路径

## Background | headline-points
@chapter: background
@chapterTitle: 背景
@chapterEnglish: BACKGROUND
# 为什么开展这个项目？
> 项目的核心问题。
- 已知事实。
- 需要解决的问题。

## Findings | headline-points
@chapter: findings
@chapterTitle: 发现
@chapterEnglish: FINDINGS
# 我们发现了什么？
> 核心结论。
- 主要结果。
- 适用边界。

## Next | statement
@chapter: findings
# 下一步，验证这个判断。
@subtitle: 下一阶段的具体安排。

## Thanks | closing
# Thanks
```

## 10. 结尾、版式和常见限制

- Thanks 粒子文字目前固定为 `js/thanks-particles.js` 中 `fillText` 的 `Thanks`。只改 closing 页标题会改变浏览器标题和无 WebGL 文字，不会改变粒子文字。若确实要改，应同时修改脚本和内容标题，并重新检查文字采样宽度、字体与画面裁切。
- Thanks 隐藏自身页脚；底部操作控件仍可临时出现，键盘导航仍有效。
- 现有字体是 WOFF2 子集，新内容不在子集中的汉字可能使用系统回退字体。需要跨机器完全一致时，应使用有授权的完整本地字体并更新 `styles/tokens.css`；复制模板不会自动扩展字体子集。
- 页面是固定格式演示画布，不自动缩短文案、拆分长标题、分页列表或表格。建议每页一个判断、少量要点；长内容优先拆页，不直接全局缩小字号。
- 手机纵向仍沿用横向演示内容缩放，正文会较小，不是手机阅读文章布局。正式演示建议横屏或大屏使用。
- `@asset` 和 `@metric` 等字段不会验证科学含义或素材真实性；单位、来源、版权与数据准确性由内容制作者确认。

## 11. 修改后的检查清单

1. 运行生成命令，确认无 `content error`，输出章节与页数符合预期。
2. 打开 `index.html`，确认封面标题、副标题与作者是新内容。
3. 进入目录，逐章左右选择、点击、Enter 进入；核对章名、顺序和首页。
4. 除最后一章外，各章逐页翻到末尾，确认自动回到目录并选中下一章；最后一章继续进入参考页与 Thanks。
5. 核对图片、视频、表格列数、流程节点、引用编号，以及文字是否挡住页脚。
6. 从正文 Backspace 返回目录，再进入同章，确认恢复原来的阅读位置。
7. 按 End 查看 Thanks；在目录内 End 只选择末章，不会直接去结尾。
8. 检查实际演示屏幕、宽屏与手机横屏；章节数量改变后重点检查目录遮挡。
9. 把修改后的源文件、生成文件与素材一起提交或交付。

原模板浏览器回归命令：

```powershell
python test/tools/check_template.py
```

依赖 Python 的 `playwright`、`Pillow` 和 Chromium。它针对仓库的示例演示，包含四章、20 页、固定页面 ID 和文案断言；更换为实际内容后不能原样当成通用验证器，需要同步更新断言。无需为了通过旧测试把你的真实演示强制改回四章。

常见问题：

| 症状 | 检查项 |
| --- | --- |
| 修改后画面没变 | 是否生成数据、是否打开正确模板副本、是否刷新 |
| 目录出现多余章节或 ID | 是否残留旧 `@chapter`、是否缺少新首页的章名 |
| 章节进入错误页 | 是否章节交错排列、首页是否为普通正文页 |
| 图片为空或视频不播放 | 路径、文件存在、视频编码与本地资源是否一起交付 |
| 来源页少条目 | 是否真正写了 `[@id]`，不只是定义 references |
| 流程只有标题 | 是否有 flow 块、节点是否正确、是否错误使用 section-divider |
| 文字太长或图表压住页脚 | 拆页、简化文案，必要时调整对应页型的 CSS |
| 章节增多但屏风文字太小 | 目录缩放策略的限制，调整布局或合并章节 |
