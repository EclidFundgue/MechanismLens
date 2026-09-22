# Evidence

Evidence connects explanation steps to original paper passages or source code.

## Paper evidence

Paper evidence can identify a section, page, figure, table, equation, quotation, appendix, URL and excerpt. Preserve the original wording and page location.

## Code evidence

Code evidence contains:

```text
id
label
kind: code
path
symbol (optional)
lineStart
lineEnd
excerpt
basis
```

It deliberately contains no commit, branch, snapshot, modification status, file inventory or hash. It means “this is what Code Intake read while generating the explanation,” not “this repository can never change.”

The complete URL repository remains in `sources/code/repository/`. The website receives only evidence excerpts selected by compiled mechanism steps.

## Binding

Mechanism steps reference evidence as `{sourceId, evidenceId}`. Visual Intent references mechanism steps. The compiler produces namespaced `step.evidenceIds` and a filtered `source-bundle.json`. Source Drawer and Code Spotlight consume only that derived bundle.

Structural validation proves that references exist. It does not prove that a natural-language explanation is semantically correct; audit important claims manually.
