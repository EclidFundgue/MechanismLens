# Runtime and delivery

The generated project is self-contained:

```text
content/      source IR, Mechanism IR, Visual Intent, generated Scene IR and source bundle
sources/      original papers and retained URL repositories
engine/       compiler, layout and validation
project/      React/Vite player
runtime/      compile, validate and serve commands
site/         built offline website
```

Build with:

```bash
node "$SELF/scripts/build-project.mjs" "<generated-project>"
```

The build validates source IR, Mechanism IR and Visual Intent, compiles Scene IR and `source-bundle.json`, validates geometry and references, then runs TypeScript and Vite.

Scene IR and the source bundle are generated. Never edit them to hide a problem in source facts, mechanism reasoning or visual intent.

Verify every scene and step by sequential playback and direct navigation. Confirm subtitles, evidence, Code Spotlight, detail panels, reduced motion and narrow layout. A direct jump must restore the same complete target state as sequential playback.

Only selected code evidence excerpts enter `site/`. A cloned repository stays under `sources/code/repository/`, including its shallow `.git`, and must not be copied into public assets.

Delivery includes `site/index.html`, launchers, editable content, engine, runtime and sources. Confirm that the complete generated directory can be moved and still built and opened. Stop any development server or recorder started during generation.
