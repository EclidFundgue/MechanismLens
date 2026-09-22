# Development

MechanismLens keeps one current contract for Paper IR, Code IR, Mechanism IR, Visual Intent and Scene IR. A contract change must update schemas, compiler, validation, template content, TypeScript types, documentation and tests together. Do not add version branches, migration scripts, hashes or compatibility readers.

The compiler pipeline is:

```text
validate sources → validate mechanism → validate intent → layout worlds
→ compile complete step targets → build source bundle → validate scene graph
```

Keep engine and validation modules as pure ESM where possible. WorldStage, camera and player consume generated Scene IR and must not read Paper IR or Code IR directly. Source Drawer and Code Spotlight read only the filtered source bundle.

Code Intake is a separate generation tool. URL clones remain in `sources/code/repository/`; local repositories are read in place. Intake must never run target code or inspect Git history for IR metadata.

Run `npm test`, `npm run test:runtime` and `npm run test:delivery`. Delivery tests must cover generated projects outside the repository, paths with spaces and Chinese characters, compile/validate/build/serve, process cleanup and movable output.
