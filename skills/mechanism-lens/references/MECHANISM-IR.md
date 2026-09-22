# 机制 IR

机制 IR 是论文讲解与代码讲解共用的来源中立解释模型。

论文 IR 记录论文陈述了什么，代码 IR 记录读取了哪些代码，机制 IR 则回答面向用户问题时机制如何运作。

## 结构

```json
{
  "id": "mechanism.cache-miss",
  "title": "缓存未命中路径",
  "question": "缓存未命中时会发生什么？",
  "sources": [{ "id": "code.cache", "kind": "code" }],
  "participants": [],
  "states": [],
  "scenarios": [{
    "id": "scenario.cache-miss",
    "title": "缓存未命中",
    "basis": "static_inference",
    "assumptions": ["缓存查找未命中。"],
    "steps": [{
      "id": "step.lookup",
      "explanation": "查找键。",
      "basis": "source_fact",
      "participantIds": ["participant.cache"],
      "evidenceRefs": [{ "sourceId": "code.cache", "evidenceId": "evidence.lookup" }]
    }],
    "branches": [],
    "unresolved": ["尚未确认是否会发生并发重复计算。"]
  }]
}
```

每个上屏的机制步骤都必须至少有一个证据引用。依据类型如下：

- `source_fact`：直接出现在所选文档或代码中的事实。
- `static_inference`：基于来源并结合明确假设得出的静态推断。
- `runtime_observation`：在真实且有记录的运行中观察到的事实。

没有真实运行记录时，不得使用运行时观察。应明确保留假设和未解决项，不能虚构确定性。

机制 ID 为视觉意图提供稳定的语义目标，不承载布局、坐标、相机位置或动画时序。
