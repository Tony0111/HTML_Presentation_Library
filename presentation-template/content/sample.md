~~~deck
{
  "title": "让判断可见",
  "display": "MAKE IT VISIBLE",
  "theme": "editorial-spatial",
  "kicker": "EDITORIAL-SPATIAL / STUDY 01",
  "author": "演示模板 · 示例内容",
  "meta": "TEMPLATE 01 · 2026",
  "subtitle": "一个极简、具有空间纵深的演示模板"
}
~~~

## S01 | cover
@kicker: EDITORIAL-SPATIAL / STUDY 01
# 让判断
# 可见。
@subtitle: 一个极简、具有空间纵深的演示模板
@meta: TEMPLATE 01 · 2026

## S02 | contents
# 阅读路径

## S04 | headline-points
@chapter: ch1
@chapterTitle: 问题
@chapterEnglish: THE QUESTION
@eyebrow: A CLEAR STARTING POINT
# 研究从一个
# 可被复述的问题开始。
> 把复杂背景压缩成观众能够带走的一句话，再让证据逐层回应它。
- **观察**：发生了什么？
- **张力**：为什么值得解释？
- **边界**：这次不讨论什么？

## S05 | statement
@chapter: ch1
@eyebrow: THE CENTRAL PROMPT
# 复杂，不应该成为无法开始的理由。
@subtitle: 把问题变小，不是削弱它；是为判断建立一个可以工作的尺度。

## S06 | split-media
@chapter: ch1
@chapterEnglish: THE QUESTION
@eyebrow: 01 / FRAMING THE QUESTION
# 让范围
# 有清楚的边界。
@asset: assets/charts/method.svg
@caption: 合成示意图，仅用于模板验证，不代表真实研究。
> 先把观察范围画出来，再让后面的证据在同一尺度上对话。
- 材料来源与示意边界写在图注与来源区。
- 图形保持原始比例、图例与标注，不做遮挡。

## S08 | headline-points
@chapter: ch2
@chapterTitle: 方法
@chapterEnglish: THE METHOD
@eyebrow: A REPEATABLE PATH
# 每一步都回答
# 一个小问题。
> 可解释的路径，比漂亮的跳跃更值得信任。
- **定义**：先说清观察范围。
- **整理**：把材料变成可比较的形式。
- **判断**：在证据边界内给出暂时结论。

## S09 | process-flow
@chapter: ch2
@eyebrow: FROM QUESTION TO READING
# 一条线性的路径
> 节点与连线由结构生成，不是手绘位图。
~~~flow
{
  "layout": "linear",
  "nodes": [
    {"id":"frame", "title":"定义范围", "detail":"FRAME"},
    {"id":"collect", "title":"整理材料", "detail":"COLLECT"},
    {"id":"compare", "title":"比较差异", "detail":"COMPARE"},
    {"id":"read", "title":"形成判断", "detail":"READ"}
  ],
  "edges": [
    {"from":"frame", "to":"collect"},
    {"from":"collect", "to":"compare"},
    {"from":"compare", "to":"read"}
  ]
}
~~~

## S10 | process-flow
@chapter: ch2
@eyebrow: WHEN THE PATH BRANCHES
# 一条简单的分支
> 分支条件和汇合关系必须写清楚，不能让动画隐藏结构。
~~~flow
{
  "layout": "branch",
  "nodes": [
    {"id":"input", "title":"候选材料", "detail":"INPUT"},
    {"id":"check", "title":"质量检查", "detail":"CHECK"},
    {"id":"keep", "title":"进入比较", "detail":"KEEP"},
    {"id":"drop", "title":"标记待补", "detail":"DROP"},
    {"id":"merge", "title":"汇总判断", "detail":"MERGE"}
  ],
  "edges": [
    {"from":"input", "to":"check"},
    {"from":"check", "to":"keep", "label":"通过"},
    {"from":"check", "to":"drop", "label":"缺失"},
    {"from":"keep", "to":"merge"},
    {"from":"drop", "to":"merge"}
  ]
}
~~~

## S11 | chart-focus
@chapter: ch2
@eyebrow: ILLUSTRATIVE DATA / LINE
# 一条曲线说明什么？
@asset: assets/charts/trend.svg
@caption: 合成示例数据；横轴为阶段，纵轴为任意单位（a.u.），不代表实验结果。
@metric: 0.88
@metricLabel: READOUT / ILLUSTRATIVE
- **第三阶段之后**出现明显变化。
- 单位与坐标在静止状态可见，不依赖悬停才能理解。[@source-01]
~~~references
[
  {"id":"source-01", "short":"示例来源 · 占位", "text":"合成示例来源，用于演示引用编号与来源页的一致性，不是真实文献。", "note":"模板占位，请替换为真实来源。"},
  {"id":"source-02", "short":"待补来源", "text":"", "note":"", "pending": true}
]
~~~
## S13 | chart-focus
@chapter: ch3
@chapterTitle: 证据
@chapterEnglish: THE EVIDENCE
@eyebrow: ILLUSTRATIVE DATA / BAR
# 几个类别差在哪里？
@asset: assets/charts/bar.svg
@caption: 合成示例数据；柱状图数值轴从零开始，单位为任意单位（a.u.）。
@metric: +24%
@metricLabel: DELTA / ILLUSTRATIVE
- 柱状图用于类别比较，数值轴从零开始。
- 重点类别用砖红标记，其余用中性色。

