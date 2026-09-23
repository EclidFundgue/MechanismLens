# 论文分析规范

在 Paper Lens 首次分析论文、重构核心解释或补充关键实验论证时读本文。本文规定如何做编辑判断；论文事实仍只写入 Paper IR，机制事实仍只写入 Mechanism IR。

分析阶段生成 `content/analysis.md`。它是供教学编排者和评审者阅读的紧凑作者产物，不进入运行时编译。它只引用 Paper IR、Mechanism IR 和 evidence ID，不复制摘要、公式、实验表格或步骤正文。

## 分析目标

分析者需要回答四类问题：

1. 论文真正改变了什么，哪些内容只是承载系统或实现条件？
2. 读者要理解核心变化，最少需要哪些前置概念？
3. 机制在什么条件下、按什么顺序运行，什么发生变化，什么保持不变？
4. 哪些实验支持哪项机制主张，支持到什么范围，还有什么不能由实验推出？

先建立证据和 Paper IR，再形成贡献排序与机制解释。不要先写故事再寻找支持它的引文。

## 贡献主次

将论文内容按本次用户问题分为四种角色，而不是平均分配篇幅：

- **核心贡献**：移除后，论文最主要的解释或结果主张不再成立。
- **关键使能项**：让核心贡献能够训练、运行或扩展，但不是论文希望读者带走的第一结论。
- **承载系统**：感知器、主干、损失、数据流程等必要上下文；只讲到足以理解核心机制。
- **验证证据**：对比、消融、干预、误差分析和失败结果，用来检验主张而不是充当另一个模块列表。

排序时逐项检查：它解决的具体缺口是什么；与最接近的基线相比改变了什么；论文是否用专门实验验证它；用户问题是否直接依赖它。若这些问题没有来源依据，将判断标为待核查，不用写作自信替代证据。

`content/analysis.md` 只记录贡献 ID、角色、展开深度和选择理由。贡献的名称、定义、数值与证据保留在 Paper IR。

## 前置概念与关键疑问

前置概念只保留理解核心机制所需的最小集合。每项记录 concept ID、首次使用它的 mechanism step ID，以及读者必须掌握的区分。通用背景若不会改变后续理解，可以在讲解中省略或按需展开。

从可能的理解障碍中生成关键疑问，至少覆盖适用项：

- 旧方法在哪个具体条件下不足？
- 新设计改变了哪条信息路径或约束？
- 为什么需要这个部件；去掉它后哪条推理会断开？
- 谁读取谁、谁写入谁，输入与输出分别是什么？
- 哪些量更新，哪些量保持不变？
- 一个操作发生在 episode、观测、网络层、迭代步还是训练阶段？
- 训练和推理是否使用相同的信息与状态？
- 哪个看似矛盾的问题最容易让读者误解机制？
- 哪个实验检验这项设计，哪个结果限制其结论？

每个关键疑问必须指向将回答它的 Mechanism IR scenario 或 step。无法回答时写入 `unresolved`，不得留给教学编排者自行推断。

## 机制分析

Mechanism IR 中的核心 scenario 应足以恢复下列语义：

- 触发条件与阶段；
- 参与者及其输入输出；
- 读取、写入和传递关系；
- 步骤前后的状态变化；
- 整个步骤或阶段内保持不变的量；
- 执行频率与生命周期；
- 假设、分支和未知项。

不要用“模块 A 连接模块 B”替代机制。对于核心步骤，应能回答“为什么这次变化会导致下一次变化”。若 Paper IR 只支持结构关系而不支持因果解释，应使用 `static_inference` 加明确假设，或保留未知项。

## 机制与实验论证

实验分析围绕主张组织，不按论文表格出现顺序罗列。对每项核心主张建立以下引用关系：

| 字段 | 内容 |
|---|---|
| `claimId` | Paper IR 中的论断或贡献 ID |
| `mechanismRefs` | 被检验的 Mechanism IR scenario/step ID |
| `experimentId` | Paper IR 中的实验 ID |
| `testRole` | 对比、消融、干预、压力测试、误差分析或反例 |
| `observedEvidenceIds` | 结果证据 ID |
| `supports` | 该结果实际支持的有限结论 |
| `doesNotEstablish` | 该结果不能证明的内容 |
| `limitations` | 指标、数据、基线、统计或适用范围限制 |

`supports`、`doesNotEstablish` 和 `limitations` 属于分析判断，可以写入 `content/analysis.md`，但必须引用上表 ID。保留不利结果和混合结果；不要用总平均掩盖机制假设最相关的轴，也不要把相关性结果写成因果证明。

## `content/analysis.md` 合同

建议保持在可快速通读的长度，采用以下结构：

```markdown
# Analysis

## Scope
- User question:
- Audience assumptions:
- Excluded scope:

## Contribution hierarchy
| contributionId | role | depth | rationale |

## Prerequisite map
| conceptId | neededBy | required distinction |

## Question chain
| questionId | reader question | answeredBy | blocks |

## Mechanism focus
| mechanismId | why central | semantic guardrails |

## Claim-to-evidence argument
| claimId | mechanismRefs | experimentId | supports | doesNotEstablish | limitations |

## Unresolved
| questionId | owner | blocks | next evidence to inspect |
```

其中 `rationale`、`required distinction`、`semantic guardrails` 和论证边界是编辑决定；其余内容使用 ID 引用真相源。不要粘贴原文摘录或把 Mechanism IR 步骤改写一遍。

## 分析质量门槛

进入教学编排前必须满足：

- 只有一个清晰的第一主贡献；若论文确有多个并列贡献，已说明它们的依赖或并列关系。
- 每个核心贡献都连接到问题、机制与至少一种验证证据；缺失项被明确标记。
- 核心 scenario 的变化量、不变量、执行阶段和频率没有互相矛盾。
- 所有关键疑问都有负责回答的机制 ID，或进入 `unresolved`。
- 实验结论区分了观察、作者主张和分析者推断，并保留反例与限制。
- `content/analysis.md` 能指导下一阶段做取舍，但不成为 Paper IR 或 Mechanism IR 的副本。
