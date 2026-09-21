import type { AblationScene, DiagramNode, FigureRegion, Scene } from './types';

export function stepIndex(step: number, count: number): number {
  return Math.max(0, Math.min(count - 1, Number.isFinite(step) ? Math.floor(step) : 0));
}

export function getNarrations(scene: Scene): string[] {
  return scene.steps.map((beat) => beat.narration);
}

/** Validate typed authoring data once, when a chapter module is loaded. */
export function defineScene<S extends Scene>(scene: S): S {
  const fail = (message: string): never => { throw new Error(`[${scene.id || 'scene'}] ${message}`); };
  const text = (value: string, field: string) => { if (!value.trim()) fail(`${field} must not be empty`); };
  const finite = (value: number, field: string) => { if (!Number.isFinite(value)) fail(`${field} must be finite`); };
  const ids = (items: { id: string }[], field: string): Set<string> => {
    const result = new Set<string>();
    for (const item of items) {
      text(item.id, `${field}.id`);
      if (result.has(item.id)) fail(`${field}: duplicate id ${item.id}`);
      result.add(item.id);
    }
    return result;
  };
  const refs = (values: string[], allowed: Set<string>, field: string) => {
    if (new Set(values).size !== values.length) fail(`${field}: duplicate references`);
    for (const value of values) if (!allowed.has(value)) fail(`${field}: unknown or invisible id ${value}`);
  };
  text(scene.id, 'id'); text(scene.title, 'title'); text(scene.source, 'source');
  if (!scene.steps.length) fail('at least one step is required');
  scene.steps.forEach((beat, i) => { text(beat.narration, `steps[${i}].narration`); text(beat.explanation, `steps[${i}].explanation`); });
  switch (scene.kind) {
    case 'architecture_execution': {
      if (!scene.nodes.length) fail('nodes must not be empty');
      const nodes = ids(scene.nodes, 'nodes'), edges = ids(scene.edges, 'edges');
      scene.nodes.forEach((node) => {
        text(node.label, 'node.label');
        [node.x, node.y, node.width, node.height].forEach((n) => finite(n, 'node bounds'));
        if (node.x < 0 || node.y < 0 || node.width <= 0 || node.height <= 0 || node.x + node.width > 960 || node.y + node.height > 480) fail(`node ${node.id} is outside 960x480`);
      });
      scene.edges.forEach((edge) => {
        refs([edge.from], nodes, 'edge.from'); refs([edge.to], nodes, 'edge.to');
        if (edge.from === edge.to) fail('self edges need a separate loop node');
      });
      scene.steps.forEach((beat) => {
        refs(beat.visibleNodeIds, nodes, 'visibleNodeIds');
        refs(beat.activeNodeIds, new Set(beat.visibleNodeIds), 'activeNodeIds');
        refs(beat.activeEdgeIds, edges, 'activeEdgeIds');
        for (const edge of scene.edges.filter((e) => beat.activeEdgeIds.includes(e.id))) {
          refs([edge.from, edge.to], new Set(beat.visibleNodeIds), 'active edge endpoints');
        }
      });
      break;
    }
    case 'equation_walkthrough': {
      const terms = ids(scene.terms, 'terms');
      scene.terms.forEach((term) => { text(term.tex, 'term.tex'); text(term.meaning, 'term.meaning'); });
      scene.steps.forEach((beat) => {
        text(beat.tex, 'tex'); refs(beat.visibleTermIds, terms, 'visibleTermIds');
        refs(beat.highlightTermIds, new Set(beat.visibleTermIds), 'highlightTermIds');
      });
      break;
    }
    case 'algorithm_trace': {
      if (!scene.lines.length) fail('lines must not be empty');
      const lines = ids(scene.lines, 'lines');
      scene.lines.forEach((line) => text(line.code, 'line.code'));
      scene.steps.forEach((beat) => {
        refs(beat.activeLineIds, lines, 'activeLineIds');
        Object.entries(beat.variables).forEach(([key, value]) => {
          text(key, 'variable name');
          if (typeof value === 'number') finite(value, `variable ${key}`);
        });
      });
      break;
    }
    case 'ablation_comparison': {
      if (scene.variants.length < 2 || scene.variants.length > 7) fail('use 2–7 variants per scene');
      const variants = ids(scene.variants, 'variants');
      refs([scene.baselineId], variants, 'baselineId'); text(scene.metric.label, 'metric.label');
      if (!['higher', 'lower'].includes(scene.metric.direction)) fail('invalid metric direction');
      if (!Number.isInteger(scene.metric.decimals) || scene.metric.decimals < 0 || scene.metric.decimals > 6) fail('decimals must be 0–6');
      scene.variants.forEach((variant) => { text(variant.label, 'variant.label'); finite(variant.value, 'variant.value'); });
      scene.steps.forEach((beat) => {
        refs(beat.visibleVariantIds, variants, 'visibleVariantIds');
        refs([beat.focusId], new Set(beat.visibleVariantIds), 'focusId');
        refs([scene.baselineId], new Set(beat.visibleVariantIds), 'visible baseline');
      });
      break;
    }
    case 'figure_inspector': {
      text(scene.image.src, 'image.src'); text(scene.image.alt, 'image.alt');
      // Locally extracted images or HTTPS sources; HTML/data/javascript URLs are not accepted.
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(scene.image.src) && !/^https:\/\//i.test(scene.image.src)) fail('image.src must be a local path or HTTPS URL');
      finite(scene.image.width, 'image.width'); finite(scene.image.height, 'image.height');
      if (scene.image.width <= 0 || scene.image.height <= 0) fail('image dimensions must be positive');
      const regions = ids(scene.regions, 'regions');
      scene.regions.forEach((region) => {
        text(region.label, 'region.label');
        [region.x, region.y, region.width, region.height].forEach((n) => finite(n, 'region bounds'));
        if (region.x < 0 || region.y < 0 || region.width <= 0 || region.height <= 0 || region.x + region.width > 1 + 1e-9 || region.y + region.height > 1 + 1e-9) fail(`region ${region.id} must fit inside the image (0–1)`);
      });
      scene.steps.forEach((beat) => { if (beat.regionId !== null) refs([beat.regionId], regions, 'regionId'); });
      break;
    }
    default: fail('unknown renderer kind');
  }
  return scene;
}

