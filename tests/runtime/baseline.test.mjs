import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { readFileSync } from "node:fs";
import { validateData } from "../../skills/paper-explainer/assets/project-template/runtime/validation/index.mjs";

const testsRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(testsRoot, "../..");
const validator = join(repositoryRoot, "skills/paper-explainer/assets/project-template/runtime/validate-data.mjs");
const fixtures = join(testsRoot, "fixtures");

function validate(name) {
  return spawnSync(process.execPath, [validator, join(fixtures, name)], { encoding: "utf8" });
}

test("baseline fixture covers all six runtime scene types", () => {
  const result = validate("baseline");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /6 scenes \/ 6 steps/);
});

test("legacy fixtures remain valid without visual snapshots or metrics", () => {
  const result = validate("legacy");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /3 scenes \/ 3 steps/);
});

test("existing hidden-focus validation remains a hard error", () => {
  const result = validate("invalid");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /focus part\.focus is hidden/);
});

test("pure validation returns structured issues without CLI side effects", () => {
  const paper = JSON.parse(readFileSync(join(fixtures, "invalid", "paper-ir.json"), "utf8"));
  const sceneIR = JSON.parse(readFileSync(join(fixtures, "invalid", "scene-ir.json"), "utf8"));
  const report = validateData(paper, sceneIR);
  assert.deepEqual(report.warnings, []);
  assert.equal(report.errors.length, 1);
  assert.deepEqual(report.errors[0], {
    code: "FOCUS_HIDDEN",
    path: "/scenes/0/steps/0/focusIds/0",
    message: "scene.scene.equation.step.step.hidden.focus part.focus is hidden",
    sceneId: "scene.equation",
    stepId: "step.hidden",
  });
});
