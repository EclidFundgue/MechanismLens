# Paper IR 1.0

Paper IR 是论文事实层：它保存论文身份、可展示 claim、贡献、技术对象和统一
evidence。它不包含动画时间轴。

Schema：`schemas/paper-ir.schema.json`。

## 最小结构

```json
{
  "schemaVersion": "1.0",
  "paper": {
    "id": "paper.attention",
    "title": "Attention Is All You Need",
    "originalUrl": "https://arxiv.org/abs/1706.03762",
    "pdfUrl": "https://arxiv.org/pdf/1706.03762",
    "localPdfPath": "paper/original.pdf"
  },
  "evidence": [],
  "claims": [],
  "contributions": [],
  "concepts": [],
  "modules": [],
  "equations": [],
  "experiments": [],
  "figures": []
}
```

ID 仅使用字母、数字、点、下划线和连字符，并在一次生成后保持稳定。推荐命名：

```text
evidence.sec3.2
evidence.eq1
claim.no-recurrence
module.encoder
equation.scaled-dot-product
experiment.wmt14-en-de
```

## Evidence

先建 evidence，再建引用它的其它对象：

```json
{
  "id": "evidence.eq1",
  "label": "Scaled dot-product attention",
  "kind": "equation",
  "section": "§3.2.1",
  "page": 4,
  "anchor": "S3.SS2.SSS1",
  "url": "",
  "excerpt": "Attention(Q,K,V)=...",
  "confidence": "direct"
}
```

字段语义：

- `url`：存在精确网页锚点时填写，优先级最高；
- `page`：PDF 的 1-based 页码；运行时自动生成 `#page=N`；
- `anchor`：HTML 版本的 fragment，不带 `#`；
- `section`：人类可读定位；
- `excerpt`：支持该 claim 的短摘录，避免整段复制；
- `confidence=direct`：论文直接陈述；
- `confidence=derived`：系统根据论文计算、比较或归纳。

`page` 必须是 PDF 阅读器显示的页序号，而不是论文印刷页码。若两者不同，在
`label` 或 `section` 中保留印刷页信息。

## Grounded item

claim、contribution、concept、module、equation、experiment、figure 共用稳定的
grounded item 形状：

```json
{
  "id": "claim.parallelizable",
  "title": "训练可并行化",
  "text": "模型不依赖循环计算，可并行处理序列位置。",
  "evidenceIds": ["evidence.intro.parallel"]
}
```

允许增加场景需要的领域字段，例如 module 的 `inputs` / `outputs` / `shape`，
equation 的 `tex` / `symbols`，experiment 的 `metric` / `values`。但核心解释不能
只藏在扩展字段里；`title`、`text`/`summary`、`evidenceIds` 必须完整。

## 来源覆盖规则

必须有 evidence：

- 数字、百分比、年份、数据集规模；
- “优于”“提升”“首次”等比较或优先级判断；
- 公式定义与符号含义；
- 模块输入输出和训练/推理顺序；
- 作者结论与局限。

可以标为 derived：

- 由同一表格两列计算出的差值；
- 对多处方法描述的合并归纳；
- 为教学重命名的阶段或模块。

derived evidence 的 excerpt 要说明推导依据；不要把推导写成作者原话。

## 原文跳转策略

优先级：

1. evidence 自带精确 `url`；
2. 本地 PDF + `page`；
3. 在线 `pdfUrl` + `page`；
4. `originalUrl` + `anchor`；
5. 论文主页 + section/excerpt 人工定位。

本地 PDF 路径固定为 `paper/original.pdf`，对应文件位于
`project/public/paper/original.pdf`。不要写绝对本地路径，它在构建后不可移植。

## 自检

- 每个 ID 唯一；
- 所有 `evidenceIds` 存在；
- 所有上屏数字有来源；
- direct / derived 没有混淆；
- page 能打开到正确 PDF 页；
- originalUrl、pdfUrl、localPdfPath 至少有一个可用入口。
