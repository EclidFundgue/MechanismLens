# Visual Intent IR 2.1

Visual Intent 是模型维护的讲解真相源。它描述“用什么结构表达、每一步讲什么、固定展示哪些内容、强调什么”，不保存编译后的像素几何。Schema：`schemas/visual-intent.schema.json`。

## World 与固定 frame

一个 world 是跨步骤复用的稳定视觉空间。2.1 world 必须声明至少一个固定 frame：

```json
{
  "id": "world.method",
  "templateId": "grouped_overview",
  "selection": {
    "contentPatterns": ["hierarchical_modules"],
    "reason": "模块有层级，局部解释后需要总结关系。"
  },
  "layout": { "direction": "horizontal" },
  "objects": [],
  "relations": [],
  "frames": [{
    "id": "frame.method",
    "targetIds": [],
    "mode": "fit",
    "requiredReadableIds": ["node.input", "node.output"]
  }],
  "detailViews": []
}
```

`frame` 是可复用的取景范围，不是视频单帧。编译器根据 `targetIds/mode` 计算确定性 bounds；引用同一 frame 的所有 step 得到完全相同的 camera。`requiredReadableIds` 只列本段必须读清的标签、公式项、代码行、图表项或原图 region，不要求总图中的所有注释都可读。

非默认 frame 必须有请求理由：

```json
{
  "id": "frame.figure-label",
  "targetIds": ["region.small-label"],
  "mode": "tight",
  "requiredReadableIds": ["region.small-label"],
  "request": { "reason": "inspect_source_detail" }
}
```

允许的 reason 只有：

- `required_content_unreadable`：默认 frame 无法读清本步必读内容；
- `inspect_source_detail`：必须读取原图、表格或材料中的微小区域；
- `restore_spatial_context`：跨远处目标前确实需要恢复共同空间关系。

“增加动感”“强调重要性”“避免单调”不是合法理由。

同一 world 内对象 ID、父子关系和布局结构保持不变。需要不同拓扑表达时建立另一个 world；浏览器在 world 间短切换，不伪装成同一画布上的连续飞行。复杂方法默认使用固定局部 world 分别讲清输入、机制和输出，再用折叠后的总结 world 串联，而不是在一张巨大 world 上反复运镜。

首发对象原语：`group/node/card/annotation/equation/code/chart/image`。对象用 `paperRef` 绑定 Paper IR，用 `evidenceIds` 补充该视觉实例的来源。`parentId` 只能指向 group，并且不能成环。

关系只引用当前 world 的对象；不把 split、merge 或视觉接点伪装为论文模块。图片 region 使用相对原图的 0–1 坐标。其他对象不写 x/y；编译器根据模板和 layout constraints 生成 geometry。

## Detail view

`detailViews` 用于复用总图对象形成子图投影，或用有来源绑定的解释对象展开机制。必须用 `explainsObjectId` 指回总图对象。包含 detail 的 scene 会预留稳定的详情区域，避免面板开关挤动主图。新增教学解释要有独立 ID 和 derived 依据。

## Scene 与 step

scene 用 `contentKind` 描述内容语义，并用 `worldId` 选择视觉空间；`contentKind` 不决定 React 组件。

```json
{
  "id": "scene.fusion",
  "worldId": "world.method",
  "presentation": {
    "treatment": "progressive_reveal",
    "cameraPolicy": "static_first",
    "defaultFrameId": "frame.method"
  },
  "steps": [{
    "id": "step.fusion-input",
    "narration": "先确认融合操作接收哪些输入。",
    "frameId": "frame.method",
    "emphasisIds": ["node.fusion-input"],
    "requiredReadableIds": ["node.fusion-input"],
    "activeRelationIds": ["edge.fusion-input"]
  }]
}
```

字段语义：

- `presentation.treatment`：`static_emphasis/progressive_reveal/parts_then_whole/overview_detail_spotlight`；
- `presentation.cameraPolicy`：2.1 固定为 `static_first`；
- `presentation.defaultFrameId`：scene 的默认阅读画幅；
- `frameId`：本 step 的完整相机目标；每个 2.1 step 显式填写；
- `emphasisIds`：当前注意对象，不影响 camera；
- `requiredReadableIds`：本 step 必须读清的 frame 声明对象子集；
- `visibleIds`：省略显示 world 全部对象，`[]` 表示显式无对象；
- `activeRelationIds`：本步活动路径；
- `detailViewId`：当前 detail，省略或 null 表示关闭；
- `state`：公式文本、变量快照、输出、图表可见项、图片 region 等类型化状态；
- `transition.strategy`：`direct` 或有明确空间理由的 `viaOverview`；
- `timing.holdMs`：画面稳定后的阅读停留时间，省略时按字幕估算。

换 emphasis 不换 frame；只有换 frame 才可能移动相机。一次进入必要局部后，在同一 frame 中连续完成输入、运算、输出等多个 step。

每个 step 是完整目标状态，不继承上一 step。顺放、回退、刷新和目录跳转都必须得到同一最终画面。变量“变化”只与叙事中的前一步快照比较。

## 2.0 兼容

Visual Intent 2.0 继续保持旧语义：`focusIds` 同时产生 camera target，并在未显式指定时成为 emphasis。2.1 禁止 `focusIds/viewMode/focusMode`，避免静默改义。运行 `npm run migrate:intent` 可生成保留旧相机行为的 2.1 候选文件；迁移产生的 camera reason 必须人工复核，再合并可共用的固定 frame。

## 自检

- 一步只强调一个逻辑动作；
- 同一 frame 的连续 step 只改强调、路径、显隐或状态；
- 必读对象完整位于 frame 内，且其 owner 在本步可见；
- 图表逐步显示时 baseline 始终可见；
- detail、关系和数字均可回到 Paper IR；
- 不把内容类型和布局模板绑定；
- 巨大 world 不用固定总览掩盖不可读问题，优先拆局部 world。
