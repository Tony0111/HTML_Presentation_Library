# Our World in Data 比较表与时间范围

## 类型

数据探索器模式 / comparison table / sparkline / range timeline

## 来源观察

- 参考页面：[The rise of electoral democracy | Our World in Data](../../sources/owid-electoral-democracy/The%20rise%20of%20electoral%20democracy%20_%20Our%20World%20in%20Data.html)
- 本地数据：[countries-with-an-elected-parliament-and-government.csv](../../datasets/electoral-democracy/countries-with-an-elected-parliament-and-government.csv)
- 原页面把一组时间序列包装成一个数据探索器，而不是只画一条线。

## 交互拆解

1. **视图切换**：Table、Line、Area 等视图共享同一组数据，只改变阅读方式。
2. **双端时间范围**：起点和终点可以独立调整，表格自动重新计算变化。
3. **搜索地区**：数据量变大后，先筛选实体，再比较数值。
4. **比较表**：每个指标都有起始值、终止值、迷你趋势线、绝对变化和相对变化。
5. **连续动作入口**：下载、全屏和 Explore the data 与图表放在同一工具栏，用户不需要离开当前上下文。
6. **来源和注释**：指标定义、来源、许可证和限制紧跟图表，避免数据视觉脱离证据。

## 为什么和 FLOPS 图表不同

- FLOPS 适合单指标的增长叙事，重点是曲线形状和数量级。
- Electoral democracy 适合多实体、多指标的比较，重点是筛选、起止时间和变化量。
- 两者可以共用数据数组、SVG、tooltip、来源栏和响应式容器，但不应该共用同一种布局。

## 本地复刻方式

展示页中的复刻使用当前 CSV 的七个区域汇总和五个时间检查点：

- Table 视图展示起止值、sparkline、绝对变化和相对变化。
- Bars 视图把终点年份的两个指标转成水平条形对比。
- 两个范围滑块使用离散检查点，保证直接打开 HTML 时不需要 fetch 本地 CSV。
- Download CSV 导出当前演示数据，Fullscreen 只放大组件容器。

完整数据仍保留在原始数据包中；如果正式使用，应在构建阶段读取 CSV 自动生成页面数据，避免手动同步。

## 适合使用

- 年度报告、研究文章和政策数据
- 多地区、多产品、多版本对比
- 产品指标的起止时间总结
- 需要同时服务“快速浏览”和“深入探索”的数据页面

## 使用边界

- 不要把 sparkline 当成完整图表，它只负责给趋势提供上下文。
- 相对变化的分母为零时要显示 `new` 或 `not available`，不要显示误导性的无穷百分比。
- 时间范围改变后，标题、单位、变化值和来源说明必须保持同步。
- 复用第三方数据时检查数据许可证，并保留原始来源和处理说明。
