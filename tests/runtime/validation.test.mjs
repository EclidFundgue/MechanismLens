import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { validateData } from "../../skills/paper-explainer/assets/project-template/runtime/validation/index.mjs";

const testsRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = join(testsRoot, "../..");
const fixtures = join(testsRoot, "fixtures", "baseline");
const baselinePaper = JSON.parse(readFileSync(join(fixtures, "paper-ir.json"), "utf8"));
const baselineSceneIR = JSON.parse(readFileSync(join(fixtures, "scene-ir.json"), "utf8"));
const clone = (value) => structuredClone(value);

function codes(report) {
  return report.errors.map((issue) => issue.code);
}

test("malformed containers produce issues instead of validator exceptions", () => {
  const paper = clone(baselinePaper);
  const sceneIR = clone(baselineSceneIR);
  paper.evidence = null;
  sceneIR.scenes[0].payload = null;
  sceneIR.scenes[1].steps = { bad: true };
  sceneIR.scenes[2].steps[0].visual.visiblePartIds = "part.x";

  const report = validateData(paper, sceneIR);
  assert.ok(codes(report).includes("EXPECTED_ARRAY"));
  assert.ok(codes(report).includes("EXPECTED_OBJECT"));
  assert.ok(codes(report).includes("EXPECTED_ID_ARRAY"));
});

test("duplicate and mistyped references are reported without being normalized", () => {
  const sceneIR = clone(baselineSceneIR);
  sceneIR.scenes[0].steps[0].focusIds = ["point.one", "point.one", 7, "point.missing"];
  const report = validateData(clone(baselinePaper), sceneIR);
  assert.ok(codes(report).includes("DUPLICATE_REFERENCE"));
  assert.ok(codes(report).includes("INVALID_ID"));
  assert.ok(codes(report).includes("MISSING_REFERENCE"));
});

test("runtime2 step.state is rejected with a targeted visual migration message", () => {
  const sceneIR = clone(baselineSceneIR);
  sceneIR.scenes[0].steps[0].state = { visiblePointIds: ["point.one"] };
  const report = validateData(clone(baselinePaper), sceneIR);
  const issue = report.errors.find((item) => item.code === "UNSUPPORTED_STEP_STATE");
  assert.equal(issue.path, "/scenes/0/steps/0/state");
  assert.match(issue.message, /use visual instead/);
});

test("derived edge ids and legacy omissions remain valid", () => {
  const report = validateData(clone(baselinePaper), clone(baselineSceneIR));
  assert.deepEqual(report.errors, []);
});

test("explicit empty visibility still participates in focus and baseline checks", () => {
  const sceneIR = clone(baselineSceneIR);
  sceneIR.scenes[1].steps[0].visual.visibleNodeIds = [];
  sceneIR.scenes[4].steps[0].visual.visibleItemIds = [];
  const report = validateData(clone(baselinePaper), sceneIR);
  assert.ok(report.errors.some((issue) => issue.code === "FOCUS_HIDDEN" && issue.sceneId === "scene.architecture"));
  assert.ok(report.errors.some((issue) => issue.code === "BASELINE_HIDDEN" && issue.sceneId === "scene.comparison"));
});

test("figure regions and variable snapshots enforce finite typed values", () => {
  const sceneIR = clone(baselineSceneIR);
  sceneIR.scenes[3].steps[0].visual.variables = [];
  sceneIR.scenes[5].payload.regions[0].width = 1.2;
  const report = validateData(clone(baselinePaper), sceneIR);
  assert.ok(codes(report).includes("EXPECTED_OBJECT"));
  assert.ok(codes(report).includes("INVALID_REGION"));
});

test("content-quality and layout-limit guidance stays non-blocking", () => {
  const sceneIR = clone(baselineSceneIR);
  const comparison = sceneIR.scenes[4];
  comparison.payload.items = Array.from({ length: 8 }, (_, index) => ({ id: `item.${index}`, value: index }));
  comparison.payload.baselineId = "item.0";
  comparison.steps[0].focusIds = ["item.7"];
  comparison.steps[0].visual.visibleItemIds = comparison.payload.items.map((item) => item.id);
  const report = validateData(clone(baselinePaper), sceneIR);
  assert.deepEqual(report.errors, []);
  assert.ok(report.warnings.some((issue) => issue.code === "DENSE_COMPARISON"));
  assert.ok(report.warnings.some((issue) => issue.code === "MISSING_DISPLAY_TEXT"));
});

test("Scene IR schema targets state and accepts derived edge references", () => {
  const schema = JSON.parse(readFileSync(join(repositoryRoot, "skills/paper-explainer/assets/project-template/schemas/scene-ir.schema.json"), "utf8"));
  assert.equal(schema.$defs.step.properties.state, false);
  assert.equal(schema.$defs.step.properties.visual.properties.activeEdgeIds.$ref, "#/$defs/edgeIdList");
  const derivedPattern = schema.$defs.edgeId.anyOf[1].pattern;
  assert.match("node.input->node.output", new RegExp(derivedPattern));
});
