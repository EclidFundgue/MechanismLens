# OA-WAM address routing — complete Paper Lens example

This example shows the full authored input for one deliberately narrow Paper
Lens question:

> Why does OA-WAM split an object slot into `addr` and `cnt`, and why is only
> the slot key restricted while query and value keep the full hidden state?

It is based on the local OA-WAM NeurIPS 2026 manuscript. The example does not
try to reproduce the full presentation. It follows one claim from source
evidence, through mechanism analysis and teaching design, into buildable
MechanismLens input.

## What to read

1. [`sources/paper-excerpts.md`](sources/paper-excerpts.md) preserves the
   selected source passages and locators.
2. [`analysis.md`](analysis.md) identifies the primary contribution, technical
   boundaries, counterevidence and excluded scope.
3. [`paper-ir.json`](paper-ir.json) records only paper-grounded facts.
4. [`mechanism-ir.json`](mechanism-ir.json) answers the selected mechanism
   question and binds every step to evidence.
5. [`teaching-plan.md`](teaching-plan.md) specifies learning goals,
   prerequisites, misconceptions and scene order.
6. [`visual-intent.json`](visual-intent.json) turns those steps into reusable
   worlds without duplicating source evidence.

`scene-ir.json`, `source-bundle.json`, `script.md` and `outline.md` are omitted
because they are derived outputs. Generate them with the current compiler.

## Materialize and build

Create a fresh scaffold outside this example, then replace its three compiler
inputs, copy the two authoring handoffs, and copy the selected source excerpts.
From the repository root in PowerShell:

```powershell
$target = Join-Path $env:TEMP "oawam-address-routing"
$example = "skills/mechanism-lens/references/examples/oawam-address-routing"
node skills/mechanism-lens/scripts/scaffold-project.mjs $target `
  --mode paper `
  --title "OA-WAM address routing" `
  --source "sources/paper-excerpts.md" `
  --question "Why split addr and cnt, and why mask only the slot key?"

Copy-Item (Join-Path $example "paper-ir.json") "$target/content/paper-ir.json" -Force
Copy-Item (Join-Path $example "mechanism-ir.json") "$target/content/mechanism-ir.json" -Force
Copy-Item (Join-Path $example "visual-intent.json") "$target/content/visual-intent.json" -Force
Copy-Item (Join-Path $example "analysis.md") "$target/content/analysis.md" -Force
Copy-Item (Join-Path $example "teaching-plan.md") "$target/content/teaching-plan.md" -Force
Copy-Item (Join-Path $example "sources/paper-excerpts.md") "$target/sources/paper-excerpts.md" -Force

node skills/mechanism-lens/scripts/build-project.mjs $target
```

The target must be absent or empty because the scaffold does not overwrite an
existing project.

## Accuracy notes

- The address restriction applies to the **key projection input at slot
  positions**. `Q` and `V` use the full hidden state, and changing content can
  still change attention outputs through `V` and the residual stream. The
  example therefore never says that the action head “only sees addresses.”
- The paper's `-17.1` sensor-noise deficit compares OA-WAM `75.6` with the
  prior-best Cosmos-Policy `92.7`. Comparing OA-WAM with pi-0.5 `89.7` gives
  `-14.1`, not `-17.1`. This result is retained as a boundary check, not used
  as evidence for the central routing mechanism.
- The routing guarantee is conditional on correct upstream slot extraction.
  The source explicitly says the constraint cannot recover a missed object or
  ambiguous address initialization.
