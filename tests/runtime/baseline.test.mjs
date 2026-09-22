import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { compileContent, compileSourceBundle } from "../../skills/mechanism-lens/assets/project-template/engine/compiler/index.mjs";
import { validateSceneGraph, validateSource } from "../../skills/mechanism-lens/assets/project-template/engine/validation/index.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const templateRoot = join(repositoryRoot, "skills/mechanism-lens/assets/project-template");
const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const paper = read(join(templateRoot, "content/paper-ir.json"));
const mechanism = read(join(templateRoot, "content/mechanism-ir.json"));
const intent = read(join(templateRoot, "content/visual-intent.json"));
const catalog = read(join(templateRoot, "templates/catalog.json"));
const source = { paper, code: null, mechanism, intent, catalog };

function forbiddenKeys(value, hits = []) {
  if (!value || typeof value !== "object") return hits;
  for (const [key, child] of Object.entries(value)) {
    if (["schemaVersion", "compilerVersion", "templateCatalogVersion", "sourceHash", "fileHash", "contentHash", "commit", "branch", "snapshotId", "dirty"].includes(key)) hits.push(key);
    forbiddenKeys(child, hits);
  }
  return hits;
}

test("paper content compiles through Mechanism IR into one scene graph contract", () => {
  assert.deepEqual(validateSource(source).errors, []);
  const scene = compileContent(mechanism, intent, catalog);
  assert.deepEqual(validateSceneGraph(scene).errors, []);
  assert.equal(scene.subjectId, mechanism.id);
  assert.equal(scene.scenes.length, 9);
  assert.equal(scene.scenes.reduce((sum, item) => sum + item.steps.length, 0), 16);
  assert.deepEqual(new Set(scene.scenes.map((item) => item.contentKind)), new Set(["concept", "architecture", "equation", "algorithm", "experiment", "figure"]));
  assert.deepEqual(forbiddenKeys({ paper, mechanism, intent, catalog, scene }), []);
});

test("compiler output is deterministic and expands steps with mechanism and evidence bindings", () => {
  const first = compileContent(mechanism, intent, catalog);
  const second = compileContent(structuredClone(mechanism), structuredClone(intent), structuredClone(catalog));
  assert.deepEqual(second, first);
  for (const scene of first.scenes) for (const step of scene.steps) {
    assert.ok(step.mechanismStepIds.length > 0);
    assert.ok(step.evidenceIds.length > 0);
    assert.ok(Array.isArray(step.visual.visibleIds));
    assert.ok(Array.isArray(step.visual.emphasisIds));
    assert.ok(step.camera.bounds.width > 0);
    assert.equal(typeof step.camera.frameId, "string");
  }
});

test("source bundle contains only evidence used by compiled scenes", () => {
  const scene = compileContent(mechanism, intent, catalog);
  const bundle = compileSourceBundle(source, mechanism, scene);
  assert.equal(bundle.subject.id, mechanism.id);
  assert.equal(bundle.sources.length, 1);
  assert.ok(bundle.evidence.length > 0);
  assert.ok(bundle.evidence.every((item) => item.id.startsWith("paper.demo::")));
  const used = new Set(scene.scenes.flatMap((item) => item.evidenceIds));
  assert.ok(bundle.evidence.every((item) => used.has(item.id)));
});

test("changing emphasis inside one frame does not change camera bounds", () => {
  const scene = compileContent(mechanism, intent, catalog);
  for (const item of scene.scenes.filter((candidate) => candidate.id !== "scene.figure")) {
    const first = item.steps[0].camera.bounds;
    for (const step of item.steps) assert.deepEqual(step.camera.bounds, first, `${item.id}/${step.id}`);
  }
});

test("Code Lens compiles source evidence into Code Spotlight bindings", () => {
  const exampleRoot = join(repositoryRoot, "examples/code-cache-walkthrough");
  const code = read(join(exampleRoot, "code-ir.json"));
  const codeMechanism = read(join(exampleRoot, "mechanism-ir.json"));
  const codeIntent = read(join(exampleRoot, "visual-intent.json"));
  const codeSource = { paper: null, code, mechanism: codeMechanism, intent: codeIntent, catalog };
  assert.deepEqual(validateSource(codeSource).errors, []);
  const scene = compileContent(codeMechanism, codeIntent, catalog);
  assert.deepEqual(validateSceneGraph(scene).errors, []);
  const bundle = compileSourceBundle(codeSource, codeMechanism, scene);
  assert.equal(bundle.sources[0].kind, "code");
  assert.ok(bundle.evidence.every((item) => item.kind === "code"));
  assert.ok(scene.scenes[0].steps.every((step) => step.evidenceIds.length > 0));
});
