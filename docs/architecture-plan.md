# MechanismLens architecture

MechanismLens uses one source-grounded explanation pipeline for papers and code:

```text
Paper IR ─┐
          ├→ Mechanism IR → Visual Intent → Scene IR → Web runtime
Code IR ──┘
```

Paper IR and Code IR describe what the input material contains. Mechanism IR describes the participants, conditions, steps, branches, state changes, assumptions and unresolved questions that the explanation teaches. Visual Intent chooses the presentation; Scene IR is generated execution data.

The repository maintains one current contract for every IR. Contracts contain no version fields, hashes, commit identifiers, snapshots, Git modification status or repository file inventories. Contract changes update the schemas, compiler, validator, fixtures, runtime and documentation together.

Code Intake is static and read-only. Public Git URLs are shallow-cloned into `sources/code/repository/`, with the depth-one `.git` retained, submodules left uninitialized and Git LFS content left as pointers. The complete repository remains in the generated project; only selected evidence snippets are published into the website.

WorldStage, layout, camera and player semantics are shared by Paper Lens and Code Lens. Real source code appears in Code Spotlight beside the mechanism stage instead of becoming another full-page renderer.
