# 给 AI 的模板内容修改说明

适用目录：本说明所在的 `presentation-template/`。先进入这个目录再执行下文命令。

本文是内容修改的执行契约。只改标题、章节数量、章节名称、正文或素材时，不需要修改渲染器。

## 1. 必须遵守的边界

- 唯一人工内容源是 `content/sample.md`。
- `data/presentation.config.js` 是生成文件，不要直接修改。改完主稿必须重新生成。
- 保留已有页型、配色、动画、导航与离线运行方式。不要改 `js/`、`styles/` 或 `vendor/` 来适配章节数。
- 正式演示是 `index.html`；`review.html` 只用于检查文字、页序与归属。
- 封面、目录各保留一页，放在最前面；`thanks` 结束页保留一页，放在最后面。
- 章节页必须连续排列；同一章节不能在另一章之后重新出现。
- 页面 ID 必须唯一。ID 是稳定标识，不是页码；删除页后无需重排全部 ID。
- 不删除仍被引用的来源，不将真实数据改成示例数据，不编造研究结果。
- 资源只能使用模板目录内的相对路径，如 `assets/charts/figure.svg`。不使用网络或个人绝对路径。

## 2. 文件怎样对应屏幕

`sample.md` 顶部 `~~~deck` JSON 块是全局信息：

| 字段 | 用途 |
| --- | --- |
| `title` | 演示名称、浏览器标题与页脚 |
| `display` | 封面与目录顶部英文品牌文字 |
| `author` | 封面署名 |
| `kicker` | 封面小字 |
| `theme` | 固定保留 `editorial-spatial` |

封面屏幕上的大标题来自 `S01` 的 `# ` 行，不是只从全局 `title` 读取。例如：

```markdown
## S01 | cover
# 让判断
# 可见
```

每个 `# ` 行是一行标题；最后一行自动成为砖红动画关键词。改封面时同时检查全局名称是否需要同步；不要把正文中的所有句号一起删除。

页面从 `## 页面ID | 页型` 开始，到下一个这样的标题之前结束：

```markdown
## S30 | headline-points
@chapter: ch5
@chapterTitle: 应用
@chapterEnglish: APPLICATION
@eyebrow: PUT IT TO WORK
# 一个清楚的标题
> 一句补充说明。
- **重点**：正文要点。
```

`@key: value` 是元数据，`# ` 是标题，`> ` 是引文，`- ` 是要点；`~~~flow`、`~~~table` 等围栏内是 JSON，不是普通 Markdown。

## 3. 如何改变章节数量

推荐使用 3-6 章；模板支持 1-8 章，超过 8 章需要重新设计目录，不能只追加主稿。

没有单独的 `chapterCount` 设置。编译器按 `@chapter` 第一次出现的顺序生成章节数组。每一章的第一页必须包含：

```markdown
@chapter: ch1
@chapterTitle: 问题
@chapterEnglish: THE QUESTION
```

同章后续页面只需 `@chapter: ch1`。中文、英文章名以第一页为准；在后续页修改不会改变目录。不要使用 `@chapterNumber`，编号会自动生成。

### 改为三章

1. 先明确用户想合并哪两章，还是删掉哪一章；不擅自删内容。
2. 若合并第 3、4 章，把原第 4 章所有页的 `@chapter: ch4` 改为 `@chapter: ch3`。
3. 在合并后第 3 章的第一页更新 `@chapterTitle` 和 `@chapterEnglish`；其余页删除重复章名元数据，避免误导。
4. 若删除某章，删除完整页面块，或者按用户要求把这些页移入其他章。不能只删章名，留下孤立正文。
5. 检查保留下来的章节连续排列，推荐按位置使用 `ch1`、`ch2`、`ch3`。
6. 重新生成。目录会变为三项，封面与目录也只画三张折页。

### 改为五章或六章

1. 在 `references` 来源页和最后的 `thanks` 页之前插入新增章节正文。
2. 新页使用未占用的 ID，例如现有 `S24` 已用于 Thanks，就用 `S30`、`S31` 等，不重复使用 `S24`。
3. 第 5 章第一页使用上面的 `S30` 示例，后续页使用 `@chapter: ch5`。
4. 第 6 章示例：

```markdown
## S40 | headline-points
@chapter: ch6
@chapterTitle: 展望
@chapterEnglish: OUTLOOK
@eyebrow: NEXT HORIZON
# 下一步要回答什么？
- **任务**：写入用户提供的实际内容。
```

