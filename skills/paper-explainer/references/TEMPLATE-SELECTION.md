# 模板选择

模板决定对象如何组织，treatment 决定如何讲。`overview_detail_spotlight` 是 treatment，可以叠加在 grouped overview、branch-merge 等不同结构上，不作为独立全页 renderer。

模板目录的唯一机器可读来源是 `templates/catalog.json`。选择前查看 `applicablePatterns/requiredKinds/allowedKinds/supportedTreatments/antiPatterns`。

## 选择流程

1. 从 Paper IR 识别真实结构模式，例如顺序、分支融合、层级模块、训练/推理分离、公式项、状态更新、共享指标或图片区域比较。
2. 过滤无法满足 required kinds 或命中 anti-pattern 的模板。
3. 内容确有多种合理表达时，比较 2–3 个候选；关注结构忠实、分步讲解、空间连续性和密度。
4. 在 `selection.reason` 记录最终理由；候选只需简短 reason/risk，不输出冗长推理。
5. 编译器验证模板能力和对象类型；错误时修正 Intent，不绕开 catalog。

## 首发模板

| id | 适合内容 |
|---|---|
| `grouped_overview` | 层级模块、主干和局部聚焦 |
| `branch_merge_pipeline` | 多分支、融合与共享输出 |
| `encoder_decoder` | 编码、瓶颈、解码和跨侧连接 |
| `training_inference_dual_view` | 训练/推理差异和共享模块 |
| `concept_sequence` | 问题、方案、贡献等概念序列 |
| `equation_derivation` | 公式与稳定 term 解释 |
| `algorithm_state_trace` | 伪代码、变量和输出快照 |
| `compare_variant` | baseline、变体、消融和共享指标 |
| `figure_region_exploration` | 原图总览与 region 比较 |

新增模板只增加 catalog metadata、槽位验证、布局展开和示例。若需要复制一个完整页面组件，说明该能力应继续拆成原语或布局策略。

## 常见误用

- 模型结构不等于“方框加从左到右直线”；先识别层级、分支和阶段。
- 训练专属 loss、GT 或 auxiliary head 不得进入推理路径。
- 没有共享指标的数值不能放进 compare variant。
- 复杂原图应使用原图 region；不要凭空重绘无法验证的细节。
- 直接 zoom 无法讲清的内部机制使用 detail view，并保留总图定位。
