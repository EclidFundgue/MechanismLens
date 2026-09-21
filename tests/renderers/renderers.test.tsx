import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SceneRenderer, defineScene, getNarrations, rendererRegistry } from '../../skills/paper-explainer/assets/renderers';
import { comparisonDelta, comparisonDomain, edgeEndpoints, regionViewBox, stepIndex } from '../../skills/paper-explainer/assets/renderers/model';
import { exampleScenes } from '../../skills/paper-explainer/assets/renderers/examples';
import type { Scene } from '../../skills/paper-explainer/assets/renderers';

function sample<K extends Scene['kind']>(kind: K): Extract<Scene, { kind: K }> {
  return structuredClone(exampleScenes.find((s) => s.kind === kind)) as Extract<Scene, { kind: K }>;
}
function render(scene: Scene, step: number) { return renderToStaticMarkup(<SceneRenderer scene={scene} step={step} />); }

describe('renderer chapters', () => {
  it('registers all five renderers and renders every authored step', () => {
    expect(Object.keys(rendererRegistry)).toHaveLength(5);
    for (const scene of exampleScenes) {
      defineScene(scene);
      expect(getNarrations(scene)).toHaveLength(scene.steps.length);
      scene.steps.forEach((beat, step) => {
        const html = render(scene, step);
        expect(html).toContain(`data-renderer="${scene.kind}"`);
        expect(html).toContain(beat.explanation);
        expect(html).not.toContain('role="alert"');
        expect(html).not.toContain('NaN');
      });
    }
  });
  it('returns to exactly the same visual state after seeking backward', () => {
    for (const scene of exampleScenes) {
      const first = render(scene, 0);
      render(scene, scene.steps.length - 1);
      expect(render(scene, 0)).toBe(first);
      expect(render(scene, -5)).toBe(first);
      expect(render(scene, 999)).toBe(render(scene, scene.steps.length - 1));
    }
    expect(stepIndex(NaN, 3)).toBe(0);
    expect(stepIndex(Infinity, 3)).toBe(0);
    expect(stepIndex(1.9, 3)).toBe(1);
  });
  it('rejects empty scenes, duplicate identifiers and references to invisible nodes', () => {
    const scene = sample('architecture_execution');
    expect(() => defineScene({ ...scene, steps: [] })).toThrow('at least one step');
    expect(() => defineScene({ ...scene, nodes: [...scene.nodes, scene.nodes[0]] })).toThrow('duplicate id');
    scene.steps[0].activeNodeIds = ['answer'];
    expect(() => defineScene(scene)).toThrow('invisible id');
    scene.steps[0].activeNodeIds = ['query'];
    scene.steps[0].activeEdgeIds = ['q-r'];
    expect(() => defineScene(scene)).toThrow('active edge endpoints');
  });
  it('reveals architecture cumulatively and clips arrows at rectangle borders', () => {
    const scene = sample('architecture_execution');
    expect(render(scene, 0)).not.toContain('data-node="answer"');
    expect(render(scene, 2)).toContain('data-node="answer" data-active="true"');
    const points = edgeEndpoints(scene.nodes[0], scene.nodes[1]);
    expect(points).toEqual({ x1: 200, y1: 220, x2: 310, y2: 220 });
  });
  it('renders mathematical notation with accessible MathML and escapes invalid input', () => {
    const scene = sample('equation_walkthrough');
    expect(render(scene, 0)).toContain('<math');
    scene.steps[0].tex = '\\notACommand{<script>alert(1)</script>}';
    const html = render(scene, 0);
    expect(html).toContain('role="alert"');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
  it('does not preserve LaTeX macros across steps or trust active HTML commands', () => {
    const scene = sample('equation_walkthrough');
    scene.macros = {};
    scene.steps[0].tex = '\\gdef\\foo{123}\\foo';
    render(scene, 0);
    expect(scene.macros).toEqual({});
    scene.steps[1].tex = '\\foo';
    expect(render(scene, 1)).toContain('role="alert"');
    scene.steps[0].tex = '\\href{javascript:alert(1)}{unsafe}';
    expect(render(scene, 0)).not.toContain('href="javascript:');
  });
  it('restores algorithm snapshots, including a repeated code line and falsy values', () => {
    const scene = sample('algorithm_trace');
    expect(render(scene, 2)).toContain('data-line="add" data-active="true"');
    expect(render(scene, 2)).toContain('<dd>6</dd>');
    expect(render(scene, 1)).toContain('<dd>2</dd>');
    expect(render(scene, 0)).not.toContain('data-variable="x"');
    scene.steps[0].variables = { total: 0, done: false };
    expect(render(scene, 0)).toContain('<dd>false</dd>');
    scene.steps[0].activeLineIds = ['missing'];
    expect(() => defineScene(scene)).toThrow('unknown');
  });
  it('uses a shared zero-containing scale and correct signs for negative/lower-is-better metrics', () => {
    const scene = sample('ablation_comparison');
    scene.metric = { label: 'loss', unit: '', direction: 'lower', decimals: 2 };
    scene.variants[0].value = -2; scene.variants[1].value = -4; scene.variants[2].value = 1;
    expect(comparisonDomain(scene)).toEqual([-4, 1]);
    expect(comparisonDelta(scene, -4)).toEqual({ delta: -2, outcome: 'better' });
    expect(comparisonDelta(scene, 1)).toEqual({ delta: 3, outcome: 'worse' });
    expect(render(defineScene(scene), 2)).toContain('+3.00');
    scene.variants.forEach((v) => { v.value = 0; });
    expect(comparisonDomain(scene)).toEqual([0, 1]);
    expect(render(scene, 2)).not.toMatch(/NaN|Infinity/);
    scene.variants[0].value = NaN;
    expect(() => defineScene(scene)).toThrow('finite');
  });
  it('requires a visible baseline and distinguishes absolute differences from relative changes', () => {
    const scene = sample('ablation_comparison');
    expect(comparisonDelta(scene, 78)).toEqual({ delta: 8, outcome: 'better' });
    expect(render(scene, 2)).toContain('差值单位：百分点');
    scene.steps[1].visibleVariantIds = ['retrieval'];
    expect(() => defineScene(scene)).toThrow('baseline');
  });
  it('maps normalized source-image coordinates exactly and rejects out-of-image regions', () => {
    const scene = sample('figure_inspector');
    expect(regionViewBox(scene.regions[0], 800, 480)).toBe('48 72 304 312');
    expect(render(scene, 1)).toContain('viewBox="48 72 304 312"');
    expect(render(scene, 1)).toMatch(/<clipPath[^>]*><rect x="48" y="72" width="304" height="312"/);
    expect(render(scene, 0)).not.toContain('data-region=');
    scene.regions[0].width = 2;
    expect(() => defineScene(scene)).toThrow('inside the image');
    scene.regions[0].width = .38;
    scene.image.src = 'javascript:alert(1)';
    expect(() => defineScene(scene)).toThrow('local path or HTTPS');
  });
});
