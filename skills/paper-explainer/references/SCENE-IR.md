# Scene IR 1.0

Scene IR 是讲解层，也是运行时的唯一内容入口。它定义场景顺序、step、字幕、
当前视觉 focus 和证据关联，不重复保存 Paper IR 的事实正文。

Schema：`schemas/scene-ir.schema.json`。

## 通用结构

```json
{
  "schemaVersion": "1.0",
  "paperId": "paper.attention",
  "title": "Transformer 交互讲解",
  "scenes": [
    {
      "id": "scene.attention",
      "title": "一次 attention 如何执行",
      "eyebrow": "Architecture execution",
      "type": "architecture_execution",
      "claimIds": ["claim.attention-only"],
      "evidenceIds": ["evidence.fig1"],
      "steps": [
        {
          "id": "step.query",
          "title": "Query",
          "narration": "Query 表示当前位置要寻找的信息。",
          "focusIds": ["node.query"],
          "visual": { "visibleNodeIds": ["node.query"], "activeEdgeIds": [] },
          "evidenceIds": ["evidence.sec3.2"]
        }
      ],
      "payload": {}
    }
  ]
}
```

## 选择规则

优先选择最接近技术语义的 scene type，不按页面布局选类型：

- 解释对象/定义/贡献：`concept`；
- “数据经过什么模块”：`architecture_execution`；
- “公式每一项做什么”：`equation_walkthrough`；
- “循环或步骤如何更新状态”：`algorithm_trace`；
- “哪个模块带来多少提升”：`ablation_comparison`；
- “看论文原图中的哪个区域”：`figure_inspector`。

同一章可以拆成多个 scene。不要把架构、公式和结果硬塞进一个万能场景。

## Payload

### concept

```json
{
  "points": [
    { "id": "point.gap", "label": "Gap", "text": "循环限制并行" },
    { "id": "point.idea", "label": "Idea", "text": "只使用 attention" }
  ]
}
```

### architecture_execution

```json
{
  "nodes": [
    { "id": "node.query", "label": "Q", "detail": "[B,N,d]", "shape": "tensor" },
    { "id": "node.attention", "label": "Attention", "shape": "operator" },
    { "id": "node.output", "label": "Context", "detail": "[B,N,d]" }
  ],
  "edges": [
    { "from": "node.query", "to": "node.attention", "label": "lookup" }
  ]
}
```

节点数组顺序就是默认视觉流向。复杂分支优先拆 scene；需要忠实重现论文中
的非线性连接时，可给每个节点加
`x/y/width/height`（960×480 画布坐标），给边加稳定 `id`；step 的
`visual.visibleNodeIds` 逐步揭示节点，`visual.activeEdgeIds` 点亮正在执行的边。
这些字段缺省时使用节点顺序生成简易布局，旧 Scene IR 仍可显示。

### equation_walkthrough

```json
{
  "tex": "\\operatorname{softmax}(QK^T / \\sqrt{d_k})V",
  "parts": [
    { "id": "eq.similarity", "tex": "QK^T", "explanation": "计算相似度" },
    { "id": "eq.scale", "tex": "\\sqrt{d_k}", "explanation": "控制数值尺度" }
  ]
}
```

逐步推导时，step 的 `visual.tex` 覆盖完整公式，`visual.visiblePartIds` 控制
当前已解释的符号卡片；`focusIds` 标记本步重点。公式用 KaTeX 排版，解析失败
会显示错误，必须核对原始公式后再交付。

### algorithm_trace

```json
{
  "lines": [
    { "id": "line.sample", "code": "q <- sample()", "explanation": "采样查询" },
    { "id": "line.update", "code": "state <- f(state, q)", "explanation": "更新状态" }
  ]
}
```

跟踪状态时每步在 `visual.variables` 写入完整变量快照，`visual.output` 可写
本步输出；`focusIds` 指向当前执行的伪代码行。运行时只展示快照，不执行伪代码。

### ablation_comparison

```json
{
  "metric": { "label": "Accuracy", "unit": "%", "direction": "higher", "decimals": 1 },
  "baselineId": "bar.base",
  "items": [
    { "id": "bar.base", "label": "Base", "value": 62, "displayValue": "62" },
    { "id": "bar.full", "label": "Full", "value": 81, "displayValue": "81" }
  ]
}
```

比较值必须来自 Paper IR evidence。坐标尺度使用真实 `value`，不要为了视觉效果
伪造比例。`visual.visibleItemIds` 控制每步显现的行，必须始终包含基线。
所有 step 共用全体数据的零轴刻度；展示“当前值减基线”的绝对差值，
`%` 指标默认以百分点表述。数值可以为负，`direction` 指明越高或越低越好。
没有 `metric` 的旧内容仍可显示基础对比。

### figure_inspector

```json
{
  "image": { "src": "assets/fig2.png", "alt": "论文 Figure 2 的方法架构", "width": 1600, "height": 900 },
  "caption": "Fig. 2 · Method overview",
  "regions": [
    { "id": "callout.decoder", "label": "Decoder", "x": 0.62, "y": 0.25, "width": 0.24, "height": 0.42 }
  ]
}
```

`image.width/height` 是原图像素尺寸；region 坐标是相对原图的 0–1 比例，
不随舞台缩放改变。step 的 `visual.regionId` 指定本步放大的区域，`null` 为全图；
省略时可从 `focusIds` 选第一个 region。旧格式 `src` + `callouts` 保持兼容，
但无法精确局部裁切。

## Step 规则

- 一个 step 只引入或强调一个逻辑动作；
- `narration` 同时是字幕和自动播放估时来源；
- `focusIds` 只能引用当前 scene payload 中的视觉 ID；
- `visual` 是可选的画面快照，所有显隐和状态都从当前 step 推导；回退或跳转
  不依赖之前播放过哪些 step，也不引入第二套计时器、字幕或真相源；
- transition step 可以不带 evidence，其余技术解释应绑定 evidence；
- step ID 一旦交付，不因增删前后 step 而重命名。

## 降级

找不到合适的专属场景时可使用 `concept`，但必须在 audit 中记录
`generic fallback`。不要临时生成新的页面结构然后绕过 Scene IR。
