// 开场测试也从唯一 Markdown 主稿派生内容，不维护第二份标题 / 目录。
(function () {
  const model = ContentModel.parse(window.SLIDES_MD);
  const pad = n => String(n).padStart(2, '0');
  window.TEST_CONTENT = {
    ...model.meta,
    toc: model.chapters.map((c, i) => ({
      num: pad(i + 1), zh: c.title, en: c.english,
      pages: `${pad(c.first + 1)}–${pad(c.last + 1)}`
    }))
  };
})();
