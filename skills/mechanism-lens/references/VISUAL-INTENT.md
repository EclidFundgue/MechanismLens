# Visual Intent

Visual Intent decides how a validated mechanism is taught. It does not restate source evidence or describe repository structure.

## Contract

- `mechanismId` identifies the Mechanism IR.
- Each world selects a template and declares reusable visual objects, relations, fixed frames and optional detail views.
- Objects and relations use `mechanismRef` when they represent a mechanism item.
- Every scene step uses `mechanismStepIds`; the compiler derives evidence bindings.
- Steps control visibility, emphasis, active relations, readable targets, state, transition and hold time.
- Do not add coordinates. The compiler owns layout and geometry.

Use `cameraPolicy: "static_first"`. A scene has one default frame. Change frame only when required content is unreadable, source detail must be inspected or spatial context must be restored. Emphasis alone must not move the camera.

Available primitives are `group`, `node`, `card`, `annotation`, `equation`, `code`, `chart` and `image`. The `code` primitive is for pseudocode or local algorithm state. Real repository evidence appears in Code Spotlight through compiled evidence bindings.

One step should introduce or emphasize one logical action. Reuse object identity and geometry across steps. Use detail views for meaningful internal expansion instead of moving the entire world.
