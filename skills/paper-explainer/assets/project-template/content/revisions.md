# Revisions

Append changes here. Never rewrite earlier entries.

## 2026-09-22 · Static-first camera contract

- Feedback: camera movement should solve readability problems instead of acting as the default narrative device.
- Intent: upgraded the template fixture to Visual Intent 2.1 fixed frames and separated `frameId` from `emphasisIds`.
- Engine/runtime: added deterministic compiled frames, legacy 2.0 compatibility, camera-reason validation, readability warnings, no-op camera short-circuit, settled narration timing, and stable detail-panel space.
- Verification: 26 of 27 repository tests passed with one expected environment skip; the production build, movable-delivery integration test, and 9-scene/16-step data gate passed; desktop, 390 px narrow-layout, and reduced-motion browser QA passed. Narrow-screen readability estimates remain visible as authoring warnings.