5. 若新增章成为最后一章，把 `references` 页的 `@chapter` 改为 `ch5` 或 `ch6`，并放在最后一章正文之后。最后仍是无 `@chapter` 的 `thanks` 页。
6. 如果通过拆分已有章增加数量，在新章第一页补章名元数据，并更新该章全部后续页的 `@chapter`。
7. 重新生成。目录项、折页数、自动编号、页码、选章导航会同步变化。折页仍按位置砖红、暖白交替，无需手改颜色或坐标。

### 名称与容量

中文章名推荐 2-4 字，英文推荐 1-3 个短词。5-6 章的每列更窄，长名称可能换行；不要用缩小全站字号、隐藏标题或截断文字解决。优先在用户同意下缩短章名，保留正文标题的含义。手机竖屏沿用整张幻灯片等比缩放，不是手机阅读排版。

## 4. 允许的页型

内容修改优先复用已有相近页面块，连同其元数据和 JSON 结构一起复制，然后改 ID、章节与内容。

| 页型 | 用途 / 必要内容 |
| --- | --- |
| `cover` | 首屏；标题最后一行是动画关键词 |
| `contents` | 第二页；目录项自动生成，不在这里手写章节列表 |
| `headline-points` | 标题、引文、要点 |
| `statement` | 一句主张；不改成大段正文 |
| `split-media` | `@asset`、`@caption`、说明要点 |
| `chart-focus` | 已做好图表的 `@asset`、图注，可选 `@metric` |
| `process-flow` | `~~~flow` JSON；3-7 个节点，边的 ID 必须存在 |
| `table-focus` | `~~~table` JSON |
| `comparison` | `~~~bars` JSON |
| `timeline` | `~~~timeline` JSON |
| `video-focus` | `@asset` 视频、`@poster` 海报、图注 |
| `references` | `~~~references` JSON；来源 ID 与正文 `[@source-id]` 一致 |
| `thanks` | 最后一页，`# Thanks`，不设置 `@chapter` |

不要新增历史 `section-divider` 或 `closing` 页型。这些是旧实现，不属于当前编辑工作流。JSON 必须使用双引号且没有尾逗号。

## 5. 执行与验收

在模板目录运行：

```bash
python tools/build_content.py
python test/tools/check_deck.py
```

第一条生成运行快照；第二条检查当前主稿与快照一致、结构、资源、目录和导航，不限定必须四章或二十页。不要以编译通过代替视觉检查。

新增中文字符时还要重新生成字体子集：

```bash
python tools/subset_fonts.py
```

需要 `fontTools`、Brotli 和源字体。当前源路径在 `tools/subset_fonts.py`：Windows 的 Noto Serif SC、Noto Sans SC，以及 matplotlib 的 DejaVu Sans Mono。看到 `missing source` 就停止并报告，不能声称字体已更新，也不要随便换为不可分发的商业字体。

`check_deck.py` 需要 Playwright 和可用的本地 Chrome / Chromium。缺环境时报告未执行的检查，不伪造通过结果。

再打开 `review.html` 确认文字和章节归属，打开 `index.html` 检查：

1. 封面标题、关键词、署名没有错字或溢出。
2. 目录项与折页数量等于目标章数，编号连续，中文英文名称正确。
3. 每章都能选中并进入正确第一页；前三章等非末章的末页前进会回目录预选下一章。
4. 最后一章来源页前进到 Thanks；末页停留；上一页、临时目录往返正常。
5. 标题、正文、图注、来源不互相遮挡，图表没有拉伸或裁切。
6. 16:9、16:10、手机横竖屏都能显示；减少动态模式可导航。
7. 图表单位、来源 ID 和视频路径真实有效。

`check_formal.py`、`check_keyboard.py` 等测试包含原示例的页数、ID 或四章断言，不适合直接验收任意新文稿。不要为让示例测试通过，把新文稿强行改回四章。渲染器回归另用 `check_chapter_counts.py` 验证 3/4/5/6 章，不修改真实主稿。

## 6. 可直接交给下一个 AI 的任务指令

```text
先完整阅读 presentation-template/EDITING-GUIDE.md 和 content/sample.md。
目标：把演示改为 [3/5/6] 章；章名、顺序与正文以用户资料为准。
只修改 content/sample.md 和所需本地素材，不改动画、主题或导航代码。
不要手工编辑 data/presentation.config.js；用 tools/build_content.py 生成。
同章页连续；每章第一页有 chapter、chapterTitle、chapterEnglish。
保留封面、目录和最后无 chapter 的 Thanks 页；来源页归最后一章。
运行 check_deck.py；新增中文字符后重建字体并检查 missing source。
检查 review.html 和 index.html；报告章数、页数、改动文件与检查结果。
不要自行提交或合并，除非用户明确要求。
```
