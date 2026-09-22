# Mechanism IR

Mechanism IR is the source-neutral explanation model shared by Paper Lens and Code Lens.

Paper IR says what a paper states. Code IR says what code was read. Mechanism IR says how the mechanism works for the user's question.

## Structure

```json
{
  "id": "mechanism.cache-miss",
  "title": "Cache miss path",
  "question": "What happens when the cache misses?",
  "sources": [{ "id": "code.cache", "kind": "code" }],
  "participants": [],
  "states": [],
  "scenarios": [{
    "id": "scenario.cache-miss",
    "title": "Cache miss",
    "basis": "static_inference",
    "assumptions": ["The cache lookup misses."],
    "steps": [{
      "id": "step.lookup",
      "explanation": "Look up the key.",
      "basis": "source_fact",
      "participantIds": ["participant.cache"],
      "evidenceRefs": [{ "sourceId": "code.cache", "evidenceId": "evidence.lookup" }]
    }],
    "branches": [],
    "unresolved": ["Concurrent duplicate computation is not confirmed."]
  }]
}
```

Every displayed mechanism step must have at least one evidence reference. Use:

- `source_fact`: directly present in the selected document or code.
- `static_inference`: inferred from source with explicit assumptions.
- `runtime_observation`: observed in an actual recorded execution.

Do not use runtime observation without a real execution record. Keep assumptions and unresolved items visible instead of inventing certainty.

Mechanism IDs provide stable semantic targets for Visual Intent. They do not carry layout, coordinates, camera positions or animation timing.
