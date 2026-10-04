# Presentation Template

可复制、可离线运行的 HTML 演示模板，适用于组会、学习汇报与研究叙事。它不是 `.pptx` 文件，也不需要在线服务。

当前示例为 **20 页、4 章**；这些是示例内容，不是固定的模板容量。章节数由 Markdown 主稿生成，推荐 3-6 章，编译器允许 1-8 章，已验证 3/4/5/6 章。

## 打开与复用

直接打开 [index.html](index.html)，推荐桌面 Chrome / Edge；不需要 Python、Node.js、联网或启动服务器。折页与粒子效果需要浏览器支持 WebGL。

开始另一场演示时：

1. 复制整个 `presentation-template/` 到独立的演示目录，保留原模板作为母版。
2. 准备实际文稿、已做好图表、图片、视频和来源，将使用的素材放入新目录的 `assets/`。
3. 让 AI 先阅读 [EDITING-GUIDE.md](EDITING-GUIDE.md)，然后修改 `content/sample.md`，不要手改运行快照。
4. 在新演示目录运行以下命令，更新快照并检查内容：

```bash
python tools/build_content.py
python test/tools/check_deck.py
```

5. 新增中文字符时运行 `python tools/subset_fonts.py` 重建字体子集；环境和源字体要求见技术栈文档。
6. 打开 [review.html](review.html) 核对文本与章节归属，再打开演示入口检查实际排版、素材与交互。最终整目录复制并断网验收。

**修改 `.md` 不会自动更新浏览器里的演示，必须运行编译命令。** `sample.md` 的文件名固定，但内容可以完全替换为新文稿。

## 文档入口

| 文档 | 负责什么 | 谁先读 |
| --- | --- | --- |
| [CREATION-WORKFLOW.md](CREATION-WORKFLOW.md) | 资料准备、审阅、冻结、离线交付 | 制作演示的人 |
| [EDITING-GUIDE.md](EDITING-GUIDE.md) | 字段语法、增删章节、页型、AI 修改边界与验收 | 修改内容的 AI |
| [TECH-STACK.md](TECH-STACK.md) | 当前技术栈、模块职责、数据流、开发环境与维护边界 | 维护代码的人或 AI |
| [test/README.md](test/README.md) | 当前验收与回归脚本说明 | 开发与测试人员 |

本文说明当前能力，修改指南规定内容编辑契约，技术栈文档描述实际实现。旧规划与实验已删除，历史记录在 Git 中；不要依据历史方案恢复旧页型或主题。

## 视觉与页型

- 封面与目录：浅色艺术书扫描质感，砖红与暖白交替的立体折页；不对称印刷标记，少量青绿与褪色黄装饰。
- 封面最后一行：逐字显影、细线展开与缓慢墨色变化；目录转场延续折页结构。
- 正文：暖白阅读平面，按页型变化的砖红侧线、角标与色条，不将每页套成同一边框。
- 结束页：仅显示砖红粒子组成的 `Thanks`，入场聚合、指针扰动、点击散开再收拢。
- 减少动态：系统偏好或 `?reduced=1` 下关闭装饰动画，保持内容和导航可用。

现有正文页型：要点、陈述、图文、图表、流程、表格、比较、时间线、视频和参考资料。字段与内容示例见修改指南；图表为预制本地材料，表格、流程和时间线由结构数据渲染。

## 导航与显示

画布以 1920 × 1080 为设计基准，窗口改变时等比缩放并扩展逻辑画布。已检查 16:9、16:10、超宽屏和手机横竖屏；手机是整张幻灯片缩放，不是专用阅读排版。

| 按键 | 操作 |
| --- | --- |
| `Enter` / `Space` / `ArrowRight` / `ArrowDown` | 封面进入目录 |
| `ArrowLeft` / `ArrowRight`、`Home` / `End`、`1`-`8` | 目录选章，不循环 |
| `Enter` / `Space` | 目录进入所选章；临时目录未改选时回原页 |
| `Space` / `ArrowRight` / `ArrowDown` / `PageDown` | 正文下一页；非末章章末回目录并预选下一章 |
| `ArrowLeft` / `PageUp` | 正文与 Thanks 上一页 |
| `ArrowUp` / `Backspace` | 正文打开临时目录；目录取消并回原页或封面 |
| `Home` / `End` | 正文或 Thanks 跳首张正文 / Thanks |
| `P` / `M` | 视频播放暂停 / 静音 |
| `F` / `Escape` | 切换浏览器原生全屏 / 仅退出全屏 |

最后一章参考资料页前进到独立 Thanks，末页前进保持停留。目录的章节页码范围不包含 Thanks。快速导航可提前完成转场；长按不连续翻页。

## 文件结构

```text
presentation-template/
  README.md                    复用入口与当前能力
  CREATION-WORKFLOW.md          制作与交付流程
  EDITING-GUIDE.md              给内容修改 AI 的执行契约
  TECH-STACK.md                 当前技术实现说明
  index.html                   正式演示入口
  review.html                  同源内容审阅入口
  content/sample.md            唯一人工内容主稿
  data/presentation.config.js  生成的运行快照
  assets/                     本地图表、媒体和字体子集
  js/                         渲染、导航、媒体与输入模块
  styles/                     主题、画布与页型样式
  tools/                      内容编译与字体子集工具
  test/tools/                 当前验收与回归测试
  vendor/three.min.js          本地 Three.js
  LICENSES/                   第三方库与字体许可
  design/DECISIONS.md          补充决策记录，不作为内容编辑入口
```

## 验收与边界

修改实际文稿优先运行 `check_deck.py`，它不限定四章或二十页。渲染器改动使用 `test/README.md` 中的回归脚本；部分示例测试绑定示例 ID 与页数，不要为了通过测试而把新文稿改回原内容。

观看不需要开发环境；编译需要 Python，浏览器测试需要 Playwright，字体重建需要源字体和 fontTools。详细要求见 [TECH-STACK.md](TECH-STACK.md)。

所有资源使用模板内相对路径，不使用 CDN、远程字体、在线 API 或父目录素材。Noto、DejaVu 和 Three.js 的许可随目录携带，替换素材时需另外确认授权。Thanks 仅视觉参考素材库的粒子效果，代码独立实现，没有复制其通知许可代码或图片。

不提供在线编辑器、主题切换、演讲者视图或 PowerPoint 导出。新增页型、改变布局与导航属于模板开发，不是普通内容修改。字体子集只包含已生成的字符，新文字必须核查字体；长标题和复杂流程仍需人工视觉审阅。投影可读性与实际设备性能需要现场检查。
