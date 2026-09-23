# 分阶段工作流与交接

当一次任务需要完整阅读论文、设计教学顺序并实现网页时读本文。局部事实修订、样式调整或已有讲解的小改动不必启动全部阶段。

本工作流分隔的是职责和上下文，不增加新的事实源。Paper IR 保存论文事实，Mechanism IR 保存本次解释的机制，Visual Intent 保存画面与顺序。`content/analysis.md` 和 `content/teaching-plan.md` 是紧凑的作者产物，只记录选择、依赖和引用；它们不进入运行时编译，不得复制 IR 中的事实正文。

## 默认角色

主 Agent 始终负责用户目标、阶段状态、产物路径、跨阶段取舍与最终交付。复杂的 Paper Lens 任务优先使用三个彼此隔离的 subagent 环节：

| 角色 | 最小输入 | 责任 | 交付 |
|---|---|---|---|
| 论文分析者 | 用户问题、目标读者、论文与必要附录、Paper/Mechanism IR 规范 | 建立证据和来源对象，判断贡献主次，拆出机制、关键疑问和论证边界 | Paper IR、Mechanism IR、`content/analysis.md`、分析交接卡 |
| 教学编排者 | 用户问题、`content/analysis.md`、相关 IR 条目、教学编排规范 | 安排概念依赖、问题链、贯穿案例、讲解深度与理解检查 | `content/teaching-plan.md`、教学交接卡 |
| 独立评审者 | 成品、两个作者产物、质量门槛、被抽查步骤的来源证据 | 从新读者视角检查准确性、可理解性、前后一致和结论边界 | 定位到责任阶段与 ID 的缺陷清单 |

主 Agent 默认承担 Visual Intent、实现、构建和协调。项目规模足够大时可再委派实现，但实现者只接收教学交接卡、相关 Mechanism IR 切片和视觉规范。

若环境不支持 subagent，同一 Agent 也按阶段执行：结束一个阶段后写交接卡，清空非必要工作材料，再只加载下一阶段的最小输入。

## 阶段顺序

1. **协调与定界**：主 Agent 固定用户问题、目标读者、交付形式和可用来源，创建项目并记录当前阶段。用户未指定目标读者或讲解范围时，根据请求与论文作合理假设并写入作者产物，不因此暂停或增加前置问答。
2. **论文分析**：按 [PAPER-ANALYSIS.md](PAPER-ANALYSIS.md) 建立 Paper IR、Mechanism IR 和 `content/analysis.md`。没有通过分析门槛时不得开始章节写作。
3. **教学编排**：按 [TEACHING-PLAN.md](TEACHING-PLAN.md) 生成 `content/teaching-plan.md`。发现事实或机制缺口时返回分析阶段，不自行补造。
4. **视觉实现**：只加载当前教学单元、相关 Mechanism IR 条目及视觉规范，生成 Visual Intent 并构建网页。
5. **独立评审**：在新上下文中检查关键问题能否被回答、结论是否越界以及跨单元是否一致。修复后仅重做受影响的下游产物。

论文分析到教学编排是串行依赖。正文与附录的证据核查可以并行，完成后的内容评审与工程验证可以并行。不要在概念依赖和术语约定尚未确定时按章节并行写作。

## 上下文隔离

每个 subagent 使用新上下文或尽可能少的继承上下文。不要把完整对话、全部参考文档、整篇论文和整个项目源码一并传给所有角色。

全程共享的内容应保持很短：

- 用户问题、目标读者和交付约束；
- 当前阶段与已完成产物路径；
- 术语约定、关键语义边界和未解决问题的 ID；
- 本阶段需要处理的 IR ID 与文件路径。

阶段局部材料按需加载：分析者读论文和证据规范；教学编排者默认不重读整篇论文；实现者默认不读论文，只在交接卡标记缺口或核查特定表述时回查对应证据；评审者只抽查关键结论及其来源。

## 结构化交接卡

交接卡可以作为 subagent 返回值，也可暂存在工作记录中。它只传递索引、决定和阻塞项，不成为新的事实库。

```json
{
  "stage": "paper_analysis",
  "status": "ready",
  "artifacts": [
    { "path": "content/paper-ir.json", "role": "authoritative" },
    { "path": "content/mechanism-ir.json", "role": "authoritative" },
    { "path": "content/analysis.md", "role": "authoring" }
  ],
  "focusIds": {
    "contributionIds": ["contribution.core"],
    "mechanismObjectIds": ["mechanism.binding", "scenario.binding", "step.binding.lookup"],
    "evidenceIds": ["evidence.eq.3"]
  },
  "decisions": [
    {
      "id": "decision.depth.binding",
      "choice": "deep",
      "reason": "它直接回答用户问题。",
      "affects": ["mechanism.binding"]
    }
  ],
  "guardrails": [
    {
      "id": "guardrail.binding.scope",
      "statement": "讲解不得把局部约束扩展为整个模型的行为。",
      "supportIds": ["mechanism.binding", "evidence.eq.3"]
    }
  ],
  "openQuestions": [
    {
      "id": "question.appendix.ablation",
      "owner": "paper_analysis",
      "blocks": ["unit.evidence"]
    }
  ],
  "changedIds": ["mechanism.binding"]
}
```

规则：

- `artifacts` 指向已有产物；`authoritative` 表示事实或机制真相源，`authoring` 表示可审查的编辑决定。
- `focusIds` 让下一阶段按 ID 加载最小切片。不得在卡中复制贡献、实验、步骤或证据正文。
- `decisions` 只记录影响下游的选择及理由，例如展开深度、讲解顺序和省略项。
- `guardrails` 只保留容易被下游误读的语义边界，并必须附来源 ID；不要把所有事实改写成 guardrail。
- `openQuestions` 必须指定责任阶段和阻塞对象。`status: "ready"` 时不得遗留会阻塞下一阶段的问题。
- 返工时用 `changedIds` 标出影响范围，供下游定向重生成。

## 返工路径

| 发现的问题 | 返回阶段 | 修改对象 |
|---|---|---|
| 引文、数字、公式或作者结论不准确 | 论文分析 | Paper IR 与 `content/analysis.md` 中受影响的引用或决定 |
| 因果链、读写关系、状态变化或不变量不清楚 | 论文分析 | Mechanism IR 与相应语义边界 |
| 概念先用后讲、重点失衡、疑问未回答 | 教学编排 | `content/teaching-plan.md`，随后重生成相关 Visual Intent |
| 对象映射、画面状态、布局或交互表达错误 | 视觉实现 | Visual Intent；只有跨项目能力缺口才改运行时 |
| 评审意见缺少来源或与论文冲突 | 独立评审 | 先退回评审者补定位，不得直接覆盖真相源 |

上游修改后，由主 Agent 根据 `changedIds` 更新受影响的下游内容并重新验证。下游角色不得为了完成页面而填补上游未知项。

## 阶段门槛

- 分析完成：核心贡献已排序，必要前置概念已识别，关键疑问有对应机制步骤，机制主张与实验支持范围已连接，未知项已保留。
- 编排完成：每个单元有明确问题、学习变化和依赖，主贡献获得最多解释预算，贯穿对象与术语一致，读者检查题可由现有步骤回答。
- 实现完成：每个步骤引用 Mechanism IR，画面中的变化与不变量一致，证据入口可用，顺序播放和跳转均成立。
- 评审完成：缺陷已定位到责任阶段和具体 ID；严重事实错误、关键问题缺口和结论越界均已关闭。
