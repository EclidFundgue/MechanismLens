# Paper IR

Paper IR records only what the paper or technical document states. It does not contain camera, layout, animation or inferred code behavior.

## Required structure

```json
{
  "paper": {
    "id": "paper.example",
    "title": "Example",
    "originalUrl": "https://example.org/paper",
    "summary": "One sentence grounded in the source."
  },
  "evidence": [],
  "claims": [],
  "contributions": [],
  "concepts": [],
  "modules": [],
  "relations": [],
  "equations": [],
  "algorithms": [],
  "experiments": [],
  "figures": []
}
```

Do not add version, hash, commit or snapshot fields.

Create evidence before the objects that cite it. Claims and contributions require `evidenceIds`; other grounded objects should cite the evidence that supports their displayed facts. Direct quotations and page references remain verbatim. Derived interpretation is marked with `confidence: "derived"`.

Paper IR answers “what does the document say?” Mechanism IR separately answers “how does the mechanism work for this explanation?”
