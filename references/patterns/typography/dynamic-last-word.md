# 动态最后一个词

## 来源观察

- 参考页面：[SpaceXAI.html](../../sources/spacexai/SpaceXAI.html)
- 首页标题保持 `Frontier AI models for everything you` 不动，只替换最后一个词。
- 原页面的词语数组包含 `build`、`imagine`、`search`、`see`、`create`、`hear`、`reason`、`code`、`write`、`analyze`、`ship`。
- 词语大约每 3 秒切换一次，组件进入视口后才开始轮播。

## 动画结构

1. 先测量词语宽度，把词槽固定为最长词的宽度，避免标题左右抖动。
2. 新词逐字生成，每个字依次从下方、透明和模糊状态进入。
3. 旧词逐字向上离场，和新词形成短暂的交错。
4. 词语下方使用一个渐变的 shimmer 线条，增加品牌识别，但不改变句子的结构。

## 本地复刻方式

`DESIGN-ASSET-LIBRARY.html` 中的复刻使用原生 HTML、CSS 和 JavaScript：

- 用隐藏的测量节点计算最长词宽度。
- 用 `setTimeout` 延迟首次切换，用 `setInterval` 控制后续 3 秒节奏。
- 用 CSS keyframes 实现字母级的 `translateY`、`opacity` 和 `blur` 变化。
- 用 `IntersectionObserver` 让组件进入视口后再开始动画。
- 支持暂停按钮和 `prefers-reduced-motion`。

## 适合使用

- 品牌首页的主标题
- 产品能力、服务对象或创作结果的轮播表达
- 一句话中需要保持语法稳定、只替换承诺对象的场景
- 不希望使用横向轮播卡片，却希望首屏具有变化感的页面

## 使用边界

- 词语必须共享相近的语义位置和语法角色，否则标题会像随机生成器。
- 词槽必须锁定宽度或处理布局动画，避免页面跳动。
- 动画速度要让用户读完当前词，3 秒是可用的起点，不是固定规则。
- 轮播不是信息层级的替代品；重要信息不能只存在于某一帧。
