import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const templateContent = join(root, "skills/paper-explainer/assets/project-template/content");
const validator = join(root, "skills/paper-explainer/assets/project-template/runtime/validate-data.mjs");

function fixture(mutator) {
  const dir = mkdtempSync(join(tmpdir(), "paper-explainer-renderer-"));
  cpSync(templateContent, join(dir, "content"), { recursive: true });
  const path = join(dir, "content/scene-ir.json");
  const scene = JSON.parse(readFileSync(path, "utf8"));
  mutator?.(scene);
  writeFileSync(path, `${JSON.stringify(scene, null, 2)}\n`);
  return { dir, content: join(dir, "content") };
}

function validate(content) {
  return spawnSync(process.execPath, [validator, content], { encoding: "utf8" });
}

test("template scenes validate with step snapshots", () => {
  const item = fixture();
  try {
    const result = validate(item.content);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /6 scenes \/ 15 steps/);
  } finally { rmSync(item.dir, { recursive: true, force: true }); }
});

test("renderer validation rejects invisible baselines, invalid graph paths, and unsafe figure URLs", () => {
  const cases = [
    ["baseline", (scene) => { scene.scenes.find((item) => item.type === "ablation_comparison").steps[1].state.visibleItemIds = ["bar.module"]; }, /must retain its baseline/],
    ["edge", (scene) => { const architecture = scene.scenes.find((item) => item.type === "architecture_execution"); architecture.steps[0].state.activeEdgeIds = ["edge.input-core"]; }, /invisible endpoint/],
    ["url", (scene) => { scene.scenes.find((item) => item.type === "figure_inspector").payload.src = "javascript:alert(1)"; }, /local path or HTTPS URL/],
  ];
  for (const [name, mutate, expected] of cases) {
    const item = fixture(mutate);
    try {
      const result = validate(item.content);
      assert.equal(result.status, 1, `${name} should fail validation`);
      assert.match(result.stderr, expected);
    } finally { rmSync(item.dir, { recursive: true, force: true }); }
  }
});
