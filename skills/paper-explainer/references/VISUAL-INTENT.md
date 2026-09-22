# Visual Intent IR 2.0

Visual Intent 是模型维护的讲解真相源。它描述“用什么结构表达、每一步讲什么、看哪里”，不保存编译后的像素几何。Schema：`schemas/visual-intent.schema.json`。

## World

一个 world 是跨步骤复用的稳定视觉空间：

```json
{
  "id": "world.method",
  "templateId": "grouped_overview",
  "selection": {
    "contentPatterns": ["hierarchical_modules", "overview_then_detail"],
    "reason": "模块有层级，并且需要从总览进入局部。"
  },
  "layout": { "direction": "horizontal" },
  "objects": [],
  "relations": [],
  "detailViews": []
}
```

同一 world 内对象 ID、父子关系和布局结构保持不变。需要不同拓扑表达时建立另一个 world；浏览器会在 world 间短切换，不伪装成同一画布上的连续飞行。

首发对象原语：`group/node/card/annotation/equation/code/chart/image`。对象用 `paperRef` 绑定 Paper IR，用 `evidenceIds` 补充该视觉实例的来源。`parentId` 只能指向 group，并且不能成环。

关系只引用当前 world 的对象；不把 split、merge 或视觉接点伪装为论文模块。图片 region 使用相对原图的 0–1 坐标。其他对象不写 x/y；编译器根据模板和 layout constraints 生成 geometry。

## Detail view

`detailViews` 有两种用途：复用总图对象形成子图投影，或用有来源绑定的解释对象展开机制。必须用 `explainsObjectId` 指回总图对象。新增教学解释要有独立 ID 和 derived 依据，不能暗示原图中存在该结构。

## Scene 与 step

scene 用 `contentKind` 描述内容语义，并用 `worldId` 选择视觉空间；`contentKind` 不决定 React 组件。

```json
{
  "id": "step.decoder",
  "title": "Decoder",
  "goal": "解释输出生成",
  "narration": "先恢复上下文，再进入 decoder。",
  "viewMode": "focus",
  "focusIds": ["group.decoder"],
  "activeRelationIds": ["edge.decode"],
  "transition": { "strategy": "viaOverview", "durationMs": 1000 },
  "evidenceIds": ["evidence.method"]
}
```

字段语义：

- `viewMode`：`overview/focus/detail/compare`；
- `focusIds`：相机目标，可以是对象，也可以是 equation term、code line、chart item 或 image region；
- `focusMode`：`fit/tight/contextual`；
- `visibleIds`：省略显示 world 全部对象，`[]` 表示显式无对象；
- `emphasisIds`：省略时使用 focus；
- `activeRelationIds`：本步活动路径；
- `detailViewId`：当前 detail，省略或 null 表示关闭；
- `state`：公式文本、变量快照、输出、图表可见项、图片 region 等类型化状态；
- `transition.strategy`：`direct` 或 `viaOverview`；
- `timing.holdMs`：讲解停留时间，省略时按字幕估算。

每个 step 是完整目标状态，不继承上一 step。顺放、回退、刷新和目录跳转都必须得到同一最终画面。变量“变化”只与叙事中的前一步快照比较。

## 自检

- 一步只强调一个逻辑动作；
- focus 所属对象在本步可见；
- 图表逐步显示时 baseline 始终可见；
- 同一 world 的步骤只改状态与镜头，不改拓扑；
- detail、关系和数字均可回到 Paper IR；
- 不把内容类型和布局模板绑定。
