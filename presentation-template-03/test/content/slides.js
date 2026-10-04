// 唯一内容主稿：浏览器直接解析 Markdown；review.html 显示同一份原文。
// AI 维护此文件，用户只审阅文字。代码块用 ~~~，正文避免反引号和 ${ 插值。
window.SLIDES_MD = String.raw`
~~~deck
{
  "title": "从信号到图景",
  "display": "SIGNAL",
  "subtitle": "A field guide to seeing patterns",
  "author": "艺术杂志风 · 模板示例",
  "issue": "Study No. 01",
  "date": "VISUAL PROTOTYPE",
  "kicker": "视觉实验 / EDITORIAL STUDIES"
}
~~~

## S01 | cover
# 从信号到图景
深色开场 / 超大字 / 空间推进。所有内容与数据仅用于模板验证，不代表真实研究。

## S02 | toc
# 阅读路径

## S03 | points
@chapter: thinking
@chapterTitle: 先提出问题
@chapterEnglish: Ways of seeing
@eyebrow: 01 / WAYS OF SEEING
# 先问一个好问题，
# 再让图回答。
> 一页只讲一件事。
- **问题**：先说清这张图需要回答什么。
- **证据**：图形占据主画面，文字只补充阅读线索。
- **边界**：把示例、真实结果和待验证判断分开。

~~~aside
{"label":"EDITORIAL NOTE", "headline":"留白不是空白。", "body":"大标题给出方向，少量要点组织叙述。细线、页码与短引负责建立秩序，而不是增加装饰。"}
~~~

## S04 | chart
@chapter: evidence
@chapterTitle: 把证据放大
@chapterEnglish: Reading the evidence
@eyebrow: 02 / READING THE EVIDENCE
# 两条曲线，一眼读懂差异。
@asset: charts/output/trend.svg
@caption: 合成示例数据；时间以秒计，幅度为任意单位（a.u.），不代表实验结果。
> 图来自 Python，而不是在网页里重新描一遍。
- **曲线 A**：较早出现峰值，随后逐渐回落。
- **曲线 B**：峰值较晚，变化更平缓。
- 图形由 Matplotlib 生成；保留 Python 源码及 CSV 数据。[@hunter]

## S05 | interactive
@chapter: evidence
@eyebrow: 02 / EXPLORE THE DETAIL
# 需要时，再走近一点。
@asset: charts/output/interactive.html
@fallback: charts/output/trend.svg
@caption: 同一份合成数据的交互版本；无需联网。悬停读数，拖动框选，双击恢复。
> 交互是补充，不是理解图表的前提。
- 图例和坐标始终可见；关键趋势无需鼠标悬停也能读懂。
- Plotly HTML 由 Python 生成，本地脚本随文件夹携带。[@plotly]
- 离开本页后卸载交互图，不在后台持续运行。

## S06 | flow
@chapter: workflow
@chapterTitle: 从草稿到成品
@chapterEnglish: Making & finishing
@eyebrow: 03 / MAKING & FINISHING
# 先自由创作，最后再打包。
> 不让字体子集化打断每一次修改。
- **创作阶段**：定叙事、改内容、选布局；沿用可用字体，不做子集化。
- **审阅阶段**：你看 Markdown 和页面，用自然语言提出修改。
- **产出阶段**：内容冻结后，再确认字体许可、生成子集、做离线检查。

~~~flow
{
  "nodes": [
    {"id":"brief", "title":"材料与问题", "detail":"主题 · 听众 · 目标"},
    {"id":"draft", "title":"AI 起草", "detail":"页型 · 文稿 · Python 图"},
    {"id":"review", "title":"审阅与修改", "detail":"同一份 Markdown 主稿"},
    {"id":"release", "title":"冻结与产出", "detail":"字体子集 · 离线验证"}
  ],
  "edges": [
    {"from":"brief", "to":"draft"},
    {"from":"draft", "to":"review"},
    {"from":"review", "to":"release", "label":"确认"},
    {"from":"review", "to":"draft", "label":"修改反馈", "return":true}
  ]
}
~~~

## S07 | references
@chapter: workflow
@eyebrow: SOURCES / REPRODUCIBILITY
# 图形背后，也有出处。
> 本稿只引用绘图库资料；没有把模板示例写成研究结论。

~~~references
[
  {"id":"hunter", "short":"Hunter, 2007 · Matplotlib", "text":"Hunter, J. D. (2007). Matplotlib: A 2D Graphics Environment. Computing in Science & Engineering, 9(3), 90–95. DOI: 10.1109/MCSE.2007.55.", "note":"用于绘图工具归属，不用于支持合成数据的研究结论。"},
  {"id":"plotly", "short":"Plotly · Interactive HTML export", "text":"Plotly Python documentation. Interactive HTML export; plotly.io.write_html. 本例使用本地安装的 Plotly.py 7.1.0 生成。", "note":"交互 HTML 导出与本地脚本打包方式的来源。"}
]
~~~
`;
