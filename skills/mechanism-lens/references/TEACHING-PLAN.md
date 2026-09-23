# 教学编排规范

在论文分析通过门槛后、创建 Visual Intent 前读本文。教学编排决定读者按什么顺序建立理解，不重新解释论文事实。

编排者默认读取用户问题、`content/analysis.md`、相关 Paper/Mechanism IR 条目及本文。只有交接卡存在阻塞项、语义边界需要核查或抽查关键表述时，才回看对应原文证据；不默认重读整篇论文。

阶段产物是 `content/teaching-plan.md`。它不进入运行时编译，只用于交接、评审和生成 Visual Intent。所有事实性内容使用 IR ID 引用，不复制公式、数字、模块定义或实验结果。

## 编排原则

围绕一条问题链组织讲解：先让读者看到旧解释在哪个具体情境下失效，再引入解决该障碍所需的最少概念，随后逐步展示核心机制，最后用实验检验主张并说明边界。

篇幅按解释价值分配：核心贡献获得最多步骤和最精细的状态变化；关键使能项讲清必要性；承载系统只提供定位和接口；实验用于闭合前面的机制问题。论文目录和模块数量不能直接决定章节数量。

优先复用一个贯穿案例、同一组参与者和稳定术语。整体结构、局部机制和时间过程之间应能互相定位。切换视角时明确说明当前对象、阶段和执行频率。

## 学习变化

每个教学单元都要定义读者在进入与离开时的理解差异：

- `entryBelief`：读者此时已经知道什么，可能带有什么误解；
- `question`：本单元只负责解决的关键疑问；
- `learningOutcome`：读者完成后能够解释、预测或区分什么；
- `mechanismStepIds`：产生该理解所需的最少机制步骤；
- `check`：一个不依赖新信息即可回答的问题或预测。

如果一个单元需要同时回答多个独立疑问，应拆分；如果两个单元只重复同一状态变化，应合并。

## 概念依赖与问题链

概念必须先于首次必要使用被定义，但不需要在开头集中讲完。对每个单元检查：

1. 入口概念是否已经建立；
2. 新概念是否立刻用于回答当前问题；
3. 结尾是否产生下一单元自然需要的问题；
4. 是否提前泄露了后续结论，或依赖尚未解释的术语。

优先使用能暴露机制必要性的疑问，例如“如果地址固定，变化的内容如何仍影响输出？”这类问题迫使讲解区分不同信息路径，也为后续控制变量演示提供目标。

## 变化、不变量与教学实验

核心机制至少安排一个可观察的状态变化。适合交互时，为教学实验声明：

- 要检验的 `questionId` 和 `mechanismStepIds`；
- 用户或播放器改变的量；
- 被控制不变的量；
- 重新计算或切换的规则；
- 读者应观察的结果；
- 玩具数值、简化条件及其与真实模型的差异。

交互的价值在于让读者验证解释，而不是增加操作数量。若静态前后对照已能清楚展示变化与不变量，不必强制加入自由交互。

## 证据章节

实验出现时必须回指它检验的关键疑问或机制主张。每个证据单元说明：比较或干预改变了什么、观察到什么、结果支持到哪里、仍不能排除什么。至少保留一个限制、混合结果或失败情形，使读者知道结论的适用边界。

证据单元引用 `content/analysis.md` 中的 claim-to-evidence 行和相应 ID，不重新抄录实验表格。Visual Intent 后续通过 Mechanism IR step 取得证据绑定。

## `content/teaching-plan.md` 合同

```markdown
# Teaching Plan

## Learning contract
- Audience:
- Central questionId:
- Final capabilities:
- Explicit non-goals:

## Throughline
- Scenario/mechanism IDs:
- Reused participants:
- Term conventions:

## Unit sequence

### unit.<id>
- QuestionId:
- Entry belief:
- Learning outcome:
- Prerequisite conceptIds:
- Mechanism stepIds:
- Misconception to resolve:
- Change to show:
- Invariant to preserve:
- Teaching experiment (optional):
- Reader check:
- Transition:

## Evidence closure
| questionId | claimId | experimentId | unitId | conclusion boundary |

## Coverage check
| required questionId | owning unitId | reader check | status |

## Open handoff items
| itemId | owner stage | blocks | required action |
```

`entry belief`、`learning outcome`、误解、转场和检查题属于教学决定。事实、机制步骤和实验只通过 ID 指向上游真相源。计划不包含布局坐标、镜头参数或动画时序；这些属于 Visual Intent。

## 教学质量门槛

创建 Visual Intent 前必须满足：

- 中心问题在开头被建立，并在结尾得到可由读者复述的回答。
- 贡献主次与分析阶段一致，核心贡献拥有足够的因果步骤，承载系统没有抢占解释篇幅。
- 所有概念在首次必要使用前出现，术语和对象身份跨单元一致。
- 每个关键疑问有唯一主责单元，每个单元有明确学习变化和可执行的读者检查。
- 核心机制的变化量、不变量、阶段和频率在计划中均可被看见。
- 实验证据回到具体主张，结论边界与 `content/analysis.md` 一致。
- 计划中的每项事实都能追溯到 IR ID；没有为了转场补造因果关系。

独立评审时，优先让评审者尝试回答各单元的 `Reader check`。答不出时先判断是教学缺口、机制缺口还是证据缺口，再按分阶段工作流返工。
