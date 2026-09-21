import test from 'node:test';
import assert from 'node:assert/strict';
import {
  architectureLayout,
  comparisonDelta,
  comparisonDomain,
  edgeEndpoints,
  regionViewBox,
  resolveRegionId,
  visibleIds,
} from '../skills/paper-explainer/assets/project-template/project/src/components/renderer-model.ts';

test('connects diagram edges at node boundaries', () => {
  assert.deepEqual(
    edgeEndpoints({ x: 20, y: 100, width: 180, height: 100 }, { x: 350, y: 100, width: 180, height: 100 }),
    { x1: 200, y1: 150, x2: 350, y2: 150 },
  );
});

test('keeps one zero-based scale and respects lower-is-better metrics', () => {
  assert.deepEqual(comparisonDomain([-4, -2, 1]), [-4, 1]);
  assert.deepEqual(comparisonDomain([0, 0]), [0, 1]);
  assert.deepEqual(comparisonDelta(-4, -2, 'lower', 2), { delta: -2, outcome: 'better' });
  assert.deepEqual(comparisonDelta(1, -2, 'lower', 2), { delta: 3, outcome: 'worse' });
  assert.deepEqual(comparisonDelta(62, 62, 'higher', 1), { delta: 0, outcome: 'equal' });
});

test('maps normalized figure regions to source-image coordinates', () => {
  assert.equal(regionViewBox({ x: .06, y: .15, width: .38, height: .65 }, 800, 480), '48 72 304 312');
  assert.equal(regionViewBox(undefined, 800, 480), '0 0 800 480');
});

test('keeps the default five-node architecture inside the canvas', () => {
  const nodes = architectureLayout(['a', 'b', 'c', 'd', 'e'].map((id) => ({ id })));
  assert.equal(nodes.length, 5);
  for (const node of nodes) {
    assert.ok(node.x >= 0 && node.y >= 0);
    assert.ok(node.x + node.width <= 960);
    assert.ok(node.y + node.height <= 480);
  }
});

test('distinguishes omitted and explicitly empty visibility lists', () => {
  assert.deepEqual([...visibleIds(undefined, ['a', 'b'])], ['a', 'b']);
  assert.deepEqual([...visibleIds([], ['a', 'b'])], []);
});

test('distinguishes inferred, full-image, and explicit figure regions', () => {
  const known = new Set(['region.a', 'region.b']);
  assert.equal(resolveRegionId(undefined, ['line.x', 'region.b'], known), 'region.b');
  assert.equal(resolveRegionId(null, ['region.b'], known), undefined);
  assert.equal(resolveRegionId('region.a', ['region.b'], known), 'region.a');
});
