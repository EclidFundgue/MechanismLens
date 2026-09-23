# Teaching plan

## Learning contract

- Audience: readers who understand transformer attention but have not read OA-WAM.
- Central questionId: `question.content-path`.
- Final capabilities: explain the two slot lifecycles, distinguish the roles of Q/K/V, justify the reset, interpret the two mechanism tests, and state the upstream-perception boundary.
- Explicit non-goals: perception internals, flow matching, training schedule, full benchmark ranking, and deployment claims.

## Throughline

- Scenario/step IDs: `scenario.address-routing` and its ordered steps.
- Reused participants: one changing object slot, `participant.query`, `participant.key`, `participant.value`, `participant.attention`, and `participant.actq`.
- Term conventions: “address-restricted” always refers to the input of slot K; “full state” refers to Q/V and the non-address residual coordinates. Never shorten this to “the action head only sees addresses.”

## Unit sequence

### `unit.lifecycle`

- QuestionId: `question.lifecycle`.
- Entry belief: one object representation can be treated as a single undifferentiated state.
- Learning outcome: distinguish `concept.addr` from `concept.cnt` and state their different update cadences.
- Prerequisite conceptIds: none.
- Mechanism stepIds: `step.slot-split`, `step.lifecycle`.
- Misconception to resolve: a stable identity handle would make the whole slot static.
- Change to show: `state.cnt-current` refreshes.
- Invariant to preserve: `state.addr-cached` stays fixed.
- Reader check: “Which subvector changes on the next observation?”
- Transition: if content changes, trace where it can still enter attention.

### `unit.selection-payload`

- QuestionId: `question.content-path`.
- Entry belief: restricting K may appear to remove current object content from the model.
- Learning outcome: predict which path changes when content changes while the address-derived selection stays fixed.
- Prerequisite conceptIds: `concept.addr`, `concept.cnt`, `concept.selection-payload`.
- Mechanism stepIds: `step.query-context`, `step.key-route`, `step.value-content`, `step.attention-read`.
- Misconception to resolve: the entire attention operation is address-only.
- Change to show: V and the retrieved output can change while the candidate address remains stable.
- Invariant to preserve: QK selection can stay fixed in the teaching experiment.
- Teaching experiment: hold Q and K fixed in a labeled toy example, vary V, and observe a changed weighted output; label the numbers as pedagogical rather than model telemetry.
- Reader check: “If K stays fixed and V changes, which quantities must and need not change?”
- Transition: the updated slot now raises a second question: how does its address remain stable across layers?

### `unit.reset`

- QuestionId: `question.reset`.
- Entry belief: separating `addr` at the input may seem sufficient to keep it stable through the trunk.
- Learning outcome: explain why the first 32 slot coordinates are restored after each transformer block.
- Prerequisite conceptIds: `concept.addr`, `concept.cnt`.
- Mechanism stepIds: `step.reset-address`.
- Misconception to resolve: residual and feed-forward updates automatically preserve the address subspace.
- Change to show: the non-address coordinates retain the block update.
- Invariant to preserve: `state.addr-cached` is reinserted into the first 32 coordinates.
- Reader check: “Which coordinates are restored, and which keep the block update?”
- Transition: after separating slot maintenance from routing, locate the state consumed by the action head.

### `unit.readout`

- QuestionId: `question.readout`.
- Entry belief: an address-only slot key may be mistaken for the direct action-head input.
- Learning outcome: identify `H_ACT_Q` as the action-head input and keep that path separate from slot reset.
- Prerequisite conceptIds: `concept.selection-payload`.
- Mechanism stepIds: `step.action-readout`.
- Misconception to resolve: the action head only sees the slot address.
- Change to show: the attention output updates `H_ACT_Q` before action prediction.
- Invariant to preserve: slot reset remains on the slot path, not the `ACT_Q` path.
- Reader check: “Which state feeds the action head, and where does slot reset occur instead?”
- Transition: test whether the two slot-routing operations affect the reported behavior.

### `unit.ablation`

- QuestionId: `question.ablation-evidence`.
- Entry belief: the reset or key mask may be cosmetic implementation detail.
- Learning outcome: interpret V2, V1, and V0 as a shared-metric switch comparison without overclaiming isolated scalar causality.
- Prerequisite conceptIds: `concept.selection-payload`.
- Mechanism stepIds: `step.ablation`.
- Misconception to resolve: one headline score alone validates the mechanism.
- Change to show: reveal `bar.v2`, then `bar.v1`, then `bar.v0` on the same scale.
- Invariant to preserve: metric, evaluation setting, and baseline identity.
- Reader check: “Which variant has reset but lacks the key mask?”
- Transition: move from switch ablation to an intervention on the address itself.

### `unit.intervention`

- QuestionId: `question.intervention-evidence`.
- Entry belief: correlation across model variants may seem like the strongest available evidence.
- Learning outcome: explain what the address-swap intervention changes and what a strong swap-binding response supports.
- Prerequisite conceptIds: `concept.addr`.
- Mechanism stepIds: `step.swap`.
- Misconception to resolve: the swap result is just another model-wide benchmark comparison.
- Change to show: only the address assignment changes in the intervention.
- Invariant to preserve: the other inputs specified by `experiment.address-swap`.
- Reader check: “What is changed in the intervention, and what response is being measured?”
- Transition: separate this routing result from failures that happen before a valid slot and address exist.

### `unit.boundary`

- QuestionId: `question.boundary`.
- Entry belief: a successful routing intervention may be overgeneralized to upstream perception or deployment robustness.
- Learning outcome: state the precondition on slot extraction and address initialization, and reject claims beyond the reported setting.
- Prerequisite conceptIds: `concept.addr`.
- Mechanism stepIds: `step.boundary`.
- Misconception to resolve: address routing can recover a missed object or ambiguous initial address.
- Change to show: none; this unit narrows the claim established by the preceding evidence.
- Invariant to preserve: `claim.conditional-boundary` and the named-baseline numerical guardrail.
- Reader check: “What failure occurs before address routing and therefore remains outside this guarantee?”
- Transition: finish by restating stable selection, current payload, and the conditional boundary.

## Evidence closure

| questionId | claimId | experimentId | unitId | conclusion boundary |
|---|---|---|---|---|
| `question.ablation-evidence` | `claim.address-routing` | `experiment.oa-ablation` | `unit.ablation` | Supports that both switches matter inside the reported system. |
| `question.intervention-evidence` | `claim.address-routing` | `experiment.address-swap` | `unit.intervention` | Supports address-sensitive target binding in the reported intervention. |
| `question.boundary` | `claim.conditional-boundary` | `experiment.sensor-boundary` | `unit.boundary` | Does not establish recovery from slot-extraction failure or real-robot robustness. |

## Coverage check

| required questionId | owning unitId | reader check | status |
|---|---|---|---|
| `question.lifecycle` | `unit.lifecycle` | update cadence | ready |
| `question.content-path` | `unit.selection-payload` | fixed K versus changing V | ready |
| `question.reset` | `unit.reset` | restored versus updated coordinates | ready |
| `question.readout` | `unit.readout` | `H_ACT_Q` readout versus slot reset | ready |
| `question.ablation-evidence` | `unit.ablation` | reset-only versus mask-plus-reset | ready |
| `question.intervention-evidence` | `unit.intervention` | address-only intervention | ready |
| `question.boundary` | `unit.boundary` | upstream failure | ready |

## Open handoff items

None. Visual implementation must preserve the term conventions and numerical guardrail from `analysis.md`.
