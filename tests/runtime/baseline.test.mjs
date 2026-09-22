import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { compileContent } from "../../skills/mechanism-lens/assets/project-template/engine/compiler/index.mjs";
import { validateSceneGraph, validateSource } from "../../skills/mechanism-lens/assets/project-template/engine/validation/index.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const templateRoot = join(repositoryRoot, "skills/mechanism-lens/assets/project-template");
const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const paper = read(join(templateRoot, "content/paper-ir.json"));
const intent = read(join(templateRoot, "content/visual-intent.json"));
const catalog = read(join(templateRoot, "templates/catalog.json"));

test("v2.1 source compiles all six content kinds into one scene graph contract", () => {
  assert.deepEqual(validateSource(paper, intent, catalog).errors, []);
  const scene = compileContent(paper, intent, catalog);
  assert.deepEqual(validateSceneGraph(scene).errors, []);
  assert.equal(scene.scenes.length, 9);
  assert.equal(scene.scenes.reduce((sum, item) => sum + item.steps.length, 0), 16);
  assert.equal(scene.schemaVersion, "2.1");
  assert.deepEqual(new Set(scene.scenes.map((item) => item.contentKind)), new Set(["concept", "architecture", "equation", "algorithm", "experiment", "figure"]));
});

test("compiler output is deterministic and expands every step into a full target snapshot", () => {
  const first = compileContent(paper, intent, catalog);
  const second = compileContent(structuredClone(paper), structuredClone(intent), structuredClone(catalog));
  assert.deepEqual(second, first);
  for (const scene of first.scenes) for (const step of scene.steps) {
    assert.ok(Array.isArray(step.visual.visibleIds));
    assert.ok(Array.isArray(step.visual.emphasisIds));
    assert.ok(Array.isArray(step.visual.requiredReadableIds));
    assert.ok(step.camera.bounds.width > 0);
    assert.equal(typeof step.camera.frameId, "string");
  }
});

test("changing emphasis inside one frame does not change camera bounds", () => {
  const scene = compileContent(paper, intent, catalog);
  for (const item of scene.scenes.filter((candidate) => candidate.id !== "scene.figure")) {
    const first = item.steps[0].camera.bounds;
    for (const step of item.steps) assert.deepEqual(step.camera.bounds, first, `${item.id}/${step.id}`);
  }
});

test("legacy v2.0 focus semantics remain available without silent reinterpretation", () => {
  const legacy = structuredClone(intent);
  legacy.schemaVersion = "2.0";
  for (const world of legacy.worlds) delete world.frames;
  for (const scene of legacy.scenes) {
    delete scene.presentation;
    for (const step of scene.steps) {
      delete step.frameId;
      step.focusIds = [...(step.emphasisIds ?? [])];
      step.viewMode = step.focusIds.length > 0 ? "focus" : "overview";
    }
  }
  assert.deepEqual(validateSource(paper, legacy, catalog).errors, []);
  const compiled = compileContent(paper, legacy, catalog);
  assert.equal(compiled.schemaVersion, "2.0");
  assert.deepEqual(compiled.scenes[0].steps[0].camera.targetIds, ["card.problem"]);
});

test("v1 inputs fail with an explicit version error", () => {
  const legacyPaper = { ...paper, schemaVersion: "1.0" };
  const legacyIntent = { ...intent, schemaVersion: "1.0" };
  const report = validateSource(legacyPaper, legacyIntent, catalog);
  assert.equal(report.errors.filter((item) => item.code === "UNSUPPORTED_SCHEMA_VERSION").length, 2);
});