## S14 | chart-focus
@chapter: ch3
@eyebrow: ILLUSTRATIVE DATA / SCATTER
# 两个变量有关系吗？
@asset: assets/charts/scatter.svg
@caption: 合成示例数据；散点用于展示变量关系，不代表因果关系。
@metric: 0.71
@metricLabel: CORRELATION / ILLUSTRATIVE
- 散点只说明共同变化，不主张因果。
- 趋势线为示意，不代替统计检验。[@source-02]

## S15 | table-focus
@chapter: ch3
@eyebrow: PRECISE READING
# 需要精确阅读时，用表格。
> 表格只保留支持当前判断的维度。
~~~table
{
  "columns": ["条件", "稳定性", "时延", "读数"],
  "units": ["", "%", "ms", "a.u."],
  "rows": [
    ["条件 A", "62", "42", "0.62"],
    ["条件 B", "74", "35", "0.74"],
    ["条件 C", "86", "29", "0.86"]
  ],
  "note": "合成示例数据，不代表实验结果；重点行用字重与砖红标出。",
  "source": "source-01"
}
~~~

## S16 | comparison
@chapter: ch3
@eyebrow: SIDE BY SIDE
# 并列比较，一眼看懂差异。
> 高亮不只用颜色，同时用位置、数值与标签。
~~~bars
{
  "unit": "a.u.",
  "series": [
    {"label": "方法 A", "value": 62, "note": "基线"},
    {"label": "方法 B", "value": 74, "note": "改善"},
    {"label": "方法 C", "value": 86, "note": "趋近"}
  ],
  "note": "合成示例数据，仅用于模板验证。"
}
~~~

## S17 | timeline
@chapter: ch3
@eyebrow: PHASES / NOT TO SCALE
# 变化在什么阶段发生？
> 这里是概念阶段，不代表真实时间比例。
~~~timeline
{
  "kind": "phase",
  "nodes": [
    {"when": "阶段 01", "label": "问题定义", "detail": "范围与边界"},
    {"when": "阶段 02", "label": "材料整理", "detail": "来源与清洗"},
    {"when": "阶段 03", "label": "证据形成", "detail": "比较与读数"},
    {"when": "阶段 04", "label": "讨论", "detail": "限制与下一步"}
  ],
  "note": "概念阶段，不按真实时间比例排布。"
}
~~~

## S18 | video-focus
@chapter: ch3
@eyebrow: LOCAL MEDIA / USER-TRIGGERED
# 需要时，再播放真实过程。
@asset: assets/media/sample.webm
@poster: assets/media/sample-poster.svg
@caption: 合成演示视频，仅用于验证本地播放、暂停与离场重置。
> 视频不自动播放、不自动发声；离开本页立即暂停并回到起点。
- `P` 播放 / 暂停，`M` 静音；翻页键始终用于翻页。

## S19 | statement
@chapter: ch3
@eyebrow: WHAT THE AUDIENCE SHOULD REMEMBER
# 一页只留下一个真正重要的判断。
@subtitle: 演示不是信息的仓库，而是一条经过取舍的观看路径。

## S21 | headline-points
@chapter: ch4
@chapterTitle: 讨论
@chapterEnglish: DISCUSSION
@eyebrow: HONEST LIMITS
# 限制不是弱点，
# 是判断的一部分。
> 把限制写在结论旁边，而不是藏在脚注里。
- **样本**：合成示例，不代表真实总体。
- **方法**：比较维度有限，未做统计检验。
- **下一步**：补充真实材料后重新验证。

## S22 | statement
@chapter: ch4
@eyebrow: NEXT STEP
# 下一步，把它交给一个真实的问题。
@subtitle: 模板负责结构、节奏与视觉语言；具体内容由你提供。

## S23 | references
@chapter: ch4
@eyebrow: SOURCES / REPRODUCIBILITY
# 让来源可追溯。
> 正文短引与参考页共享来源 ID；缺失来源明确标记为待补。
~~~references
[
  {"id":"source-01", "short":"示例来源 · 占位", "text":"合成示例来源，用于演示引用编号与来源页的一致性，不是真实文献。", "note":"模板占位，请替换为真实来源。"},
  {"id":"source-02", "short":"待补来源", "text":"", "note":"", "pending": true}
]
~~~

## S24 | thanks
# Thanks
