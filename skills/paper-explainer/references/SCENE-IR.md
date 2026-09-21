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

节点数组顺序就是默认视觉流向。复杂分支先拆 scene；需要精确表达支路时，可为
每个节点补 `x/y/width/height`（固定 `960 × 480` 画布）。边推荐提供稳定 `id`，
这样 step 可高亮路径；未提供坐标和边 ID 的旧场景仍以自动线性布局显示。

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

### algorithm_trace

```json
{
  "lines": [
    { "id": "line.sample", "code": "q <- sample()", "explanation": "采样查询" },
    { "id": "line.update", "code": "state <- f(state, q)", "explanation": "更新状态" }
  ]
}
```

### ablation_comparison

```json
{
  "items": [
    { "id": "bar.base", "label": "Base", "value": 62, "displayValue": "62" },
    { "id": "bar.full", "label": "Full", "value": 81, "displayValue": "81" }
  ]
}
```

比较值必须来自 Paper IR evidence。坐标尺度使用真实 `value`，不要为了视觉效果
伪造比例。

### figure_inspector

```json
{
  "src": "assets/fig2.png",
  "alt": "论文 Figure 2 的方法架构",
  "caption": "Fig. 2 · Method overview",
  "callouts": [
    { "id": "callout.decoder", "label": "Decoder", "x": 62, "y": 25, "width": 24, "height": 42 }
  ]
}
```

坐标均为图容器百分比。`imageWidth/imageHeight` 应为原图像素尺寸；提供后运行时
会同时显示全图定位框与无失真的局部放大图。focusIds 指向 callout ID。

## Step state：完整画面快照

`focusIds` 是统一的强调标记；当一个场景需要控制可见元素或状态时，在 step 中
增加可选 `state`。没有 `state` 的旧场景保持原有行为。

| type | `state` 字段 | 行为 |
|---|---|---|
| `architecture_execution` | `visibleNodeIds`、`activeEdgeIds` | 显隐节点并强调当前路径；激活边两端必须可见。 |
| `equation_walkthrough` | `tex`、`visiblePartIds` | 用完整公式快照逐步展开符号。 |
| `algorithm_trace` | `variables`、`output` | 变量是该 step 的完整状态，不写增量。 |
| `ablation_comparison` | `visibleItemIds` | 逐步加入变体；有 `baselineId` 时每步必须保留 baseline。 |
| `figure_inspector` | `zoomRegionId` | 控制与全图标记同步的局部放大区域。 |

消融 payload 可补 `metric`（`label/unit/direction/decimals`）和 `baselineId`。运行时
用同一零轴尺度绘制所有变体，差值始终是“当前值减基线值”；`direction: "lower"`
会反转好坏判断。公式以 KaTeX 的 HTML + MathML 输出，禁用可信 HTML；解析失败会
显示可见错误，必须在交付前修复。

## Step 规则

- 一个 step 只引入或强调一个逻辑动作；
- `narration` 同时是字幕和自动播放估时来源；
- `focusIds` 只能引用当前 scene payload 中的视觉 ID；
- `state` 是完整快照：前进、回退和跳转只由 `scene + step` 决定，不能依赖
  组件内的计时器或前一个 step 的副作用；
- transition step 可以不带 evidence，其余技术解释应绑定 evidence；
- step ID 一旦交付，不因增删前后 step 而重命名。

## 降级

找不到合适的专属场景时可使用 `concept`，但必须在 audit 中记录
`generic fallback`。不要临时生成新的页面结构然后绕过 Scene IR。
