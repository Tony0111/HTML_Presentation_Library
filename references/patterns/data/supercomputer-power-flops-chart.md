# Supercomputer Power 数据叙事图表

## 类型

数据展示模式 / responsive SVG chart / time-series storytelling

## 数据来源

- 本地数据包：[supercomputer-power-flops](../../datasets/supercomputer-power-flops/)
- 数据文件：[supercomputer-power-flops.csv](../../datasets/supercomputer-power-flops/supercomputer-power-flops.csv)
- 元数据：[supercomputer-power-flops.metadata.json](../../datasets/supercomputer-power-flops/supercomputer-power-flops.metadata.json)
- 原始图表：[Our World in Data](https://ourworldindata.org/grapher/supercomputer-power-flops?v=1&csvType=full&useColumnShortNames=false)
- 数据时间范围：1993-2025
- 单位：Gflop/s，即每秒十亿次浮点运算

## 为什么值得学习

这不是把一张图放进网页，而是把数据变成一个可以阅读的视觉叙事：

- 只有一个指标时，用一条线保持信息集中。
- 数据跨越多个数量级时，使用对数尺度，避免早期年份被压成一条直线。
- 用年份、数值和单位构成稳定的阅读锚点。
- 通过悬停或键盘聚焦显示单个数据点，不把所有数字同时塞给用户。
- 用元数据说明来源、时间范围和指标限制，让漂亮的图表仍然可信。

## 推荐结构

```text
data story
├── title + one-sentence reading
├── stat strip: latest / time span / growth multiple
├── scale switch: log / linear
├── responsive SVG chart
├── hover or focus tooltip
└── source + methodology note
```

## 实现方式

当前展示页使用原生 JavaScript 和 SVG，不依赖图表库：

1. 把 CSV 中的时间序列嵌入页面数据数组，保证直接打开 HTML 时也能工作。
2. 用 `viewBox` 保持 SVG 的宽高比例，让图表适配桌面和手机。
3. 根据当前尺度计算 x/y 坐标，再生成网格线、路径、圆点和标签。
4. 对数模式使用 `log10(value)` 映射 y 坐标；线性模式使用原始数值。
5. 数据点带 `tabindex` 和 `aria-label`，鼠标与键盘都能读取信息。

## 适合使用

- 科技产品的性能增长、版本演进和规模变化
- 研究项目、年度报告和品牌数据故事
- 产品发布页中“过去到现在”的能力对比
- 需要把一组数字变成首屏视觉重点的演示文件

## 使用边界

- 图表的数据必须保留来源、下载日期、单位和处理方式。
- 指标跨越数量级时优先考虑对数尺度，并在界面上明确标注。
- 不要用动画制造虚假的增长感；动画只用于进入或强调当前数据点。
- 外部数据更新后，重新同步 CSV 和元数据，不要只改图表标题。
