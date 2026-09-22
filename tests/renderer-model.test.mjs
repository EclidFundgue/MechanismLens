import test from "node:test";
import assert from "node:assert/strict";
import { boundsNearlyEqual, comparisonDelta, comparisonDomain, easeInOutCubic, interpolateBounds } from "../skills/mechanism-lens/assets/project-template/project/src/stage/model.ts";
import { layoutWorld, targetBounds } from "../skills/mechanism-lens/assets/project-template/engine/compiler/layout.mjs";

test("keeps one zero-based scale and respects lower-is-better metrics", () => {
  assert.deepEqual(comparisonDomain([-4, -2, 1]), [-4, 1]);
  assert.deepEqual(comparisonDomain([0, 0]), [0, 1]);
  assert.deepEqual(comparisonDelta(-4, -2, "lower", 2), { delta: -2, outcome: "better" });
  assert.deepEqual(comparisonDelta(1, -2, "lower", 2), { delta: 3, outcome: "worse" });
});

test("interpolates camera bounds without overshooting", () => {
  assert.deepEqual(interpolateBounds({ x: 0, y: 20, width: 100, height: 60 }, { x: 40, y: 0, width: 20, height: 100 }, .25), { x: 10, y: 15, width: 80, height: 70 });
  assert.equal(easeInOutCubic(0), 0);
  assert.equal(easeInOutCubic(1), 1);
});

test("treats numerically identical camera targets as a no-op", () => {
  const target = { x: 10, y: 20, width: 300, height: 180 };
  assert.equal(boundsNearlyEqual(target, { ...target }), true);
  assert.equal(boundsNearlyEqual(target, { ...target, x: 10.005 }), true);
  assert.equal(boundsNearlyEqual(target, { ...target, x: 11 }), false);
});

test("lays out nested groups once and derives focus bounds from the same world", () => {
  const world = layoutWorld({
    id: "world.test", templateId: "grouped_overview", objects: [
      { id: "group.encoder", kind: "group", label: "Encoder" },
      { id: "node.a", kind: "node", parentId: "group.encoder" },
      { id: "node.b", kind: "node", parentId: "group.encoder" },
      { id: "node.output", kind: "node" },
    ], relations: [{ id: "edge.output", from: "node.b", to: "node.output" }],
  });
  const group = world.objects.find((item) => item.id === "group.encoder");
  const child = world.objects.find((item) => item.id === "node.a");
  assert.ok(child.x >= group.x && child.y >= group.y);
  assert.ok(child.x + child.width <= group.x + group.width);
  assert.equal(world.relations.length, 1);
  assert.match(world.relations[0].path, /^M /);
  const focus = targetBounds(world, ["group.encoder"], "tight");
  assert.ok(focus.width < world.bounds.width);
});

test("creates stable anchors for equation parts, code lines, chart items, and image regions", () => {
  const fixtures = [
    { id: "eq", kind: "equation", tex: "x", parts: [{ id: "term.x", tex: "x" }] },
    { id: "code", kind: "code", lines: [{ id: "line.x", code: "x" }] },
    { id: "chart", kind: "chart", items: [{ id: "bar.x", value: 1 }] },
    { id: "image", kind: "image", regions: [{ id: "region.x", x: .1, y: .2, width: .3, height: .4 }] },
  ];
  for (const object of fixtures) {
    const world = layoutWorld({ id: `world.${object.id}`, templateId: "single", objects: [object], relations: [] });
    assert.equal(world.anchors.length, 1, object.id);
    assert.ok(world.anchors[0].bounds.width > 0, object.id);
  }
});

test("contextual anchor focus keeps its owner while tight focus isolates the anchor", () => {
  const world = layoutWorld({ id: "world.eq", templateId: "equation_derivation", objects: [{ id: "eq", kind: "equation", tex: "x+y", parts: [{ id: "term.x", tex: "x" }, { id: "term.y", tex: "y" }] }], relations: [] });
  const contextual = targetBounds(world, ["term.x"], "contextual");
  const tight = targetBounds(world, ["term.x"], "tight");
  assert.ok(contextual.height > tight.height);
  assert.ok(contextual.width > tight.width);
});

test("places parallel branch inputs in one layer before their merge", () => {
  const world = layoutWorld({
    id: "world.branch", templateId: "branch_merge_pipeline",
    objects: [
      { id: "node.a", kind: "node" }, { id: "node.b", kind: "node" }, { id: "node.merge", kind: "node" },
    ],
    relations: [
      { id: "edge.a", from: "node.a", to: "node.merge" }, { id: "edge.b", from: "node.b", to: "node.merge" },
    ],
  });
  const a = world.objects.find((item) => item.id === "node.a");
  const b = world.objects.find((item) => item.id === "node.b");
  const merge = world.objects.find((item) => item.id === "node.merge");
  assert.equal(a.x, b.x);
  assert.notEqual(a.y, b.y);
  assert.ok(merge.x > a.x);
});
