import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { compileContent } from "../../skills/paper-explainer/assets/project-template/engine/compiler/index.mjs";
import { validateSceneGraph, validateSource } from "../../skills/paper-explainer/assets/project-template/engine/validation/index.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const templateRoot = join(repositoryRoot, "skills/paper-explainer/assets/project-template");
const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const paper = read(join(templateRoot, "content/paper-ir.json"));
const intent = read(join(templateRoot, "content/visual-intent.json"));
const catalog = read(join(templateRoot, "templates/catalog.json"));

test("v2 source compiles all six content kinds into one scene graph contract", () => {
  assert.deepEqual(validateSource(paper, intent, catalog).errors, []);
  const scene = compileContent(paper, intent, catalog);
  assert.deepEqual(validateSceneGraph(scene).errors, []);
  assert.equal(scene.scenes.length, 6);
  assert.equal(scene.scenes.reduce((sum, item) => sum + item.steps.length, 0), 16);
  assert.deepEqual(new Set(scene.scenes.map((item) => item.contentKind)), new Set(["concept", "architecture", "equation", "algorithm", "experiment", "figure"]));
});

test("compiler output is deterministic and expands every step into a full target snapshot", () => {
  const first = compileContent(paper, intent, catalog);
  const second = compileContent(structuredClone(paper), structuredClone(intent), structuredClone(catalog));
  assert.deepEqual(second, first);
  for (const scene of first.scenes) for (const step of scene.steps) {
    assert.ok(Array.isArray(step.visual.visibleIds));
    assert.ok(Array.isArray(step.visual.emphasisIds));
    assert.ok(step.camera.bounds.width > 0);
  }
});

test("v1 inputs fail with an explicit version error", () => {
  const legacyPaper = { ...paper, schemaVersion: "1.0" };
  const legacyIntent = { ...intent, schemaVersion: "1.0" };
  const report = validateSource(legacyPaper, legacyIntent, catalog);
  assert.equal(report.errors.filter((item) => item.code === "UNSUPPORTED_SCHEMA_VERSION").length, 2);
});
