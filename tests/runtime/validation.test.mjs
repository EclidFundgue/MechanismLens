import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { validateSource } from "../../skills/mechanism-lens/assets/project-template/engine/validation/index.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const templateRoot = join(repositoryRoot, "skills/mechanism-lens/assets/project-template");
const read = (name) => JSON.parse(readFileSync(join(templateRoot, name), "utf8"));
const baseline = {
  paper: read("content/paper-ir.json"),
  code: null,
  mechanism: read("content/mechanism-ir.json"),
  intent: read("content/visual-intent.json"),
  catalog: read("templates/catalog.json"),
};
const clone = structuredClone;
const codes = (report) => report.errors.map((issue) => issue.code);

test("malformed containers produce issues instead of validator exceptions", () => {
  const source = clone(baseline);
  source.paper.evidence = null;
  source.intent.worlds[0].objects = null;
  source.intent.scenes[0].steps = { bad: true };
  assert.ok(codes(validateSource(source)).includes("EXPECTED_ARRAY"));
});
test("duplicate, missing, and hidden visual references are reported", () => {
  const source = clone(baseline);
  const step = source.intent.scenes[0].steps[0];
  step.emphasisIds = ["card.problem", "card.problem", "card.missing"];
  step.visibleIds = [];
  const report = validateSource(source);
  assert.ok(codes(report).includes("DUPLICATE_REFERENCE"));
  assert.ok(codes(report).includes("MISSING_REFERENCE"));
  assert.ok(codes(report).includes("REQUIRED_CONTENT_HIDDEN"));
});

test("parent cycles, invalid parents, and missing relation endpoints are hard errors", () => {
  const source = clone(baseline);
  const world = source.intent.worlds.find((item) => item.id === "world.encoder-local");
  world.objects.push({ id: "group.a", kind: "group", parentId: "group.b" }, { id: "group.b", kind: "group", parentId: "group.a" });
  world.objects[0].parentId = "encoder.embed";
  world.relations[0].to = "node.missing";
  const report = validateSource(source);
  assert.ok(codes(report).includes("INVALID_PARENT"));
  assert.ok(codes(report).includes("PARENT_CYCLE"));
  assert.ok(codes(report).includes("MISSING_REFERENCE"));
});

test("chart baseline and image region constraints remain enforced", () => {
  const source = clone(baseline);
  source.intent.scenes.find((item) => item.id === "scene.ablation").steps[0].state.visibleItems["chart.ablation"] = [];
  source.intent.worlds.find((item) => item.id === "world.figure").objects[0].regions[0].width = 1.2;
  const report = validateSource(source);
  assert.ok(codes(report).includes("BASELINE_HIDDEN"));
  assert.ok(codes(report).includes("INVALID_REGION"));
});

test("dense chart guidance remains a warning", () => {
  const source = clone(baseline);
  const chart = source.intent.worlds.find((item) => item.id === "world.ablation").objects[0];
  chart.items = Array.from({ length: 8 }, (_, index) => ({ id: `bar.${index}`, label: String(index), value: index }));
  chart.baselineId = "bar.0";
  source.intent.worlds.find((item) => item.id === "world.ablation").frames[0].requiredReadableIds = chart.items.map((item) => item.id);
  const scene = source.intent.scenes.find((item) => item.id === "scene.ablation");
  scene.steps = [{ id: "step.dense", narration: "dense", frameId: "frame.ablation", mechanismStepIds: ["step.baseline"], emphasisIds: ["bar.7"], state: { visibleItems: { "chart.ablation": chart.items.map((item) => item.id) } } }];
  const report = validateSource(source);
  assert.deepEqual(report.errors, []);
  assert.ok(report.warnings.some((issue) => issue.code === "DENSE_COMPARISON"));
});

test("non-default frames require valid targets and reasons", () => {
  const source = clone(baseline);
  const world = source.intent.worlds.find((item) => item.id === "world.overview");
  world.frames.push({ id: "frame.bad", targetIds: ["card.missing"], mode: "fit", requiredReadableIds: ["card.missing"] });
  source.intent.scenes[0].steps[1].frameId = "frame.bad";
  const report = validateSource(source);
  assert.ok(codes(report).includes("MISSING_REFERENCE"));
  assert.ok(codes(report).includes("CAMERA_REASON_REQUIRED"));
});

test("mechanism steps must reference existing source evidence", () => {
  const source = clone(baseline);
  source.mechanism.scenarios[0].steps[0].evidenceRefs[0].evidenceId = "evidence.missing";
  assert.ok(codes(validateSource(source)).includes("MISSING_REFERENCE"));
});

test("managed version, hash, commit, and snapshot metadata are rejected", () => {
  const source = clone(baseline);
  source.paper.schemaVersion = "anything";
  source.mechanism.sourceHash = "anything";
  source.intent.compilerVersion = "anything";
  const report = validateSource(source);
  assert.equal(codes(report).filter((code) => code === "FORBIDDEN_METADATA").length, 3);
});

test("Code IR validates entities, relations, evidence and no repository state", () => {
  const source = clone(baseline);
  source.code = {
    repository: { id: "code.cache", title: "Cache", location: "sources/code/repository", sourceType: "git" },
    question: "What happens on a cache miss?",
    scope: { focus: ["cache.py"], excluded: [".git"], limitations: ["static only"] },
    entities: [
      { id: "entity.get", kind: "function", name: "get", path: "cache.py", lineStart: 1, lineEnd: 4, evidenceIds: ["evidence.get"] },
      { id: "entity.load", kind: "function", name: "load", path: "cache.py", lineStart: 6, lineEnd: 7, evidenceIds: ["evidence.load"] },
    ],
    relations: [{ id: "relation.get-load", kind: "direct_call", from: "entity.get", to: "entity.load", evidenceIds: ["evidence.get"] }],
    entrypoints: [{ id: "entrypoint.get", entityId: "entity.get", reason: "public lookup", evidenceIds: ["evidence.get"] }],
    evidence: [
      { id: "evidence.get", label: "get", kind: "code", path: "cache.py", symbol: "get", lineStart: 1, lineEnd: 4, excerpt: "def get():\n    return load()", basis: "source_fact" },
      { id: "evidence.load", label: "load", kind: "code", path: "cache.py", symbol: "load", lineStart: 6, lineEnd: 7, excerpt: "def load():\n    return 1", basis: "source_fact" },
    ],
    unresolved: [],
  };
  source.mechanism.sources.push({ id: "code.cache", kind: "code" });
  assert.deepEqual(validateSource(source).errors, []);
  source.code.relations[0].to = "entity.missing";
  assert.ok(codes(validateSource(source)).includes("MISSING_REFERENCE"));
});

test("schemas expose current contracts without version or hash fields", () => {
  for (const name of ["paper-ir", "code-ir", "mechanism-ir", "visual-intent", "scene-ir", "source-bundle"]) {
    const schema = read(`schemas/${name}.schema.json`);
    const text = JSON.stringify(schema);
    assert.doesNotMatch(text, /schemaVersion|sourceHash|compilerVersion|templateCatalogVersion/);
  }
  assert.ok(read("schemas/visual-intent.schema.json").properties.mechanismId);
  assert.ok(read("schemas/scene-ir.schema.json").properties.subjectId);
});
