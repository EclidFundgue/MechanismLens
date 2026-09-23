# Analysis

## Scope

- User question: why split `addr` and `cnt`, and why restrict only the slot key?
- Audience assumptions: the reader knows that QK produces attention weights and V carries the retrieved payload.
- Excluded scope: perception implementation, training schedule, flow matching, complete benchmark ranking, and real-robot deployment.

## Contribution hierarchy

| contributionId | role | depth | editorial rationale |
|---|---|---|---|
| `contribution.address-constraint` | primary technical contribution | deep | Directly answers the selected mechanism question and has both an isolation test and an intervention test. |
| `contribution.object-addressability` | problem framing | medium | Establishes why stable selection and changing state must be separated before the tensor operations are introduced. |

`module.slot` is supporting representation and receives only enough depth to establish the two lifecycles. `module.action-head` is a boundary check, not a separate architecture chapter.

## Prerequisite map

| conceptId | neededBy stepId | required distinction |
|---|---|---|
| `concept.addr` | `step.key-route` | A stable identity handle is different from current object state. |
| `concept.cnt` | `step.value-content` | Changing content remains useful even when candidate selection is stabilized. |
| `concept.selection-payload` | `step.attention-read` | Weight selection through QK and information retrieval through V are different operations. |

## Question chain

| questionId | reader question | answeredBy scenario/step IDs | blocks |
|---|---|---|---|
| `question.lifecycle` | What stays fixed and what changes? | `step.slot-split`, `step.lifecycle` | `question.content-path` |
| `question.content-path` | If K is address-restricted, how can current content affect the result? | `step.query-context`, `step.key-route`, `step.value-content`, `step.attention-read` | `question.reset` |
| `question.reset` | Why is the input split not sufficient by itself? | `step.reset-address` | `question.readout` |
| `question.readout` | Does the action head itself read only addresses? | `step.action-readout` | `question.ablation-evidence` |
| `question.ablation-evidence` | Do the key mask and per-layer reset carry measurable weight in the reported system? | `step.ablation` | `question.intervention-evidence` |
| `question.intervention-evidence` | Does changing only the address redirect the selected target? | `step.swap` | `question.boundary` |
| `question.boundary` | What remains outside the guarantee? | `step.boundary` | none |

## Mechanism focus

| scenario/step IDs | why central | semantic guardrail |
|---|---|---|
| `scenario.address-routing` | Connects slot lifecycle, Q/K/V roles, cross-layer reset, readout, and evidence in one causal path. | The scope is slot positions; non-slot attention keeps the base path. |
| `step.key-route`, `step.value-content`, `step.attention-read` | Resolve the apparent contradiction between stable addressing and changing output. | Do not rewrite “slot K input is restricted” as “the whole model sees only addresses.” |
| `step.action-readout` | Prevents the address constraint from being incorrectly attributed to the action head input. | Preserve `claim.action-readout` and `evidence.action-query`. |
| `step.boundary` | Keeps the architecture claim conditional on upstream slot extraction. | Do not claim recovery from a missed object or ambiguous address initialization. |

## Claim-to-evidence argument

| claimId | mechanism stepIds | experimentId | evidenceIds | supports | does not establish | limitations |
|---|---|---|---|---|---|---|
| `claim.address-routing` | `step.key-route`, `step.reset-address`, `step.ablation` | `experiment.oa-ablation` | `evidence.qkv`, `evidence.reset`, `evidence.ablation` | The two OA switches are load-bearing inside the reported design. | That each score difference has no other interacting cause. | Same paper, simulator metrics. |
| `claim.address-routing` | `step.swap` | `experiment.address-swap` | `evidence.swap` | Target selection responds strongly to an intervention in the address subspace. | Universal causal identification outside the reported setup. | Test-time intervention and trajectory-alignment metric. |
| `claim.action-readout` | `step.action-readout` | none | `evidence.action-query`, `evidence.qkv` | The action head consumes `H_ACT_Q`, while full-state V and residual paths remain available upstream. | A runtime trace of information attribution. | Structural source fact plus static interpretation. |
| `claim.conditional-boundary` | `step.boundary` | `experiment.sensor-boundary` | `evidence.reset`, `evidence.sensor-boundary` | The routing constraint still depends on successful slot extraction. | Real-robot robustness. | Sensor-noise and simulator-only evidence. |

## Numerical guardrail

`evidence.sensor-boundary` must be compared with a named baseline. The reported `-17.1` uses OA-WAM `75.6` versus Cosmos-Policy `92.7`; versus pi-0.5 `89.7`, the difference is `-14.1`. The routing charts use `experiment.oa-ablation` and `experiment.address-swap`, so this boundary result is not mixed into their scales.

## Unresolved

| questionId | owner | blocks | next evidence to inspect |
|---|---|---|---|
| `question.real-robot` | paper analysis | no | A real-robot evaluation outside the selected manuscript would be required. |
