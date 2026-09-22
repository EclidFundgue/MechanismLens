# 模板选择

模板决定对象如何组织，讲解方式决定如何呈现。默认讲解方式是 `static_emphasis`、`progressive_reveal` 或 `parts_then_whole`；`overview_detail_spotlight` 只用于确实需要读取局部细节的内容。这些讲解方式可以叠加在分组总览、分支融合等不同结构上，不作为独立的整页渲染器。

模板目录的唯一机器可读来源是 `templates/catalog.json`。选择前查看 `applicablePatterns`、`requiredKinds`、`allowedKinds`、`supportedTreatments` 和 `antiPatterns`。

## 选择流程

1. 从机制 IR 识别真实结构模式，例如顺序、分支融合、层级模块、训练/推理分离、公式项、状态更新、共享指标或图片区域比较。
2. 过滤无法满足必需对象类型或命中反模式的模板。
3. 内容确有多种合理表达时，比较 2–3 个候选；关注结构忠实、分步讲解、空间连续性和密度。
4. 在 `selection.reason` 记录最终理由；候选只需简短记录理由和风险，不输出冗长推理。
5. 编译器验证模板能力和对象类型；错误时修正视觉意图，不绕开模板目录。

## 讲解方式选择

| 标识符 | 使用条件 |
|---|---|
| `static_emphasis` | 一张可读画面内切换注意力；相机保持固定 |
| `progressive_reveal` | 公式、算法、比较或状态逐步出现；相机保持固定 |
| `parts_then_whole` | 复杂方法先用固定局部世界讲完整小问题，再用折叠总结世界串联 |
| `overview_detail_spotlight` | 原图小标注或必要局部确实无法在默认画框读取 |

不要把一个不可读的巨大世界强行设为固定总览。先精简说明、调整布局、折叠已讲细节或拆分局部世界；只有这些方式仍不合适时才请求新画框。

## 首发模板

| 标识符 | 适合内容 |
|---|---|
| `grouped_overview` | 层级模块、主干和局部聚焦 |
| `branch_merge_pipeline` | 多分支、融合与共享输出 |
| `encoder_decoder` | 编码、瓶颈、解码和跨侧连接 |
| `training_inference_dual_view` | 训练/推理差异和共享模块 |
| `concept_sequence` | 问题、方案、贡献等概念序列 |
| `equation_derivation` | 公式与稳定项解释 |
| `algorithm_state_trace` | 伪代码、变量和输出快照 |
| `compare_variant` | 基线、变体、消融和共享指标 |
| `figure_region_exploration` | 原图总览与区域比较 |

新增模板只增加目录元数据、槽位验证、布局展开和示例。若需要复制一个完整页面组件，说明该能力应继续拆成原语或布局策略。

## 常见误用

- 模型结构不等于“方框加从左到右直线”；先识别层级、分支和阶段。
- 训练专属损失、真实标签或辅助头不得进入推理路径。
- 没有共享指标的数值不能放进变体比较。
- 复杂原图应使用原图区域；不要凭空重绘无法验证的细节。
- 直接缩放无法讲清的内部机制使用固定局部世界或详情视图，并保留语义映射。
