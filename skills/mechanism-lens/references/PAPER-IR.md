# 论文 IR

论文 IR 只记录论文或技术文档陈述的内容，不包含相机、布局、动画或推断出的代码行为。

## 必需结构

```json
{
  "paper": {
    "id": "paper.example",
    "title": "示例",
    "originalUrl": "https://example.org/paper",
    "summary": "一句有来源依据的摘要。"
  },
  "evidence": [],
  "claims": [],
  "contributions": [],
  "concepts": [],
  "modules": [],
  "relations": [],
  "equations": [],
  "algorithms": [],
  "experiments": [],
  "figures": []
}
```

不得添加版本、哈希、提交或快照字段。

先创建证据，再创建引用它的对象。论断和贡献必须包含 `evidenceIds`；其他有依据的对象应引用支撑其上屏事实的证据。直接引文和页码引用保留原样。派生解释使用 `confidence: "derived"` 标记。

论文 IR 回答“文档说了什么？”，机制 IR 则单独回答“在本次讲解中，这个机制如何运作？”
