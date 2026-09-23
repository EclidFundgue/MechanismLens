import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { compileContent, compileSourceBundle } from "../skills/mechanism-lens/assets/project-template/engine/compiler/index.mjs";
import { validateSceneGraph, validateSource } from "../skills/mechanism-lens/assets/project-template/engine/validation/index.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const exampleRoot = join(repositoryRoot, "skills/mechanism-lens/references/examples/oawam-address-routing");
const templateRoot = join(repositoryRoot, "skills/mechanism-lens/assets/project-template");
const read = (file) => JSON.parse(readFileSync(file, "utf8"));

test("complete OA-WAM Paper Lens example validates and compiles with evidence bindings", () => {
  const paper = read(join(exampleRoot, "paper-ir.json"));
  const mechanism = read(join(exampleRoot, "mechanism-ir.json"));
  const intent = read(join(exampleRoot, "visual-intent.json"));
  const catalog = read(join(templateRoot, "templates/catalog.json"));
  const source = { paper, code: null, mechanism, intent, catalog };

  const sourceReport = validateSource(source);
  assert.deepEqual(sourceReport.errors, []);
  assert.deepEqual(sourceReport.warnings, []);
  const scene = compileContent(mechanism, intent, catalog);
  const sceneReport = validateSceneGraph(scene);
  assert.deepEqual(sceneReport.errors, []);
  assert.deepEqual(sceneReport.warnings, []);
  assert.equal(scene.scenes.length, 8);
  assert.equal(scene.scenes.reduce((count, item) => count + item.steps.length, 0), 14);
  for (const item of scene.scenes) for (const step of item.steps) {
    assert.ok(step.mechanismStepIds.length > 0, `${item.id}/${step.id} needs a mechanism step`);
    assert.ok(step.evidenceIds.length > 0, `${item.id}/${step.id} needs source evidence`);
  }

  const bundle = compileSourceBundle(source, mechanism, scene);
  assert.equal(bundle.sources.length, 1);
  assert.equal(bundle.sources[0].kind, "paper");
  assert.ok(bundle.evidence.length >= 7);
  assert.ok(bundle.evidence.every((item) => item.id.startsWith("paper.oawam::")));

  assert.equal(existsSync(join(exampleRoot, "analysis.md")), true);
  assert.equal(existsSync(join(exampleRoot, "teaching-plan.md")), true);
  assert.equal(existsSync(join(exampleRoot, "sources/paper-excerpts.md")), true);
  assert.equal(existsSync(join(exampleRoot, "scene-ir.json")), false, "derived scene data should not be hand-authored in the example");
});
