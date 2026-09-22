import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { validateSource } from "../../skills/mechanism-lens/assets/project-template/engine/validation/index.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const templateRoot = join(repositoryRoot, "skills/mechanism-lens/assets/project-template");
const read = (name) => JSON.parse(readFileSync(join(templateRoot, name), "utf8"));
const baselinePaper = read("content/paper-ir.json");
const baselineIntent = read("content/visual-intent.json");
const catalog = read("templates/catalog.json");
const clone = structuredClone;
const codes = (report) => report.errors.map((issue) => issue.code);

test("malformed containers produce issues instead of validator exceptions", () => {
  const paper = clone(baselinePaper), intent = clone(baselineIntent);
  paper.evidence = null;
  intent.worlds[0].objects = null;
  intent.scenes[0].steps = { bad: true };
  const report = validateSource(paper, intent, catalog);
  assert.ok(codes(report).includes("EXPECTED_ARRAY"));
});

test("duplicate, missing, and hidden references are reported without normalization", () => {
  const intent = clone(baselineIntent);
  const step = intent.scenes[0].steps[0];
  step.focusIds = ["card.problem", "card.problem", "card.missing"];
  step.visibleIds = [];
  const report = validateSource(clone(baselinePaper), intent, catalog);
  assert.ok(codes(report).includes("DUPLICATE_REFERENCE"));
  assert.ok(codes(report).includes("MISSING_REFERENCE"));
  assert.ok(codes(report).includes("FOCUS_HIDDEN"));
});

test("parent cycles, invalid template slots, and missing relation endpoints are hard errors", () => {
  const intent = clone(baselineIntent);
  const world = intent.worlds.find((item) => item.id === "world.encoder-local");
  world.objects.push({ id: "group.a", kind: "group", parentId: "group.b" }, { id: "group.b", kind: "group", parentId: "group.a" });
  world.objects[0].parentId = "encoder.embed";
  world.relations[0].to = "node.missing";
  const report = validateSource(clone(baselinePaper), intent, catalog);
  assert.ok(codes(report).includes("INVALID_PARENT"));
  assert.ok(codes(report).includes("PARENT_CYCLE"));
  assert.ok(codes(report).includes("MISSING_REFERENCE"));
});

test("chart snapshots keep the baseline visible and image regions stay normalized", () => {
  const intent = clone(baselineIntent);
  intent.scenes.find((item) => item.id === "scene.ablation").steps[0].state.visibleItems["chart.ablation"] = [];
  intent.worlds.find((item) => item.id === "world.figure").objects[0].regions[0].width = 1.2;
  const report = validateSource(clone(baselinePaper), intent, catalog);
  assert.ok(codes(report).includes("BASELINE_HIDDEN"));
  assert.ok(codes(report).includes("INVALID_REGION"));
});

test("step-readable chart items must be visible in that step", () => {
  const intent = clone(baselineIntent);
  const step = intent.scenes.find((item) => item.id === "scene.ablation").steps[0];
  step.requiredReadableIds = ["bar.baseline", "bar.full"];
  const report = validateSource(clone(baselinePaper), intent, catalog);
  assert.ok(codes(report).includes("REQUIRED_CONTENT_HIDDEN"));
});

test("dense chart guidance remains a warning", () => {
  const intent = clone(baselineIntent);
  const chart = intent.worlds.find((item) => item.id === "world.ablation").objects[0];
  chart.items = Array.from({ length: 8 }, (_, index) => ({ id: `bar.${index}`, label: String(index), value: index }));
  chart.baselineId = "bar.0";
  intent.worlds.find((item) => item.id === "world.ablation").frames[0].requiredReadableIds = chart.items.map((item) => item.id);
  const scene = intent.scenes.find((item) => item.id === "scene.ablation");
  scene.steps = [{ id: "step.dense", narration: "dense", frameId: "frame.ablation", emphasisIds: ["bar.7"], state: { visibleItems: { "chart.ablation": chart.items.map((item) => item.id) } } }];
  const report = validateSource(clone(baselinePaper), intent, catalog);
  assert.deepEqual(report.errors, []);
  assert.ok(report.warnings.some((issue) => issue.code === "DENSE_COMPARISON"));
});

test("v2.1 frames require valid references and reasons for non-default camera changes", () => {
  const intent = clone(baselineIntent);
  const world = intent.worlds.find((item) => item.id === "world.overview");
  world.frames.push({ id: "frame.bad", targetIds: ["card.missing"], mode: "fit", requiredReadableIds: ["card.missing"] });
  intent.scenes[0].steps[1].frameId = "frame.bad";
  const report = validateSource(clone(baselinePaper), intent, catalog);
  assert.ok(codes(report).includes("MISSING_REFERENCE"));
  assert.ok(codes(report).includes("CAMERA_REASON_REQUIRED"));
});

test("v2.1 rejects legacy camera fields instead of changing their meaning", () => {
  const intent = clone(baselineIntent);
  intent.scenes[0].steps[0].focusIds = ["card.problem"];
  const report = validateSource(clone(baselinePaper), intent, catalog);
  assert.ok(codes(report).includes("LEGACY_CAMERA_FIELDS"));
});

test("schemas describe separate source intent and generated scene contracts", () => {
  const paperSchema = read("schemas/paper-ir.schema.json");
  const intentSchema = read("schemas/visual-intent.schema.json");
  const sceneSchema = read("schemas/scene-ir.schema.json");
  assert.equal(paperSchema.properties.schemaVersion.const, "2.0");
  assert.deepEqual(intentSchema.properties.schemaVersion.enum, ["2.0", "2.1"]);
  assert.match(sceneSchema.description, /Generated/);
  assert.ok(sceneSchema.properties.build);
});
