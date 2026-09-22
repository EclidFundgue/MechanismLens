# Generated Scene IR

Scene IR is the generated execution contract consumed by the web runtime. It contains `subjectId`, compiled worlds and scenes. Each step contains its mechanism-step IDs, namespaced evidence IDs, complete visual state, camera target, transition and timing.

Scene IR contains no version or build metadata. It is regenerated from Mechanism IR and Visual Intent on every build and must not be edited by hand.

`step.visual` is the target truth for visible objects, emphasis, active relations, readable targets, detail view and content state. Direct navigation must restore this complete target without depending on prior animation history.

World geometry, anchors, relation paths, frames and camera bounds are compiler output. Layout and camera defects are fixed in the engine or Visual Intent, never by patching Scene IR.