/** Connect rectangle borders instead of drawing arrows underneath node labels. */
export function edgeEndpoints(from: DiagramNode, to: DiagramNode) {
  const ax = from.x + from.width / 2, ay = from.y + from.height / 2;
  const bx = to.x + to.width / 2, by = to.y + to.height / 2;
  const dx = bx - ax, dy = by - ay;
  if (dx === 0 && dy === 0) return { x1: ax, y1: ay, x2: bx, y2: by };
  const a = 1 / Math.max(Math.abs(dx) / (from.width / 2), Math.abs(dy) / (from.height / 2));
  const b = 1 / Math.max(Math.abs(dx) / (to.width / 2), Math.abs(dy) / (to.height / 2));
  return { x1: ax + dx * a, y1: ay + dy * a, x2: bx - dx * b, y2: by - dy * b };
}

/** A single shared domain, always including zero, also for negative and constant data. */
export function comparisonDomain(scene: AblationScene): [number, number] {
  const values = scene.variants.map((v) => v.value);
  const lo = Math.min(0, ...values), hi = Math.max(0, ...values);
  return lo === hi ? [0, 1] : [lo, hi];
}

export function comparisonDelta(scene: AblationScene, value: number) {
  const baseline = scene.variants.find((v) => v.id === scene.baselineId)!;
  const delta = value - baseline.value;
  // Ignore differences smaller than the displayed precision.
  const displayed = Number(delta.toFixed(scene.metric.decimals));
  return { delta: displayed, outcome: displayed === 0 ? 'equal' : ((scene.metric.direction === 'higher' ? displayed : -displayed) > 0 ? 'better' : 'worse') } as const;
}

export function regionViewBox(region: FigureRegion | undefined, width: number, height: number): string {
  return region ? `${region.x * width} ${region.y * height} ${region.width * width} ${region.height * height}` : `0 0 ${width} ${height}`;
}
